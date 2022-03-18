import { ServiceBroker } from 'moleculer'
import UserService from '../../../src/services/users.service'

describe('Test user service', () => {
    const broker = new ServiceBroker({ logger: false })
    new UserService(broker)

    beforeAll(() => broker.start())
    afterAll(() => broker.stop())

    describe('Call users.list action', () => {
        test('should return the user list', async () => {
            let result = await broker.call('users.list')

            expect(result).toStrictEqual({
                page: 1,
                pageSize: 10,
                rows: [],
                total: 0,
                totalPages: 0,
            })
        })
    })
})