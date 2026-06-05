import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

export default {
  paths: [
    join(__dir, 'features/auth/HU-001_registro.feature'),
    join(__dir, 'features/auth/HU-008_login.feature'),
    join(__dir, 'features/ova/HU-022_recursos-parciales.feature'),
  ],
  require: [join(__dir, 'steps/unit/**/*.js')],
  worldParameters: {},
}
