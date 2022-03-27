import { Context, Errors, Service, ServiceBroker } from 'moleculer'
import { hashSync, compare } from 'bcryptjs'
import DbMixin from '../mixins/db.mixins'
import CacheCleanerMixin from '../mixins/cache.cleaner.mixin'
import { verify, sign, VerifyErrors } from 'jsonwebtoken'
import { IUserMeta, User } from '../types'
import config from '../config'
import StatusCodes from 'http-status-codes'

const { MoleculerClientError } = Errors

export default class UserService extends Service {

    constructor(broker: ServiceBroker) {
        super(broker)

        this.parseServiceSchema({
            name: 'users',
            mixins: [
                DbMixin('users'),
                CacheCleanerMixin([
                    'cache.clean.users',
                ])
            ],

            settings: {
                rest: '/',
                JWT_SECRET: config.JWT_SECRET,

                fields: ['_id', 'username'],

                entityValidator: {
                    username: { type: 'string', min: 2 },
                    password: { type: 'string', min: 4 },
                }
            },

            actions: {
                /**
                 * Register a new user
                 */
                create: {
                    rest: 'POST /users',
                    params: {
                        user: {
                            type: 'object', props: {
                                username: { type: 'string', min: 2 },
                                password: { type: 'string', min: 4 }
                            }
                        }
                    },
                    async handler(ctx: Context<{ user: User }, IUserMeta>): Promise<User> {
                        const entity = ctx.params.user
                        await this.validateEntity(entity)
                        const found = await this.adapter.findOne({ username: entity.username })
                        if (found) {
                            throw new MoleculerClientError(
                                'Username is exist!',
                                StatusCodes.UNPROCESSABLE_ENTITY,
                                '',
                                [{ field: 'username', message: 'is exist' }]
                            )
                        }

                        entity.password = hashSync(entity.password, config.CRYPT_SALT)
                        entity.createdAt = new Date()

                        const doc = await this.adapter.insert(entity)
                        const user = await this.transformDocuments(ctx, {}, doc)
                        const json = await this.transformEntity(user, true, ctx.meta.token)
                        await this.entityChanged('created', json, ctx)
                        return json
                    }
                },

                /**
                 * Login with username & password
                 */
                login: {
                    rest: 'POST /users/login',
                    params: {
                        user: {
                            type: 'object', props: {
                                username: { type: 'string', min: 2 },
                                password: { type: 'string', min: 1 }
                            }
                        }
                    },
                    async handler(ctx: Context<{ user: User }, IUserMeta>): Promise<User> {
                        const { username, password } = ctx.params.user

                        const user = await this.adapter.findOne({ username })
                        if (!user) {
                            throw new MoleculerClientError(
                                'Username or password is invalid!',
                                StatusCodes.UNPROCESSABLE_ENTITY,
                                '',
                                [{ field: 'username', message: 'is not found' }]
                            )
                        }

                        const res = await compare(password, user.password)
                        if (!res) {
                            throw new MoleculerClientError(
                                'Wrong password!',
                                StatusCodes.UNPROCESSABLE_ENTITY,
                                '',
                                [{ field: 'username', message: 'is not found' }]
                            )
                        }

                        const doc = await this.transformDocuments(ctx, {}, user)
                        return await this.transformEntity(doc, true, ctx.meta.token)
                    }
                },

                /**
                 * Get user by JWT token (for API GW authentication)
                 */
                resolveToken: {
                    cache: {
                        keys: ['token'],
                        ttl: 60 * 60 // 1 hour
                    },
                    params: {
                        token: 'string'
                    },
                    async handler(ctx: Context<{ token: string }>): Promise<User | null> {
                        const decoded: { id: string } = await new this.Promise((resolve, reject) => {
                            verify(ctx.params.token, this.settings.JWT_SECRET, (err: VerifyErrors | null, decoded: unknown): void => {
                                if (err) {
                                    return reject(err)
                                }

                                resolve(decoded as { id: string })
                            })
                        })

                        if (decoded.id) {
                            return this.getById(decoded.id)
                        }

                        return null
                    }
                },

                /**
                 * Get current user entity.
                 */
                me: {
                    auth: 'required',
                    rest: 'GET /user',
                    cache: {
                        keys: ['#user.id']
                    },
                    async handler(ctx: Context<null, IUserMeta>): Promise<User> {
                        const user = await this.getById(ctx.meta.user._id)
                        if (!user) {
                            throw new MoleculerClientError('User not found!', StatusCodes.BAD_REQUEST)
                        }

                        const doc = await this.transformDocuments(ctx, {}, user)
                        return await this.transformEntity(doc, true, ctx.meta.token)
                    }
                },

                /**
                 * Update current user entity.
                 */
                updateMyself: {
                    auth: 'required',
                    rest: 'PUT /user',
                    params: {
                        user: {
                            type: 'object', props: {
                                username: { type: 'string', min: 2, optional: true, pattern: /^[a-zA-Z0-9]+$/ },
                                password: { type: 'string', min: 6, optional: true },
                            }
                        }
                    },
                    async handler(ctx: Context<{ user: User }, IUserMeta>): Promise<User> {
                        const newData = ctx.params.user
                        if (newData.username) {
                            const found = await this.adapter.findOne({ username: newData.username })
                            if (found && found._id.toString() !== ctx.meta.user._id.toString()) {
                                throw new MoleculerClientError(
                                    'Username is exist!',
                                    StatusCodes.UNPROCESSABLE_ENTITY,
                                    '',
                                    [{ field: 'username', message: 'is exist' }]
                                )
                            }
                        }

                        newData.updatedAt = new Date()
                        const update = {
                            '$set': newData
                        }
                        const doc = await this.adapter.updateById(ctx.meta.user._id, update)

                        const user = await this.transformDocuments(ctx, {}, doc)
                        const json = await this.transformEntity(user, true, ctx.meta.token)
                        await this.entityChanged('updated', json, ctx)
                        return json
                    }
                },

                list: {
                    rest: 'GET /users'
                },

                get: {
                    rest: 'GET /users/:id'
                },

                update: {
                    rest: 'PUT /users/:id'
                },

                remove: {
                    rest: 'DELETE /users/:id'
                },
            },

            /**
             * Methods
             */
            methods: {
                /**
                 * Generate a JWT token from user entity
                 */
                generateJWT(user: User): string {
                    const today = new Date()
                    const exp = new Date(today)
                    exp.setDate(today.getDate() + 60)

                    return sign({
                        id: user._id,
                        username: user.username,
                        exp: Math.floor(exp.getTime() / 1000)
                    }, this.settings.JWT_SECRET)
                },

                /**
                 * Transform returned user entity. Generate JWT token if neccessary.
                 */
                transformEntity(user: User, withToken: boolean, token: string): { user: User } {
                    if (user && withToken) {
                        user.token = token || this.generateJWT(user)
                    }

                    return { user }
                },
            },
        })
    }
}
