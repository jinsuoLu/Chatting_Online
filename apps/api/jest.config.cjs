module.exports = { testEnvironment: 'node', roots: ['<rootDir>/src'], moduleNameMapper: { '^(.+)\\.js$': '$1' }, transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] } };
