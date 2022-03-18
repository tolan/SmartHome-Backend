import path from 'path'
import fs from 'fs'
import DbService from 'moleculer-db'
import MongoAdapter from 'moleculer-db-adapter-mongo'
import { Context, ServiceSchema } from 'moleculer'
import config from '../config'

export default function createSchema(collection: string): ServiceSchema {
    const schema = {
        name: 'DbMixin',
        mixins: [DbService],
    } as ServiceSchema

    if (config.MONGO_URI) {
        schema.adapter = new MongoAdapter(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        schema.collection = collection
    } else {

        // Create data folder
        const folder = path.resolve(`./data/${config.NODE_ENV}`)
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true })
        }
        schema.adapter = new DbService.MemoryAdapter({ filename: `${folder}/${collection}.db` })
        schema.methods = {
            async entityChanged(type: string, json: string, ctx: Context<null>) {
                await this.clearCache();
                const eventName = `${this.name}.entity.${type}`;
                this.broker.emit(eventName, { meta: ctx.meta, entity: json });
            }
        }
    }

    return schema
}
