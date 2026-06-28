export default {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.jest.json',
            // Disable TypeScript diagnostic errors in tests.
            // The @testing-library/jest-dom augmentation is applied at runtime via
            // setupFilesAfterEnv; disabling diagnostics prevents ts-jest from
            // emitting module-augmentation TS errors that don't affect test behaviour.
            diagnostics: false,
        }],
    },
    // Transform ESM packages from antd ecosystem so Jest can consume them
    transformIgnorePatterns: [
        '/node_modules/(?!(antd|@ant-design/|rc-|@rc-component/|dompurify))',
    ],
    moduleNameMapper: {
        // @ant-design/icons/lib color utils hard-require the ESM path below,
        // which Jest cannot execute in this CJS-based ts-jest setup.
        '^@ant-design/colors/es/generate$': '<rootDir>/node_modules/@ant-design/colors/lib/generate.js',
        // Replace rc-virtual-list with a simple test double that renders all items
        '^rc-virtual-list$': '<rootDir>/__mocks__/rc-virtual-list.tsx',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testMatch: [
        '<rootDir>/src/__tests__/**/*.test.[jt]s?(x)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
