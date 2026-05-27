export default {
  paths: [
    'tests/features/auth/HU-001_registro.feature',
    'tests/features/auth/HU-008_login.feature',
    'tests/features/setup/EN-010_monorepo.feature',
  ],
  require: ['tests/steps/unit/**/*.js'],
  worldParameters: {},
}
