# Aislamiento de recursos exportados (P5)

El SCO `index.html` es el shell confiable. Su iframe de recursos usa únicamente
`sandbox="allow-scripts"`: los ejercicios pueden ejecutar JavaScript, pero tienen
origen opaco y no pueden leer/modificar el DOM del shell, acceder a su almacenamiento,
quitar el sandbox, navegar la ventana superior ni abrir popups.

No se concede `allow-same-origin`. Combinarlo con `allow-scripts` para HTML generado
servido bajo el mismo origen que el shell permitiría retirar el sandbox. La API
SCORM 1.2 no lo necesita: `resources/scorm.js` se ejecuta en el shell y busca `API`
en sus ancestros o en `opener`; `app.js` registra visitas, progreso y completitud.
También xAPI/cmi5 se ejecuta en el shell. Los recursos no invocan directamente el LMS
ni tienen un puente `postMessage` con privilegios sobre él.

Topología prevista: LMS → shell SCO → recurso opaco. El shell debe conservar el
acceso a la API que el LMS ya exigía (mismo origen con el ancestro o `opener`). Un
LMS que aísle además el propio shell debe proporcionar su integración compatible;
se mantiene el modo vista previa cuando no se detecta `API`. No se elimina ese
aislamiento del LMS para dar acceso a los recursos. Los recursos que dependieran
de almacenamiento de origen o de acceso directo al padre deben adaptarse; no se
debe añadir `allow-same-origin` como solución.

Regresión: `tests/test_security_p5_scorm.py` inspecciona el ZIP exportado, no sólo
la plantilla, y `tests/test_scorm_package.py` cubre el ensamblado y runtime del shell.
La compatibilidad con un LMS concreto requiere probar importación, navegación y
persistencia de completitud en ese LMS; no se ha validado un despliegue externo.
