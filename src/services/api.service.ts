import ApiGateway, { ApiRouteSchema } from 'moleculer-web'
import { IUserMeta, User } from '../types'
import { Context, Service, ServiceBroker } from 'moleculer'
import Config from '../config'

const { UnAuthorizedError, ERR_INVALID_TOKEN } = ApiGateway.Errors

export default class ApiService extends Service {

    constructor(broker: ServiceBroker) {
        super(broker)

        this.parseServiceSchema({
            name: 'api',
            mixins: [ApiGateway],

            settings: {
                port: Config.PORT || 4444,

                routes: [{
                    path: '/api',

                    authorization: true,
                    autoAliases: true,

                    // Set CORS headers
                    cors: true,

                    // Parse body content
                    bodyParsers: {
                        json: {
                            strict: false
                        },
                        urlencoded: {
                            extended: false
                        }
                    }
                }],

                assets: {
                    folder: './public'
                },
            },

            methods: {
                /**
                 * Authorize the request
                 */
                async authorize(ctx: Context<{}, IUserMeta>, _route: ApiRouteSchema, req: typeof ApiGateway['IncomingRequest']): Promise<void> {
                    let token
                    if (req.headers.authorization) {
                        let type = req.headers.authorization.split(' ')[0]
                        if (['Token', 'Bearer'].includes(type)) {
                            token = req.headers.authorization.split(' ')[1]
                        }
                    }

                    let user
                    if (token) {
                        // Verify JWT token
                        try {
                            user = await ctx.call('users.resolveToken', { token }) as User
                            if (user) {
                                this.logger.info('Authenticated via JWT: ', user.username)
                                // Reduce user fields (it will be transferred to other nodes)
                                ctx.meta.user = user
                                ctx.meta.token = token
                            }
                        } catch (err) {
                            // Ignored because we continue processing if user doesn't exists
                        }
                    }

                    if (req.$action.auth == 'required' && !user) {
                        throw new UnAuthorizedError(ERR_INVALID_TOKEN, {})
                    }
                }
            }
        })
    }
}