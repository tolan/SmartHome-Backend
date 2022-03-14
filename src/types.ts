export type User = {
    _id: string
    username: string
    password: string
    createdAt: Date
    updatedAt?: Date
    token?: string
}

export interface IUserMeta {
    user: User
    token: string
}
