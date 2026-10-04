# Fuentes de referencia

DejaVu Sans (normal/negrita) y DejaVu Sans Mono se distribuyen bajo la licencia
DejaVu/Bitstream Vera incluida en `LICENSE`. Se cargan solo para las capturas de
regresión: la auditoría axe se ejecuta antes con la tipografía real del recurso.
Noto Emoji (Google Fonts, archivo `ofl/notoemoji/NotoEmoji[wght].ttf`) se incluye
como respaldo explícito para los emoji que DejaVu no contiene (trofeo, bandera,
robot, etc.). Su licencia SIL OFL 1.1 está en `NotoEmoji-LICENSE`.

No hay solicitudes a proveedores de fuentes durante los tests ni dependencia
de las fuentes de emoji del host. Los binarios se versionan con las referencias.
