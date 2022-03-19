declare module 'moleculer-db-adapter-mongo' {
    class MongoAdapter {
        constructor(uri: string, opts: Record<string, unknown>, dbName?: string)
    }
    export = MongoAdapter;
}
