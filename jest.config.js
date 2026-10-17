const moduleNameMapper = {
  '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
  '^@databases$': '<rootDir>/src/databases',
  '^@dtos/(.*)$': '<rootDir>/src/dtos/$1',
  '^@exceptions/(.*)$': '<rootDir>/src/exceptions/$1',
  '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
  '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
  '^@models/(.*)$': '<rootDir>/src/models/$1',
  '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
};

const common = {
  testEnvironment: 'node',
  moduleNameMapper,
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};

module.exports = {
  projects: [
    // Tests unitaires : aucune base de données (DB/env/fs mockés), voir tests/unit/setup-env.ts
    { ...common, displayName: 'unit', testMatch: ['<rootDir>/tests/unit/**/*.test.ts'], setupFiles: ['<rootDir>/tests/unit/setup-env.ts'] },
    // Tests d'intégration : base MySQL/MariaDB réelle (tests/models générés par gen-tests, tests/integration)
    { ...common, displayName: 'integration', testMatch: ['<rootDir>/tests/models/**/*.test.ts', '<rootDir>/tests/integration/**/*.test.ts'], globalSetup: '<rootDir>/tests/integration/global-setup.ts' },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'generators/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/interfaces/**',
  ],
  coverageThreshold: {
    // Seuils au niveau atteint par les tests unitaires (npm run test:coverage) : toute baisse fait échouer.
    global: { lines: 99, statements: 99, branches: 95, functions: 95 },
  },
};
