export type Config = {
    PORT: number
    MONGO_URI: string | null
    JWT_SECRET: string
}

export default {
    PORT: Number(process.env.PORT) || 4444,
    MONGO_URI: process.env.MONGO_URI ?? null,
    JWT_SECRET: process.env.JWT_SECRET || 'jwt-smarthome-secret',
} as Config
