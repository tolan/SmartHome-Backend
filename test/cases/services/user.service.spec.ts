import { ServiceBroker } from 'moleculer'
import UserService from '../../../src/services/users.service'

describe('Test user service', () => {
    const broker = new ServiceBroker({ logger: false })
    const userService = new UserService(broker)

    beforeAll(() => broker.start())
    afterEach(() => jest.restoreAllMocks())
    afterAll(() => broker.stop())

    describe('Call users.list action', () => {
        test('should return the user list - empty', async () => {
            const mockList = jest.spyOn(userService.adapter, 'find')
                .mockResolvedValue([])

            const result = await broker.call('users.list')

            expect(result).toStrictEqual({
                page: 1,
                pageSize: 10,
                rows: [],
                total: 0,
                totalPages: 0,
            })
            expect(mockList).toBeCalledTimes(1)
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
})
