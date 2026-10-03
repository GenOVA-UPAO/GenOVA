# SCORM 1.2 en Moodle real

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
