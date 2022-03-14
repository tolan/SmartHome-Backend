import path from 'path'
import fs from 'fs'
import DbService from 'moleculer-db'
import MongoAdapter from 'moleculer-db-adapter-mongo'
import { Context, ServiceSchema } from 'moleculer'
import Config from '../config'

export default function createSchema(collection: string): ServiceSchema {
    const schema = {
        name: 'DbMixin',
        mixins: [DbService],
    } as ServiceSchema

    if (Config.MONGO_URI) {
        schema.adapter = new MongoAdapter(Config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        schema.collection = collection
    } else {
        // Create data folder
        if (!fs.existsSync(path.resolve('./data'))) {
            fs.mkdirSync(path.resolve('./data'))
        }
        schema.adapter = new DbService.MemoryAdapter({ filename: `./data/${collection}.db` })
        schema.methods = {
            async entityChanged(type: string, json: string, ctx: Context<{}>) {
                await this.clearCache();
                const eventName = `${this.name}.entity.${type}`;
                this.broker.emit(eventName, { meta: ctx.meta, entity: json });
            }
        }
    }

    return schema
}
