# SCORM 1.2/2004, H5P y LTI 1.3 en Moodle real

Moodle 4.5.8 y PostgreSQL 16.10, aislados bajo el proyecto Compose
`genova-ci-moodle`. Solo se publica `8081`; la BD no tiene puerto del host.
Las credenciales `admin`/`alumno` con contraseña `Genova-CI-2026!` son exclusivas
de esta instalación efímera de pruebas.

Desde la raíz del worktree:

```sh
pnpm install --frozen-lockfile
uv sync --project backend
pnpm --filter genova-tests exec playwright install --with-deps chromium
bash tests/moodle/run.sh
```

El runner apaga el proyecto mediante `trap`, también si falla. No
usar `docker stop` global, `prune` ni comandos sobre otros proyectos. Para empezar
sin intentos previos: `docker compose -f docker-compose.moodle.yml down -v` elimina
solo los tres volúmenes efímeros propios antes de repetir el procedimiento.

`fixtures_package.py` invoca el exportador **de producción**
`scorm.build_scorm_zip_bytes`, con HTML del motor y las fixtures reales
`engage_01`, `elaborate_04`, `evaluate_01`. No se necesita BD de GenOVA o LLM.
`provision.php` crea curso, alumno, matrícula y actividad, y sube el ZIP usando
File API y `add_moduleinfo` de Moodle. Si la actividad ya existe, actualiza el
paquete con `scorm_update_instance`. Solo existe en CLI dentro del contenedor.

`verify.mjs` entra como alumno, completa los tres recursos y sus botones UPAO,
cierra el SCO y entra como admin para capturar el informe y el detalle del
intento. Finalmente valida estado `completed/passed`, puntuación y tiempo
acumulado **en las tablas SCORM de Moodle**, no en una API simulada. El tiempo
debe aumentar frente a la lectura previa de ese intento, para evitar
que los datos guardados en una ejecución anterior oculten una regresión.
El reporte y capturas se escriben en `tests/test-results/moodle` o en `MOODLE_EVIDENCE`.

```sh
MOODLE_EVIDENCE=/home/jeffryru/github/genova-orquestacion/out/moodle bash tests/moodle/run.sh
```

La instalación conserva también `config.php` en un volumen, con permisos para
Apache; un rebuild no vuelve a intentar instalar una BD ya inicializada. El
healthcheck valida el formulario de login, ya que PHP puede devolver HTTP 200
incluso ante un error fatal. La última evidencia debe incluir `resultado.json`
con `result: passed`; una captura del curso por sí sola no demuestra SCORM válido.

Los recursos se mantienen en sandbox `allow-scripts` sin `allow-same-origin`.
El runtime informa finalización mediante `postMessage`; el shell autentica por
`event.source === frame.contentWindow`, normaliza la nota y registra
`cmi.core.session_time`, `score.min/max/raw` y `lesson_status`. El tiempo total se
verifica después de `LMSFinish` al salir del SCO.

## SCORM 2004, H5P y LTI 1.3

`run.sh` prueba además, con el mismo curso y alumno:

- **SCORM 2004 (4.ª ed.)**: el mismo contenido exportado con `scorm2004`.
  `SCORM_VERSION=2004 node tests/moodle/verify.mjs` valida `cmi.completion_status`,
  `cmi.score.raw/scaled` y `cmi.total_time` (duración ISO) en las tablas de Moodle. En 2004
  `cmi.exit=normal` cierra el intento, así que el tiempo no se compara con la sesión anterior.
- **H5P**: `fixtures_package.py` genera `genova.h5p` con las plantillas de evaluación
  (`evaluate_01/05/06/07`) y sus datos estructurados. `provision_h5p.php` crea la actividad
  H5P con seguimiento. Las librerías se descargan del Hub con la tarea
  `h5p_get_content_types_task` (red la primera vez). `verify_h5p.mjs` comprueba que Moodle
  acepta el paquete (sin errores de `h5p.json`), que se ven las cuatro actividades y que, al
  responderlas todas, guarda un intento completado en `mdl_h5pactivity_attempts`
  (H5P.Column solo emite el xAPI `completed` cuando se comprueban todas).

`run-lti.sh` (con Moodle levantado y el backend de GenOVA en `GENOVA_URL` sobre la BD de
pruebas) prueba LTI 1.3 de punta a punta:

1. `lti_seed_genova.py`: docente `docente@example.invalid` y una OVA lista (fixtures del motor).
2. `provision_lti.php`: herramienta LTI 1.3 en Moodle con la clave pública de GenOVA (RSA key),
   Deep Linking, AGS y envío de correo; docente matriculado como profesor.
3. `lti_register_platform.py`: registra Moodle como plataforma en GenOVA.
4. `verify_lti.mjs`: el docente hace Deep Linking (Moodle valida el JWT firmado por GenOVA),
   se crea la actividad con esos datos (`provision_lti_activity.php`, lo que guarda el
   formulario), el alumno la lanza dentro de Moodle, completa los recursos y la nota llega por
   AGS a `mdl_grade_grades`.

`MOODLE_PORT` cambia el puerto publicado y el `wwwroot` (útil si 8081 está ocupado). Desde WSL
con Docker Desktop, `run.sh` exporta `WSLENV` para que `docker.exe` reciba la variable.
