import path from 'path'
import rimraf from 'rimraf'
import config from '../src/config'

export const db = {
    clean: () => {
        const folder = path.resolve(`./data/${config.NODE_ENV}`)
        rimraf.sync(folder)
    }
}