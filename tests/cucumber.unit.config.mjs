import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

export default {
  paths: [
    // EN-022 (cerrado): los features verbatim de auth describían la era React
    // (localStorage/useCurrentUser) y quedan como documentación. Cobertura
    // actual: validaciones puras (HU-001) + AuthExpiredBus (BU-001) abajo; el
    // flujo completo con cookie httpOnly corre en features/e2e/ (Playwright) y
    // el contrato del backend en backend/tests/step_defs/test_auth_steps.py.
    join(__dir, 'features/auth/HU-001_validaciones-unit.feature'),
    join(__dir, 'features/auth/BU-001_expiracion-bus-unit.feature'),
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
    // BU-002 se cubre e2e (features/e2e/BU-002_cambio-cuenta.feature): su
    // feature verbatim asertaba contenido de archivos React ya eliminados.
  ],
  require: [join(__dir, 'steps/unit/**/*.js')],
  tags: 'not @pending-en022',
  worldParameters: {},
}
