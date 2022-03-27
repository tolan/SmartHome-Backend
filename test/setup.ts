import { performance } from 'perf_hooks'
import { db } from './helpers'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
    let performance: {
        now: () => number
    }
}

globalThis.performance = performance

db.clean()
