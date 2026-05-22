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
        // Replace rc-virtual-list with a simple test double that renders all items
        '^rc-virtual-list$': '<rootDir>/__mocks__/rc-virtual-list.tsx',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
        '<rootDir>/src/**/*.(spec|test).[jt]s?(x)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    // Force Jest to exit after all tests finish to avoid dangling scheduler handles
    // from React 19 + antd's async portal/animation work in jsdom.
    forceExit: true,
};


