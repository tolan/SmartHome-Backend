import { LoggerInstance, ServiceBroker, ServiceEventHandler, ServiceEvents, ServiceSchema } from "moleculer";

export default function (eventNames: string[]): ServiceSchema {

    const events: ServiceEvents = {};

    eventNames.forEach(name => {
        events[name] = function () {
            const broker = this.broker as ServiceBroker
            const logger = this.logger as LoggerInstance
            if (broker.cacher) {
                logger.debug(`Clear local '${this.name}' cache`);
                broker.cacher.clean(`${this.name}.**`);
            }
        }
    })

    return {
        name: 'CacheCleaner',
        events,
    }
}
