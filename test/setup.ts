import { performance } from 'perf_hooks'

declare module globalThis {
    let performance: any
}

globalThis.performance = performance