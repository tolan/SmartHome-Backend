import { hashSync } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { sign } from 'jsonwebtoken'
import { ServiceBroker, Errors } from 'moleculer'
import config from '../../../src/config'
import UserService from '../../../src/services/users.service'
import { User } from '../../../src/types'
import { db } from '../../helpers'

const { MoleculerClientError } = Errors

describe('Test user service', () => {
    const broker = new ServiceBroker({ logger: false })
    const userService = new UserService(broker)

    beforeAll(() => broker.start())
    afterEach(() => {
        db.clean()
        jest.restoreAllMocks()
    })
    afterAll(() => broker.stop())

    describe('Call users.create action', () => {
        test('create new user', async () => {
            const spyInsert = jest.spyOn(userService.adapter, 'insert')
            const spyEvent = jest.spyOn(broker, 'emit')

            const user = {
                username: 'test',
                password: 'test-pass',
            }

            const result = await broker.call('users.create', { user }) as { user: User }

            expect(result).toStrictEqual({
                user: {
                    _id: result.user._id,
                    username: user.username,
                    token: result.user.token
                }
            })
            expect(spyInsert).toBeCalledTimes(1)
            expect(spyEvent).toBeCalledTimes(1)
            expect(spyEvent).toBeCalledWith(
                'users.entity.created',
                {
                    entity: result,
                    meta: {},
                },
            )
        })

        test('invalid username parameter', async () => {
            const user = {
                username: 'a',
                password: 'test-pass',
            }

            await expect(() => broker.call('users.create', { user })).rejects.toThrow(
                new MoleculerClientError(
                    'Parameters validation error!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )
        })

        test('invalid password parameter', async () => {
            const user = {
                username: 'test',
                password: 'tes',
            }

            await expect(() => broker.call('users.create', { user })).rejects.toThrow(
                new MoleculerClientError(
                    'Parameters validation error!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )
        })

        test('username already exists', async () => {
            const user = {
                username: 'test',
                password: 'test-pass',
            }

            const mockFindOne = jest.spyOn(userService.adapter, 'findOne')
                .mockResolvedValue(user)

            await expect(() => broker.call('users.create', { user })).rejects.toThrow(
                new MoleculerClientError(
                    'Username is exist!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )
            expect(mockFindOne).toBeCalledTimes(1)
        })
    })

    describe('Call users.login action', () => {
        test('correct login user', async () => {
            const password = 'test-pass'
            const user = {
                username: 'test',
                password,
            }

            const mockFindOne = jest.spyOn(userService.adapter, 'findOne')
                .mockResolvedValue({
                    _id: 'some-id',
                    ...user,
                    password: hashSync(password, config.CRYPT_SALT),
                })

            const result = await broker.call('users.login', { user }) as { user: User }

            expect(result).toStrictEqual({
                user: {
                    _id: result.user._id,
                    username: user.username,
                    token: result.user.token
                }
            })
            expect(mockFindOne).toBeCalledTimes(1)
        })

        test('invalid username', async () => {
            jest.spyOn(userService.adapter, 'findOne')
                .mockResolvedValue(null)

            const user = {
                username: 'test',
                password: 'test-pass',
            }

            await expect(() => broker.call('users.login', { user })).rejects.toThrow(
                new MoleculerClientError(
                    'Username or password is invalid!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )
        })

        test('invalid password', async () => {
            jest.spyOn(userService.adapter, 'findOne')
                .mockResolvedValue({
                    password: 'some-unhash-pass',
                })

            const user = {
                username: 'test',
                password: 'test-pass',
            }

            await expect(() => broker.call('users.login', { user })).rejects.toThrow(
                new MoleculerClientError(
                    'Wrong password!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )
        })
    })

    describe('Call users.resolveToken action', () => {
        test('valid token', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const token = userService.generateJWT(user)
            const mockGetById = jest.spyOn(userService, 'getById')
                .mockResolvedValue(user)

            const result = await broker.call('users.resolveToken', { token }) as { user: User } | null

            expect(result).toBe(user)
            expect(mockGetById).toBeCalledTimes(1)
            expect(mockGetById).toBeCalledWith(user._id)
        })

        test('invalid token', async () => {
            const token = sign({}, config.JWT_SECRET)
            const spyGetById = jest.spyOn(userService, 'getById')

            const result = await broker.call('users.resolveToken', { token }) as { user: User } | null

            expect(result).toBe(null)
            expect(spyGetById).toBeCalledTimes(0)
        })
    })

    describe('Call users.me action', () => {
        test('valid user', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockGetById = jest.spyOn(userService, 'getById')
                .mockReturnValue(user)

            const result = await broker.call('users.me', {}, { meta: { user } }) as { user: User } | null

            expect(result).toMatchObject({ user })
            expect(mockGetById).toBeCalledTimes(1)
            expect(mockGetById).toBeCalledWith(user._id)
        })

        test('invalid user', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockGetById = jest.spyOn(userService, 'getById')
                .mockImplementation()

            await expect(() => broker.call('users.me', {}, { meta: { user } })).rejects.toThrow(
                new MoleculerClientError(
                    'User not found!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )

            expect(mockGetById).toBeCalledTimes(1)
            expect(mockGetById).toBeCalledWith(user._id)
        })
    })

    describe('Call users.updateMyself action', () => {
        test('valid data', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
                password: 'test-password',
            }
            const mockFindOne = jest.spyOn(userService.adapter, 'findOne')
                .mockReturnValue(user)
            const mockUpdateById = jest.spyOn(userService.adapter, 'updateById')
                .mockReturnValue(user)

            const result = await broker.call('users.updateMyself', { user }, { meta: { user } }) as { user: User } | null

            expect(result).toMatchObject({
                user: {
                    _id: user._id,
                    username: user.username,
                }
            })
            expect(mockFindOne).toBeCalledTimes(1)
            expect(mockFindOne).toBeCalledWith({ username: user.username })
            expect(mockUpdateById).toBeCalledTimes(1)
            expect(mockUpdateById).toBeCalledWith(user._id, {
                '$set': user,
            })
        })

        test('invalid data', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockFindOne = jest.spyOn(userService.adapter, 'findOne')
                .mockReturnValue({ _id: 'id-2' })

            await expect(() => broker.call('users.updateMyself', { user }, { meta: { user } })).rejects.toThrow(
                new MoleculerClientError(
                    'Username is exist!',
                    StatusCodes.UNPROCESSABLE_ENTITY,
                )
            )

            expect(mockFindOne).toBeCalledTimes(1)
            expect(mockFindOne).toBeCalledWith({ username: user.username })
        })
    })

    describe('Call users.list action', () => {
        test('should return the user list - empty', async () => {
            const mockList = jest.spyOn(userService.adapter, 'find')
                .mockResolvedValue([])
            const mockCount = jest.spyOn(userService.adapter, 'count')
                .mockResolvedValue(0)

            const result = await broker.call('users.list')

            expect(result).toStrictEqual({
                page: 1,
                pageSize: 10,
                rows: [],
                total: 0,
                totalPages: 0,
            })
            expect(mockList).toBeCalledTimes(1)
            expect(mockCount).toBeCalledTimes(1)
        })

        test('should return the user list - some records', async () => {
            const data = [{
                _id: 'id-1',
                username: 'test-1',
            }, {
                _id: 'id-2',
                username: 'test-2',
            }]
            const mockList = jest.spyOn(userService.adapter, 'find')
                .mockResolvedValue(data)
            const mockCount = jest.spyOn(userService.adapter, 'count')
                .mockResolvedValue(data.length)

            const result = await broker.call('users.list')

            expect(result).toStrictEqual({
                page: 1,
                pageSize: 10,
                rows: data,
                total: 2,
                totalPages: 1,
            })
            expect(mockList).toBeCalledTimes(1)
            expect(mockCount).toBeCalledTimes(1)
        })
    })

    describe('Call users.get action', () => {
        test('should return the user - not exists', async () => {
            const mockGetById = jest.spyOn(userService, 'getById')
                .mockResolvedValue(null)

            await expect(() => broker.call('users.get', { id: 'id-1' })).rejects.toThrow(
                new Error('Entity not found')
            )

            expect(mockGetById).toBeCalledTimes(1)
        })

        test('should return the user - exists', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockGetById = jest.spyOn(userService, 'getById')
                .mockResolvedValue(user)

            const result = await broker.call('users.get', { id: 'id-1' })

            expect(result).toEqual(user)
            expect(mockGetById).toBeCalledTimes(1)
        })
    })

    describe('Call users.update action', () => {
        test('should update user - not exists', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockUpdateById = jest.spyOn(userService.adapter, 'updateById')
                .mockResolvedValue(null)

            await expect(() => broker.call('users.update', user)).rejects.toThrow(
                new Error('Entity not found')
            )

            expect(mockUpdateById).toBeCalledTimes(1)
        })

        test('should update user - exists', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockUpdateById = jest.spyOn(userService.adapter, 'updateById')
                .mockResolvedValue(user)

            const result = await broker.call('users.update', user)

            expect(result).toEqual(user)
            expect(mockUpdateById).toBeCalledTimes(1)
        })
    })

    describe('Call users.remove action', () => {
        test('should remove user - not exists', async () => {
            const mockRemoveById = jest.spyOn(userService.adapter, 'removeById')
                .mockResolvedValue(null)

            await expect(() => broker.call('users.remove', { id: 'id-1' })).rejects.toThrow(
                new Error('Entity not found')
            )

            expect(mockRemoveById).toBeCalledTimes(1)
        })

        test('should remove user - exists', async () => {
            const user = {
                _id: 'id-1',
                username: 'test',
            }
            const mockRemoveById = jest.spyOn(userService.adapter, 'removeById')
                .mockResolvedValue(user)

            const result = await broker.call('users.remove', { id: 'id-1' })

            expect(result).toEqual(user)
            expect(mockRemoveById).toBeCalledTimes(1)
        })
    })
})
