module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-explicit-any': 'error', // Upgraded from 'warn'
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    
    // Code quality rules
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'always-multiline'],
    'no-console': 'off',
    'no-unused-vars': 'off', // Use TypeScript version instead
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Security and best practices
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'scripts/**/*.js', // Ignore legacy JavaScript OAuth scripts
    '*.js', // Ignore JavaScript files in root
  ],
};