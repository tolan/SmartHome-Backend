export type Config = {
    NODE_ENV: 'development' | 'production' | 'test'
    PORT: number
    MONGO_URI: string | null
    JWT_SECRET: string
    CRYPT_SALT: number | number
}

export default {
    NODE_ENV: process.env.NODE_ENV,
    PORT: Number(process.env.PORT) || 4444,
    MONGO_URI: process.env.MONGO_URI ?? null,
    JWT_SECRET: process.env.JWT_SECRET || 'jwt-smarthome-secret',
    CRYPT_SALT: process.env.CRYPT_SALT || 10,
} as Config
