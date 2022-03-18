module.exports = {
    testTimeout: 2000,
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        '<rootDir>/src/',
        '<rootDir>/node_modules/',
    ],
    testRegex: [
        '(/test/cases/.*|(\\.|/)(test|spec))\\.ts$',
    ],
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    moduleNameMapper: {
    },
    globals: {
        'ts-jest': {
            tsconfig: './test/tsconfig.json',
        },
    },
    setupFilesAfterEnv: ['./test/setup.ts']
}
