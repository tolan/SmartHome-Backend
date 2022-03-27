# SmartHome-Backend

<br>

[![Node.js CI](https://github.com/tolan/SmartHome-Backend/actions/workflows/node.js.yml/badge.svg)](https://github.com/tolan/SmartHome-Backend/actions/workflows/node.js.yml)

<br>

This is a backend part of smarthome project.

<br>

## How to use:
- `make dc-up`
- open `http://ip-address:4444`

## Development:
- `npm i`
- `npm run dev`

## Testing:
- `npm run test`
- `npm run test --file test/cases/services/user.service.spec.ts`

## Config
- `NODE_ENV: development | production | test` - node environment
- `PORT: number` - port where api gateway is runing  `default: 4444`
- `MONGO_URI: string` - mongo uri `example: mongodb://mongo/smarthome, default: null - then it uses memory db`
- `JWT_SECRET: string` - secret for jwt (sign and verify) `default: jwt-smarthome-secret`
- `CRYPT_SALT: number | string` - salt for crypt `default: 10`
