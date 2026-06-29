import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

export default {
  paths: [
    join(__dir, 'features/auth/HU-001_registro.feature'),
    join(__dir, 'features/auth/HU-008_login.feature'),
    join(__dir, 'features/ova/HU-022_recursos-parciales.feature'),
    join(__dir, 'features/ova/HU-024_archivos-chat.feature'),
    join(__dir, 'features/ova/HU-023_generacion-background.feature'),
    join(__dir, 'features/ova/HU-025_workspace.feature'),
    join(__dir, 'features/ova/HU-030_mis-ovas-workspace.feature'),
    join(__dir, 'features/ova/HU-033_reordenar.feature'),
    join(__dir, 'features/ova/HU-026_click-to-edit.feature'),
    join(__dir, 'features/ova/HU-028_versionado.feature'),
    join(__dir, 'features/ova/HU-027_seleccion-recursos.feature'),
    join(__dir, 'features/ova/HU-029_micro-versionado.feature'),
    join(__dir, 'features/ova/HU-032_anadir-recurso.feature'),
    join(__dir, 'features/ova/HU-031_edicion-granular.feature'),
    join(__dir, 'features/admin/llm-config-unit.feature'),
    join(__dir, 'features/admin/nodes-config-unit.feature'),
    join(__dir, 'features/auth/BU-001_sesion-expirada.feature'),
  ],
  require: [join(__dir, 'steps/unit/**/*.js')],
  worldParameters: {},
}
