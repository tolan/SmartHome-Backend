import { performance } from 'perf_hooks'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
    let performance: {
        now: () => number
    }
}

globalThis.performance = performance