/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // TypeScript transformation
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Entry point
    '!src/types/**', // Type definitions only
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Module name mapping for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Mock modules
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // Coverage thresholds (optional - can be adjusted)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};