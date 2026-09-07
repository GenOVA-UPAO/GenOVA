**UNIVERSIDAD PRIVADA ANTENOR ORREGO**

**FACULTAD DE INGENIERÍA**

**PROGRAMA DE ESTUDIO DE INGENIERÍA DE SISTEMAS E INTELIGENCIA ARTIFICIAL**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**"Desarrollo de una Aplicación Web basada en Agentes Multimodales** **para la creación de OVAs en el curso de**  
**Machine Learning en UPAO 2026"**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Manual de Despliegue – GenOVA**

**Curso:**

* Taller Integrador I

**AUTORES:**

* Carranza Jacinto, Juan Diego  
* Romero Uriol, Jeffry Anderson

**DOCENTE:**

* Cueva Chávez, Walter Manuel

**TRUJILLO – PERÚ**

**2026**

# **1\. Introducción**

GenOVA es una aplicación web que utiliza agentes multimodales de Inteligencia Artificial Generativa para crear automáticamente Objetos Virtuales de Aprendizaje (OVA), estructurados bajo el modelo pedagógico 5E y empaquetados en el estándar SCORM 1.2 con capa adicional cmi5/xAPI. Este manual describe, con el mayor nivel de detalle posible, todos los pasos necesarios para instalar el proyecto en un entorno de desarrollo local y para desplegarlo en producción: requisitos exactos, tres vías de instalación alternativas, configuración completa de variables de entorno (backend y frontend), topología de despliegue en la nube, y verificación post-despliegue.

El código fuente es un monorepo con dos aplicaciones (frontend/ en Angular 22 y backend/ en FastAPI/Python) gestionadas con pnpm workspaces, disponible en [https://github.com/GenOVA-UPAO/GenOVA](https://github.com/GenOVA-UPAO/GenOVA). El proyecto soporta dos gestores de paquetes para el backend (pip y uv) y dos formas de ejecución (con y sin Docker); este manual documenta ambas rutas para que el lector elija según su entorno.

## **1.1 Convenciones usadas en este manual**

●   	Los bloques con fondo gris representan comandos exactos a ejecutar en una terminal, o contenido exacto de un archivo de configuración.  
●   	Las variables entre corchetes, como \[PROJECT\_REF\] o \<tu-proyecto\>, deben reemplazarse por el valor real correspondiente a tu propio proyecto.  
●   	Las advertencias marcadas con ⚠ indican errores de arranque conocidos o configuraciones críticas de seguridad que, si se omiten, impiden que el sistema funcione o exponen datos sensibles.

# 

# **2\. Requisitos previos**

## **2.1 Software obligatorio**

***Tabla 1\. Software y versiones mínimas requeridas***

| Componente | Versión mínima | Verificación | Notas |
| ----- | ----- | ----- | ----- |
| Node.js | 20+ | node \--version | Requerido por el frontend Angular y por pnpm |
| pnpm | 10+ | pnpm \--version | Gestor de paquetes del monorepo (workspaces) |
| Python | 3.11+ | python \--version | Versión fijada en backend/.python-version |
| Git | cualquiera reciente | git \--version | Control de versiones |
| Cuenta Supabase | — | https://supabase.com | Provee PostgreSQL \+ pgvector \+ Storage |

## **2.2 Software opcional**

***Tabla 2\. Herramientas opcionales según la vía de instalación elegida***

| Componente | ¿Para qué sirve? |
| ----- | ----- |
| uv | Instala y ejecuta el backend Python más rápido que pip; totalmente opcional, pip sigue funcionando |
| Docker \+ Docker Compose | Permite levantar frontend y backend en contenedores con hot-reload, sin instalar Node/Python localmente |
| Redis | Habilita la cola de trabajos durable (arq) para la generación de OVA; sin él, el sistema usa un runner en hilo (funciona igual en desarrollo) |

## **2.3 Credenciales externas necesarias antes de empezar**

Antes de configurar el proyecto, se recomienda tener a la mano:

●   	**Supabase:** Cadena de conexión a PostgreSQL de un proyecto Supabase (Project Settings → Database → Connection string, modo Transaction pooler, puerto 6543).  
●   	**Claves LLM:** Al menos una clave de API de Groq (https://console.groq.com) y, opcionalmente, de OpenRouter ([https://openrouter.ai](https://openrouter.ai)), para que la generación de OVA funcione con proveedores reales.  
●   	**Gemini (opcional):** Una clave de Google AI Studio (https://aistudio.google.com), si se desea habilitar el RAG multimodal.  
●   	**SMTP (opcional):** Una App Password de una cuenta de Gmail (no la contraseña de la cuenta), si se desea habilitar el correo de restablecimiento de contraseña.

# **3\. Instalación**

## **3.1 Paso 1 (común a todas las vías): clonar el repositorio**

git clone https://github.com/GenOVA-UPAO/GenOVA.git  
 cd GenOVA

Esto crea la carpeta GenOVA/ con la estructura de monorepo completa: frontend/, backend/, tests/, docs/, scripts/, entre otras (ver estructura detallada en el Anexo A del Informe de Capstone).

## **3.2 Paso 2 (común a todas las vías): preparar los archivos de variables de entorno**

cp backend/.env.example backend/.env  
 cp frontend/.env.example frontend/.env

Estos comandos copian las plantillas de variables de entorno. El archivo backend/.env.example trae comentarios explicativos sobre cada variable; frontend/.env.example, la URL base del backend en cada entorno. La edición de estos archivos se detalla íntegramente en la Sección 4\.

## **3.3 Vía A — Con Docker (recomendada para no instalar Node/Python localmente)**

Requiere Docker y Docker Compose instalados. Levanta frontend y backend en contenedores separados, con recarga en caliente (hot-reload), en un solo comando ejecutado desde la raíz del repositorio:

pnpm dev:docker

Este comando usa el archivo docker-compose.yml, cuyo contenido completo es:

services:  
   backend:  
 	build:  
   	context: ./backend  
   	dockerfile: Dockerfile  
 	container\_name: genova-backend-dev  
 	env\_file:  
   	\- ./backend/.env  
 	ports:  
   	\- '8000:8000'  
 	volumes:  
   	\- ./backend:/app  
 	healthcheck:  
   	test: \['CMD', 'python', '-c', 'import urllib.request; urllib.request.urlopen("http://localhost:8000/health")'\]  
   	interval: 15s  
   	timeout: 5s  
   	retries: 5  
   	start\_period: 15s

   frontend:  
 	build:  
   	context: ./frontend  
   	dockerfile: Dockerfile  
 	container\_name: genova-frontend-dev  
 	depends\_on:  
   	backend:  
     	condition: service\_healthy  
 	command: pnpm dev \--host 0.0.0.0 \--port 4200  
 	ports:  
   	\- '4200:4200'  
 	environment:  
   	\- CI=true  
   	\- API\_PROXY\_TARGET=http://backend:8000  
 	volumes:  
   	\- ./frontend:/app  
   	\- /app/node\_modules

El frontend queda disponible en http://localhost:4200 y el backend en http://localhost:8000/health (endpoint de verificación de salud). El servicio backend tiene un healthcheck que reintenta 5 veces cada 15 segundos antes de considerarlo caído; el frontend espera (depends\_on: condition: service\_healthy) a que el backend esté sano antes de arrancar, para evitar errores de conexión al iniciar.

## **3.4 Vía B — Sin Docker, backend con pip**

cd backend  
 python \-m venv venv

 \# Activar el entorno virtual:  
 \# Windows:  
 venv\\Scripts\\activate  
 \# macOS/Linux:  
 source venv/bin/activate

 pip install \-r requirements.txt  
 uvicorn main:app \--reload \--port 8000

El flag \--reload activa la recarga automática del servidor ante cambios en el código, útil para desarrollo. El backend queda escuchando en http://localhost:8000.

## **3.5 Vía C — Sin Docker, backend con uv (instalación más rápida)**

cd backend  
 uv sync                      	\# instala desde pyproject.toml  
 uv run uvicorn main:app \--reload \--port 8000

 \# Para incluir herramientas de desarrollo (ruff, pytest, requests, bs4):  
 uv sync \--extra dev

uv resuelve e instala las dependencias declaradas en backend/pyproject.toml de forma significativamente más rápida que pip, sin necesidad de crear ni activar manualmente un entorno virtual (uv lo gestiona internamente). requirements.txt y pyproject.toml se mantienen sincronizados manualmente entre sí: ambos resuelven al mismo conjunto de dependencias de producción, por lo que puede usarse cualquiera de las dos vías (B o C) indistintamente.

## **3.6 Paso final (vías B y C): levantar el frontend**

En una segunda terminal, desde la raíz del repositorio:

pnpm install  
 pnpm dev

pnpm install instala las dependencias de todos los paquetes del workspace (frontend y cualquier paquete compartido). pnpm dev levanta el servidor de desarrollo de Angular en http://localhost:4200 con recarga en caliente; en local, usa un proxy interno hacia location.origin para las peticiones a la API, por lo que no es necesario configurar GENOVA\_API\_BASE\_\* en desarrollo local (sí es obligatorio en Vercel, ver Sección 6).

## **3.7 Verificación de que la instalación funcionó**

Tras levantar backend y frontend (por cualquiera de las tres vías), verificar:

●   	**Backend — abrir http://localhost:8000/health en el navegador o con curl:** Debe responder {"status": "ok"}.  
●   	**Frontend — abrir http://localhost:4200:** Debe cargar la pantalla de inicio de sesión de GenOVA sin errores en la consola del navegador.  
●   	**Primer arranque:** Al arrancar por primera vez, seed.py crea roles y cuentas de prueba en la base de datos (ver Sección 4.6); estas credenciales permiten iniciar sesión sin necesidad de registrarse manualmente.

# **4\. Configuración**

Esta sección documenta, de forma exhaustiva, el contenido completo de backend/.env.example (la plantilla real del repositorio) agrupado por bloque funcional, seguido de la configuración del frontend.

## **4.1 Bloque — Infraestructura núcleo**

DATABASE\_URL=postgresql+psycopg://postgres.\[PROJECT\_REF\]:\[PASSWORD\]@\[AWS-REGION\].pooler.supabase.com:5432/postgres?sslmode=require  
 ENV=production  
 PORT=8000  
 LOG\_LEVEL=INFO

●   	**DATABASE\_URL:** cadena de conexión a PostgreSQL vía el Transaction pooler de Supabase. \[PROJECT\_REF\], \[PASSWORD\] y \[AWS-REGION\] se obtienen en Supabase → Project Settings → Database.  
●   	**ENV:** controla validaciones exclusivas de producción, entre ellas la obligatoriedad de CORS\_ORIGINS. Por defecto es dev (CORS permisivo); nunca debe dejarse sin definir en producción.  
●   	**PORT:** puerto en el que escucha uvicorn. Railway lo inyecta automáticamente; en local se usa 8000 por convención.

## **4.2 Bloque — Autenticación (JWT)**

JWT\_SECRET=replace-with-a-strong-random-secret  
 JWT\_ALGORITHM=HS256  
 JWT\_EXPIRES\_MINUTES=1440  
 AUTH\_ACCEPT\_BEARER=0

⚠ JWT\_SECRET debe tener 16 o más caracteres. El backend falla al arrancar (hard-fail) si la variable está vacía o contiene un valor débil conocido ("change-me", "secret", ""). Se genera una clave segura con:

python \-c "import secrets; print(secrets.token\_urlsafe(48))"

●   	**JWT\_EXPIRES\_MINUTES:** vida del token en minutos; 1440 equivale a 24 horas.  
●   	**AUTH\_ACCEPT\_BEARER:** acepta el header legado Authorization: Bearer además de la cookie httpOnly. Se recomienda poner en 0 una vez que todos los clientes usen exclusivamente autenticación por cookie.

## **4.3 Bloque — CORS y cookies**

CORS\_ORIGINS=https://gen-ova-frontend.vercel.app  
 COOKIE\_SAMESITE=none

●   	**CORS\_ORIGINS:** lista separada por comas de orígenes de frontend permitidos en producción. Obligatorio si ENV=production.  
●   	**COOKIE\_SAMESITE:** política SameSite de la cookie de sesión. Usar "none" (con Secure=True, activado automáticamente) cuando frontend y backend viven en dominios distintos, como en este proyecto (Vercel \+ Railway). Usar "strict" solo si ambos comparten el mismo dominio. Por defecto es "lax", que bloquea la entrega de la cookie entre sitios distintos.

## **4.4 Bloque — Pool de base de datos**

DB\_POOL\_SIZE=10  
 DB\_MAX\_OVERFLOW=10

Controlan el tamaño del pool de conexiones SQLAlchemy contra el Transaction pooler de Supabase (puerto 6543). Valores más altos permiten más conexiones concurrentes, a costa de mayor consumo de memoria; 10+10 es el valor por defecto verificado contra el nivel gratuito de Supabase.

## **4.5 Bloque — Credenciales de proveedores LLM**

GROQ\_API\_KEY=gsk\_your\_groq\_key\_here  
 OPENROUTER\_API\_KEY=sk-or-your\_openrouter\_key\_here  
 OPENCODE\_API\_KEY=oc\_your\_opencode\_key\_here  
 GEMINI\_API\_KEY=  
 HF\_TOKEN=  
 HF\_IMAGE\_MODEL=black-forest-labs/FLUX.1-schnell  
 SILICONFLOW\_API\_KEY=  
 SILICONFLOW\_IMAGE\_MODEL=stabilityai/stable-diffusion-3-5-large  
 RUNWARE\_API\_KEY=  
 RUNWARE\_IMAGE\_MODEL=runware:100@1  
 FALAI\_API\_KEY=  
 FALAI\_IMAGE\_MODEL=fal-ai/flux/schnell  
 APP\_URL=https://genova.ai

***Tabla 3\. Rol de cada proveedor en la cadena de generación***

| Variable | Proveedor | Uso |
| ----- | ----- | ----- |
| GROQ\_API\_KEY | Groq | LLM primario (texto/razonamiento) \+ transcripción de audio (Whisper) |
| OPENROUTER\_API\_KEY | OpenRouter | LLM de generación de código/HTML (DeepSeek V4 Flash) |
| OPENCODE\_API\_KEY | OpenCode Go | Suscripción personal para acceso a DeepSeek V4 Pro |
| GEMINI\_API\_KEY | Google AI Studio | Embeddings multimodales del RAG (ver 4.7) |
| HF\_TOKEN | Hugging Face | Generación de imágenes (FLUX.1-schnell), proveedor por defecto |
| SILICONFLOW\_API\_KEY | SiliconFlow | Proveedor alternativo de generación de imágenes |
| RUNWARE\_API\_KEY | Runware | Proveedor alternativo de generación de imágenes |
| FALAI\_API\_KEY | Fal.ai | Proveedor alternativo de generación de imágenes |

Ninguna de estas claves es individualmente obligatoria para que el backend arranque, pero sin al menos GROQ\_API\_KEY u OPENROUTER\_API\_KEY la generación de OVA no podrá completarse. APP\_URL se envía como header HTTP-Referer a OpenRouter para fines de atribución de la aplicación.

## **4.6 Bloque — Configuración de generación de OVA**

OVA\_ENABLED\_LLMS=  
 LLM\_TIMEOUT\_S=120  
 OVA\_GENERATION\_DURATION\_SECONDS=14  
 OVA\_OUTPUT\_DIR=  
 OVA\_MAX\_GENERATED\_IMAGES=2  
 UPLOAD\_MAX\_FILES=5  
 UPLOAD\_MAX\_FILE\_SIZE\_MB=20

●   	**OVA\_ENABLED\_LLMS:** lista separada por comas de IDs de catálogo a exponer en el selector de modelos (ej. groq-llama-3.3-70b, groq-gpt-oss-120b, groq-qwen3-32b, openrouter-qwen3-coder). Vacío \= se exponen todos los motores disponibles.  
●   	**LLM\_TIMEOUT\_S:** timeout por llamada individual al LLM, en segundos. Se recomienda reducir en workers con límite de tiempo estricto.  
●   	**OVA\_OUTPUT\_DIR:** carpeta de respaldo en disco local para los .zip SCORM cuando Supabase Storage no está configurado. Por defecto backend/scorm\_output/. La persistencia primaria es siempre Supabase Storage.  
●   	**UPLOAD\_MAX\_FILES / UPLOAD\_MAX\_FILE\_SIZE\_MB:** máximo de archivos por solicitud de carga (5) y tamaño máximo por archivo en MB (20).

## **4.7 Bloque — Supabase Storage (persistencia de paquetes SCORM)**

SUPABASE\_URL=https://your-project-ref.supabase.co  
 SUPABASE\_SERVICE\_ROLE\_KEY=  
 SUPABASE\_STORAGE\_BUCKET=scorm-packages

⚠ SUPABASE\_SERVICE\_ROLE\_KEY es un secreto exclusivo del servidor: nunca debe exponerse al frontend ni llevar el prefijo VITE\_. Sin estas tres variables, el backend cae automáticamente a persistencia en disco local (modo desarrollo); con ellas, el backend usa la service role key (que evita las políticas RLS) para subir el .zip al bucket privado scorm-packages y emite URLs firmadas de 1 hora de vigencia a los clientes que descargan el paquete.

## **4.8 Bloque — RAG (Generación Aumentada por Recuperación)**

RAG\_EMBEDDER=gemini  
 RAG\_CHUNK\_SIZE=800  
 RAG\_CHUNK\_OVERLAP=150  
 RAG\_MAX\_CHUNKS\_PER\_FILE=100  
 RAG\_TOP\_K=5  
 RAG\_MAX\_CONTEXT\_CHARS=6000  
 RAG\_DISABLED=

***Tabla 4\. Valores válidos de RAG\_EMBEDDER***

| Valor | Modelo | Características |
| ----- | ----- | ----- |
| gemini (por defecto) | gemini-embedding-2-preview | Nativamente multimodal: ingiere texto, imágenes (PNG/JPEG), PDF (6 páginas/solicitud con OCR), audio (sin necesidad de Whisper) y video (hasta 120 s). Truncado tipo Matryoshka a 768 dimensiones |
| gemini-001 | gemini-embedding-001 | Alternativa estable, solo texto, disponibilidad general (GA). Usar si el modelo Preview es inestable |
| local | sentence-transformers MiniLM | 384 dimensiones, corre localmente; requiere RAM adicional en el servidor |

En el primer arranque, las migraciones aplican automáticamente CREATE EXTENSION vector. Puede verificarse que pgvector está activo consultando GET /api/rag/health, que debe responder {"pgvector\_ready": true}. Para desactivar el RAG por completo (por ejemplo, en un entorno de pruebas de carga): RAG\_DISABLED=1.

## **4.9 Bloque — Verificación de correo y SMTP**

EMAIL\_VERIFICATION\_ENABLED=0

 SMTP\_HOST=smtp.gmail.com  
 SMTP\_PORT=465  
 SMTP\_USER=soporte.genova.upao@gmail.com  
 SMTP\_PASSWORD=replace-with-google-app-password

EMAIL\_VERIFICATION\_ENABLED exige verificar el correo antes de poder iniciar sesión; está desactivado por defecto (registro e inicio de sesión sin verificación previa), y debe activarse (valor 1 o true) solo cuando el envío de correos esté disponible y probado. Si SMTP\_USER o SMTP\_PASSWORD no están configuradas, el endpoint de restablecimiento de contraseña lanza el error EmailNotConfigured y registra el fallo en el log, sin enviar el correo y sin credenciales predefinidas en el código fuente. SMTP\_PASSWORD debe ser una App Password de Google (no la contraseña normal de la cuenta de Gmail).

## **4.10 Bloque — Palancas de prueba (nunca activar en producción)**

RATE\_LIMIT\_ENABLED=1  
 LLM\_FAKE=0

⚠ RATE\_LIMIT\_ENABLED=0 desactiva por completo el limitador de tasa (SlowAPI) a nivel global; existe únicamente para permitir pruebas de carga y E2E masivas en el pipeline de CI, y nunca debe ponerse en 0 en un despliegue real. LLM\_FAKE=1 sustituye la generación real por HTML determinista sin llamar a ningún proveedor de IA, usado en CI para no consumir cuota durante las pruebas automatizadas de carga y E2E.

## **4.11 Bloque — Observabilidad (opcional, todo opt-in)**

\# SENTRY\_DSN=  
 \# LOGFIRE\_TOKEN=  
 \# LANGSMITH\_API\_KEY=  
 \# LANGSMITH\_TRACING=0  
 \# LANGSMITH\_PROJECT=genova

Las cuatro integraciones de observabilidad son estrictamente opcionales y no-op (no hacen nada) si sus variables no están configuradas: Sentry (captura de errores), Logfire (instrumentación de FastAPI/SQLAlchemy/OpenAI), y LangSmith (trazas distribuidas del grafo LangGraph/Prometheus, incluida la agrupación de llamadas del fan-out bajo un único árbol por job). Nunca deben comitearse claves reales en el repositorio.

## **4.12 Frontend (frontend/.env)**

GENOVA\_API\_BASE\_PROD=https://genova-backend-production.up.railway.app  
 GENOVA\_API\_BASE\_DEVELOP=https://genova-backend-develop.up.railway.app  
 \# Opcional: un solo valor para todo el deploy (sobrescribe prod/develop).  
 \# GENOVA\_API\_BASE\_URL=

El frontend Angular no lee variables con prefijo VITE\_. La URL base de la API se inyecta en tiempo de build (pnpm build / pnpm dev) mediante el script frontend/scripts/write-api-env.mjs. En local (localhost), no es necesario definir estas variables: ng serve usa un proxy interno hacia location.origin. En Vercel, deben definirse las mismas variables en Project Settings → Environment Variables, separadas por entorno (Production / Preview).

## **4.13 Cuentas creadas en el primer arranque (seed)**

Al arrancar por primera vez contra una base de datos vacía, seed.py crea automáticamente roles del sistema y dos cuentas de prueba, útiles para verificar la instalación sin pasar por el flujo de registro manual:

***Tabla 5\. Cuentas sembradas automáticamente***

| Correo | Contraseña | Rol |
| ----- | ----- | ----- |
| admin@genova.ai | admin1234password | administrador |
| user@genova.ai | user1234password | usuario |

 

⚠ Estas credenciales son públicas (documentadas en el propio repositorio para fines de prueba) y deben cambiarse o eliminarse antes de un despliegue con usuarios reales fuera del entorno académico.

# 

# **5\. Tabla de referencia rápida de variables de entorno**

Consolidado de todas las variables documentadas en la Sección 4, para consulta rápida sin tener que revisar cada bloque por separado.

| Variable | Default | Req. | Bloque |
| ----- | ----- | ----- | ----- |
| DATABASE\_URL | — | Sí | Infraestructura |
| ENV | dev | No | Infraestructura |
| PORT | 8000 | No | Infraestructura |
| LOG\_LEVEL | INFO | No | Infraestructura |
| JWT\_SECRET | — | Sí | Autenticación |
| JWT\_ALGORITHM | HS256 | No | Autenticación |
| JWT\_EXPIRES\_MINUTES | 1440 | No | Autenticación |
| AUTH\_ACCEPT\_BEARER | 0 | No | Autenticación |
| CORS\_ORIGINS | (localhost) | Cond. | CORS/Cookies |
| COOKIE\_SAMESITE | lax | No | CORS/Cookies |
| DB\_POOL\_SIZE | 10 | No | Pool BD |
| DB\_MAX\_OVERFLOW | 10 | No | Pool BD |
| GROQ\_API\_KEY | — | Sí\* | Proveedores LLM |
| OPENROUTER\_API\_KEY | — | Sí\* | Proveedores LLM |
| OPENCODE\_API\_KEY | — | No | Proveedores LLM |
| GEMINI\_API\_KEY | — | Cond. | Proveedores LLM / RAG |
| HF\_TOKEN | — | No | Imágenes |
| HF\_IMAGE\_MODEL | FLUX.1-schnell | No | Imágenes |
| SILICONFLOW\_API\_KEY | — | No | Imágenes |
| RUNWARE\_API\_KEY | — | No | Imágenes |
| FALAI\_API\_KEY | — | No | Imágenes |
| APP\_URL | https://genova.ai | No | Proveedores LLM |
| OVA\_ENABLED\_LLMS | (todos) | No | Generación OVA |
| LLM\_TIMEOUT\_S | 120 | No | Generación OVA |
| OVA\_OUTPUT\_DIR | backend/scorm\_output | No | Generación OVA |
| OVA\_MAX\_GENERATED\_IMAGES | 2 | No | Generación OVA |
| UPLOAD\_MAX\_FILES | 5 | No | Generación OVA |
| UPLOAD\_MAX\_FILE\_SIZE\_MB | 20 | No | Generación OVA |
| SUPABASE\_URL | — | No | Storage |
| SUPABASE\_SERVICE\_ROLE\_KEY | — | No | Storage |
| SUPABASE\_STORAGE\_BUCKET | scorm-packages | No | Storage |
| RAG\_EMBEDDER | gemini | No | RAG |
| RAG\_CHUNK\_SIZE | 800 | No | RAG |
| RAG\_CHUNK\_OVERLAP | 150 | No | RAG |
| RAG\_MAX\_CHUNKS\_PER\_FILE | 100 | No | RAG |
| RAG\_TOP\_K | 5 | No | RAG |
| RAG\_MAX\_CONTEXT\_CHARS | 6000 | No | RAG |
| RAG\_DISABLED | — | No | RAG |
| EMAIL\_VERIFICATION\_ENABLED | 0 | No | Correo |
| SMTP\_HOST | smtp.gmail.com | No | Correo |
| SMTP\_PORT | 465 | No | Correo |
| SMTP\_USER | — | No | Correo |
| SMTP\_PASSWORD | — | No | Correo |
| REDIS\_URL | — | No | Cola de trabajos |
| ARQ\_MAX\_JOBS | 4 | No | Cola de trabajos |
| RATE\_LIMIT\_ENABLED | 1 | No | Pruebas (¡no tocar en prod\!) |
| LLM\_FAKE | 0 | No | Pruebas (¡no tocar en prod\!) |
| SENTRY\_DSN | — | No | Observabilidad |
| LOGFIRE\_TOKEN | — | No | Observabilidad |
| LANGSMITH\_API\_KEY | — | No | Observabilidad |

 

*\* GROQ\_API\_KEY u OPENROUTER\_API\_KEY: se requiere al menos una de las dos para que la generación de OVA funcione.*

# 

# **6\. Despliegue en producción**

## **6.1 Topología productiva**

El sistema en producción se despliega con el frontend en Vercel (estático, build de Angular), el backend (dos servicios: API y worker de generación) en Railway, y la base de datos más el almacenamiento de archivos en Supabase. Los ambientes reales verificados del proyecto son:

***Tabla 6\. URLs de los entornos desplegados***

| Entorno | Frontend | Backend |
| ----- | ----- | ----- |
| develop | gen-ova-frontend-git-develop-gen-ova-s-projects.vercel.app | genova-backend-develop.up.railway.app |
| producción | gen-ova-frontend.vercel.app | genova-backend-production.up.railway.app |

Las URLs de preview de Vercel están protegidas con Deployment Protection; para probarlas externamente se desactiva temporalmente la protección desde el dashboard de Vercel, o se configura la variable VERCEL\_AUTOMATION\_BYPASS\_SECRET.

***Tabla 7\. Componentes de la topología productiva***

| Componente | Host | Artefacto |
| ----- | ----- | ----- |
| Frontend | Vercel | ng build → estático (dist/frontend/browser); Vercel autodetecta Angular |
| Backend API | Railway | backend/Dockerfile.prod (uvicorn); servicios en .railway/railway.ts |
| Worker de generación | Railway | backend/Dockerfile.worker (arq), desacoplado de la API por Redis |
| Base de datos | Supabase | PostgreSQL \+ pgvector (Transaction pooler, puerto 6543\) |
| Storage SCORM | Supabase Storage | bucket privado scorm-packages (URLs firmadas) |

## **6.2 Paso a paso — Frontend en Vercel**

●   	Crear un nuevo proyecto en Vercel e importar el repositorio de GitHub.  
●   	En la configuración del proyecto, definir Root Directory \= frontend/ (el monorepo tiene el frontend en una subcarpeta, no en la raíz).  
●   	Vercel detecta automáticamente el framework Angular y usa ng build como comando de build; el resultado se sirve desde dist/frontend/browser/.  
●   	En Project Settings → Environment Variables, definir GENOVA\_API\_BASE\_PROD y/o GENOVA\_API\_BASE\_DEVELOP según el entorno (Production / Preview), apuntando a la URL del backend en Railway correspondiente.  
●   	El preset de Angular en Vercel provee automáticamente la regla /(.\*) → /index.html, necesaria para que las rutas de la Single Page Application (SPA) funcionen al recargar la página en cualquier ruta (por ejemplo, /dashboard).

El origen real del backend se resuelve en tiempo de ejecución en frontend/src/core/lib/http.ts, leyendo las variables GENOVA\_API\_BASE\_\* inyectadas en el build; también admite un override en tiempo de ejecución vía window.\_\_GENOVA\_API\_BASE\_\_ si fuera necesario depurar contra otro backend sin rehacer el build.



***FIGURA:vercel-import-repositorio.png|Pantalla de importación del repositorio en Vercel, con Root Directory \= frontend/***



***FIGURA:vercel-variables-entorno.png|Panel de Environment Variables (GENOVA\_API\_BASE\_PROD / GENOVA\_API\_BASE\_DEVELOP)***



***FIGURA:vercel-deployment-exitoso.png|Pantalla de deployment exitoso con la URL pública del frontend***

## **6.3 Paso a paso — Backend en Railway**

●   	Crear un nuevo proyecto en Railway y conectar el repositorio de GitHub.  
●   	Configurar el servicio de la API para construir con backend/Dockerfile.prod, usa la imagen base python:3.12-slim y arranca con uvicorn main:app \--host 0.0.0.0 \--port 8000\.  
●   	Definir, como mínimo, las variables: DATABASE\_URL, JWT\_SECRET, GROQ\_API\_KEY, OPENROUTER\_API\_KEY, CORS\_ORIGINS (con el origen exacto del frontend en Vercel) y ENV=production. Las variables de Storage, RAG y SMTP son opcionales (ver Sección 4).  
●   	Las migraciones de BD se aplican solas al arrancar el servicio, mediante la función run\_migrations() ejecutada en el ciclo de vida (lifespan) de FastAPI; no requiere un paso manual separado. En el primer arranque contra una base vacía, seed.py crea los roles del sistema y las cuentas de prueba (Sección 4.13).  
●   	Configurar (opcional, pero recomendado) el pooler de Transacciones de Supabase (puerto 6543), no el de Sesiones: el backend usa pool\_pre\_ping=True y pool\_recycle=300 para sobrevivir a la evicción de conexiones de pgbouncer bajo el nivel gratuito de Supabase; el pooler de Sesiones es incompatible con esta configuración bajo carga.

### **6.3.1 Worker de generación (arq) — opcional pero recomendado en producción**

Con REDIS\_URL configurado, la generación de un OVA se encola con arq en vez de correr en un hilo dentro del proceso web, de modo que un redeploy o una caída del servicio no pierde generaciones en curso. Esto requiere crear un segundo servicio en Railway, con la misma imagen/repositorio que la API y las mismas variables de entorno (DATABASE\_URL, REDIS\_URL, claves de LLM), pero con un comando de arranque distinto:

arq worker.WorkerSettings    	\# comando de arranque del servicio worker

Si REDIS\_URL no está configurado, o si el encolado falla por cualquier motivo, el endpoint de creación de job cae automáticamente al runner inline en hilo dentro del proceso web — tanto el desarrollo local como la resiliencia ante una caída de Redis siguen funcionando sin este segundo servicio, aunque sin la garantía de durabilidad ante un redeploy. La concurrencia de generación por worker se controla con ARQ\_MAX\_JOBS (por defecto 4 jobs en paralelo).

**Pantalla de creación de proyecto nuevo en Railway, conectando el repositorio de GitHub:**

**Configuración del servicio API: selección de backend/Dockerfile.prod como build source:**

**Panel de Variables de entorno completo del servicio API (valores sensibles tapados/censurados):**

**Logs del deploy mostrando arranque exitoso (Uvicorn running / migraciones aplicadas sin error):**

**Configuración del segundo servicio (worker arq), si está activo:**

**Pantalla del dominio/URL pública asignada por Railway al servicio:**

## **6.4 Paso a paso — Supabase**

● Crear un nuevo proyecto en supabase.com. Copiar la cadena de conexión PostgreSQL (Project Settings → Database → Connection string → modo Transaction, puerto 6543\) para usarla como DATABASE\_URL.  
● La extensión pgvector se crea automáticamente por migración (CREATE EXTENSION vector) en el primer arranque del backend; no requiere activarse manualmente desde el dashboard.  
● Ir a Storage → Create bucket, nombrarlo exactamente scorm-packages, y marcarlo como privado (no público). La política RLS por defecto bloquea el acceso anónimo; el backend usa la service role key (que evita RLS) para subir los .zip y emitir URLs firmadas de 1 hora a los clientes que los descargan. Sin este bucket configurado, el sistema cae automáticamente a persistencia en disco local (útil solo en desarrollo, ya que los archivos se pierden en cada redeploy).  
● Copiar Project Settings → API → Project URL (SUPABASE\_URL) y service\_role key (SUPABASE\_SERVICE\_ROLE\_KEY, no la anon key) hacia las variables de entorno del backend.

**Pantalla de creación del proyecto Supabase \+ Connection String (Project Settings → Database), remarcando que se usa el Transaction pooler, puerto 6543:**

**Confirmación de que la extensión pgvector está activa (Database → Extensions):**

**Creación del bucket scorm-packages en Storage, marcado como privado:**

**Tabla users mostrando las cuentas sembradas (admin@genova.ai / user@genova.ai) tras el primer arranque:**

## **6.5 Verificación post-despliegue (smoke test mínimo)**

Tras cualquier despliegue a producción, se recomienda verificar al menos los siguientes puntos (adaptado del bloque X de la suite de smoke tests del proyecto):

\# 1\. Verificar que el backend responde  
 curl https://\<tu-backend\>.up.railway.app/health  
 \# Debe responder: {"status": "ok"}

 \# 2\. Verificar el endpoint de salud de la API  
 curl https://\<tu-backend\>.up.railway.app/api/health  
 \# Debe responder con código 200

 \# 3\. Verificar la salud del RAG (si está configurado)  
 curl https://\<tu-backend\>.up.railway.app/api/rag/health  
 \# Debe responder: {"pgvector\_ready": true}

●   **Login end-to-end:** iniciar sesión con una cuenta de prueba en el frontend desplegado; debe redirigir a /dashboard con las estadísticas de OVAs visibles.  
●   **Flujo de datos:** tras iniciar sesión, verificar que la lista de OVAs carga (GET/api/ovas) y que la descarga de un paquete SCORM existente entrega un enlace firmado válido de Supabase Storage.  
●   **Logout:** cerrar sesión y confirmar que la cookie de sesión se elimina, y que las rutas protegidas (/dashboard, /mis-ovas, etc.) redirigen a /login sin sesión activa.

**Captura de GET /health respondiendo {"status": "ok"} (Postman o navegador):**

**Captura de GET /api/rag/health respondiendo {"pgvector\_ready": true}:**

**Captura del frontend cargando la pantalla de login sin errores en la consola del navegador (F12):**

# 

# **7\. Documentación de Endpoints (Swagger)**

FastAPI publica la documentación interactiva de la API en `/docs` (Swagger UI) y en `/redoc` (ReDoc). En un despliegue local la dirección es `http://localhost:8000/docs`; en producción, `https://<tu-backend>/docs`. Toda la sección se generó y verificó contra esa interfaz: cada endpoint de esta sección se ejecutó realmente desde Swagger UI con el botón *Execute* y la captura muestra la petición enviada y la respuesta del servidor.

⚠ En producción la documentación se deshabilita automáticamente cuando `ENV=production`
(`docs_url`, `redoc_url` y `openapi_url` quedan en `None`), de modo que la API desplegada
no expone su superficie a Internet. Para consultarla en producción hay que levantar el
backend con `ENV=development` en un entorno controlado.

## **7.1 Referencia completa vía Swagger**

La API expone **120 operaciones** repartidas en **18 grupos**. El siguiente pantallazo de `/docs` funciona como índice general: cada bloque plegado es uno de los grupos y, dentro, cada fila es una operación.

***FIGURA:000-swagger-completo.png|Pantalla completa de Swagger UI (`/docs`) con los 18 grupos de la API***

***Tabla 9\. Grupos de la API y número de operaciones***

| Grupo | Operaciones | Contenido |
| ----- | ----- | ----- |
| Health | 8 | Sondas de vida del servicio y de cada módulo. Públicas y cacheadas 10 s. |
| Autenticación | 8 | Registro, inicio y cierre de sesión, verificación de correo y recuperación de contraseña. El JWT viaja en la cookie httpOnly `genova_token`. |
| Autenticación · TOTP | 5 | Segundo factor: alta, confirmación, verificación y baja del TOTP. |
| Perfil | 4 | Datos de la cuenta propia: perfil, contraseña, tema y baja de cuenta. |
| Ajustes de usuario | 12 | Preferencias del usuario autenticado: claves de API, modelos habilitados, ajustes de LLM, de OVA y de recursos. |
| Vinculaciones | 6 | Vínculos docente↔estudiante: códigos, invitaciones y aceptación. |
| Agentes 5E | 10 | Agentes por fase del modelo 5E: catálogo de recursos y generación puntual. |
| Generación | 9 | Trabajos de generación de OVA: alta, consulta, streaming SSE, cancelación, reanudación y regeneración. |
| OVA · CRUD | 7 | Alta, listado, edición de metadatos, duplicado y borrado de OVA. |
| OVA · Fases y versiones | 10 | Fases y subelementos de una OVA, su historial de versiones y reversión. |
| OVA · Chat | 5 | Conversación de asistencia asociada a una OVA. |
| OVA · Papelera | 7 | Borrado lógico: papelera, restauración y borrado permanente (individual y por lote). |
| SCORM y descargas | 3 | Exportación y descarga del paquete SCORM 1.2 de una OVA. |
| Documentos y RAG | 4 | Subida de documentos de apoyo y consulta de los chunks indexados para RAG. |
| Analítica | 1 | Métricas agregadas de uso del usuario autenticado. |
| Admin · Usuarios | 8 | Gestión de usuarios por administrador: listado, perfil, rol, estado, desbloqueo y vínculos de cualquier usuario. |
| Admin · Roles | 4 | Roles y permisos de la plataforma. |
| Admin · Plataforma | 9 | Configuración global: modelos LLM, nodos del motor, modo de registro y refresco del catálogo. |

### **7.1.1 Cómo autenticarse en Swagger**

La sesión de GenOVA viaja en la cookie httpOnly `genova_token`, no en la cabecera `Authorization`. Por eso el flujo correcto dentro de Swagger UI es:

●   	Desplegar **Autenticación → POST /api/auth/login**, pulsar *Try it out* y enviar el cuerpo con las credenciales de una cuenta sembrada (por ejemplo `admin@genova.ai` / `admin1234password`).
●   	El servidor responde 200 y adjunta `Set-Cookie: genova_token=…; HttpOnly`. El navegador guarda la cookie y, como Swagger UI vive en el mismo origen que la API, todas las peticiones siguientes ya viajan autenticadas.
●   	El botón *Authorize* de la parte superior sólo sirve para el esquema `HTTPBearer` heredado, que se desactiva en producción con `AUTH_ACCEPT_BEARER=0`. No hace falta usarlo.
●   	Para cerrar la sesión basta ejecutar **POST /api/auth/logout**, que revoca el token y borra la cookie.

Los endpoints marcados como *Sí (admin)* exigen además el rol `administrador`; con la cuenta `user@genova.ai` devuelven 403.

### **7.1.2 Cómo leer las fichas de la sección 7.2**

Cada endpoint se documenta con una ficha de seis campos:

●   	**Método** y **URL**: verbo HTTP y ruta, con los parámetros de ruta entre llaves.
●   	**Autenticación**: `No` (público), `Sí (cookie)` (requiere sesión) o `Sí (admin)` (requiere rol administrador).
●   	**Parámetros**: los de ruta y de consulta, con la marca `(obligatorio)` cuando aplica.
●   	**Cuerpo de ejemplo**: JSON de ejemplo derivado del esquema OpenAPI real, o `(sin body)`.
●   	**Ejemplo de uso**: el mismo llamado en `curl`, para reproducirlo fuera de Swagger.
●   	**Resultado de la prueba**: código HTTP devuelto por el servidor en la captura adjunta.

Las rutas heredadas `/api/ova/...` (singular) y `/api/ova/jobs/...` siguen respondiendo por compatibilidad, pero están fuera del esquema OpenAPI y no se documentan aquí: las canónicas son `/api/ovas/...` y `/api/jobs/...`.

## **7.2 Prueba de cada endpoint en Swagger**

### **7.2.1 Health (8 endpoints)**

Sondas de vida del servicio y de cada módulo. Públicas y cacheadas 10 s.

#### **GET /api/agents/health — Estado del módulo de agentes**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:001-health_agents_health.png|GET /api/agents/health probado en Swagger UI***

#### **GET /api/db/health — Estado de la base de datos**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/db/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/db/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:002-health_db_health.png|GET /api/db/health probado en Swagger UI***

#### **GET /api/health — Estado de la API**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:003-health_api_health.png|GET /api/health probado en Swagger UI***

#### **GET /api/ovas/health — Estado del módulo de OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:004-health_ova_health.png|GET /api/ovas/health probado en Swagger UI***

#### **GET /api/rag/health — Estado del módulo RAG**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/rag/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/rag/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:005-health_rag_health.png|GET /api/rag/health probado en Swagger UI***

#### **GET /api/scorm/health — Estado del módulo SCORM**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/scorm/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/scorm/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:006-health_scorm_health.png|GET /api/scorm/health probado en Swagger UI***

#### **GET /api/uploads/health — Estado del módulo de subidas**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/uploads/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/uploads/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:007-health_uploads_health.png|GET /api/uploads/health probado en Swagger UI***

#### **GET /health — Estado del servicio**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/health` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/health'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:008-health_health.png|GET /health probado en Swagger UI***

### **7.2.2 Autenticación (8 endpoints)**

Registro, inicio y cierre de sesión, verificación de correo y recuperación de contraseña. El JWT viaja en la cookie httpOnly `genova_token`.

#### **POST /api/auth/forgot-password — Solicitar recuperación de contraseña**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/forgot-password` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"email": "docente@upao.edu.pe"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/forgot-password' -H 'Content-Type: application/json' -d '{"email": "docente@upao.edu.pe"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:009-autenticacion_forgot_password.png|POST /api/auth/forgot-password probado en Swagger UI***

#### **POST /api/auth/login — Iniciar sesión y recibir la cookie de sesión**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/login` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"email": "docente@upao.edu.pe", "password": "Secreta1234", "remember_me": false}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/login' -H 'Content-Type: application/json' -d '{"email": "docente@upao.edu.pe", "password": "Secreta1234", "remember_me": false}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:010-autenticacion_login.png|POST /api/auth/login probado en Swagger UI***

#### **POST /api/auth/logout — Cerrar sesión y revocar el token actual**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/logout` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/logout' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:011-autenticacion_logout.png|POST /api/auth/logout probado en Swagger UI***

#### **GET /api/auth/me — Obtener el usuario autenticado**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/auth/me` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/auth/me' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:012-autenticacion_get_me.png|GET /api/auth/me probado en Swagger UI***

#### **POST /api/auth/register — Registrar una cuenta nueva**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/register` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"email": "docente@upao.edu.pe", "password": "Secreta1234", "full_name": "Juan Diego Carranza"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/register' -H 'Content-Type: application/json' -d '{"email": "docente@upao.edu.pe", "password": "Secreta1234", "full_name": "Juan Diego Carranza"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:013-autenticacion_register.png|POST /api/auth/register probado en Swagger UI***

#### **POST /api/auth/resend-verification — Reenviar el correo de verificación**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/resend-verification` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"email": "docente@upao.edu.pe"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/resend-verification' -H 'Content-Type: application/json' -d '{"email": "docente@upao.edu.pe"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:014-autenticacion_resend_verification.png|POST /api/auth/resend-verification probado en Swagger UI***

#### **POST /api/auth/reset-password — Restablecer la contraseña con un token**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/reset-password` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"token": "<token recibido por correo>", "new_password": "NuevaClave1234"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/reset-password' -H 'Content-Type: application/json' -d '{"token": "<token recibido por correo>", "new_password": "NuevaClave1234"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 400 (verificado en Swagger) |

***FIGURA:015-autenticacion_reset_password.png|POST /api/auth/reset-password probado en Swagger UI***

#### **POST /api/auth/verify-email — Verificar el correo con el token recibido**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/verify-email` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"token": "<token recibido por correo>"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/verify-email' -H 'Content-Type: application/json' -d '{"token": "<token recibido por correo>"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 400 (verificado en Swagger) |

***FIGURA:016-autenticacion_verify_email.png|POST /api/auth/verify-email probado en Swagger UI***

### **7.2.3 Autenticación · TOTP (5 endpoints)**

Segundo factor: alta, confirmación, verificación y baja del TOTP.

#### **DELETE /api/auth/totp — Desactivar el TOTP de la cuenta propia**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/auth/totp` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"code": "ABC123"}` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/auth/totp' -b cookies.txt -H 'Content-Type: application/json' -d '{"code": "ABC123"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 400 (verificado en Swagger) |

***FIGURA:017-autenticacion_totp_totp_disable_self.png|DELETE /api/auth/totp probado en Swagger UI***

#### **DELETE /api/auth/totp/admin — Desactivar el TOTP de otro usuario (admin)**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/auth/totp/admin` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"user_id": "..."}` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/auth/totp/admin' -b cookies.txt -H 'Content-Type: application/json' -d '{"user_id": "..."}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:018-autenticacion_totp_totp_admin_disable.png|DELETE /api/auth/totp/admin probado en Swagger UI***

#### **POST /api/auth/totp/confirm — Confirmar el alta del TOTP con el primer código**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/totp/confirm` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"code": "ABC123"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/totp/confirm' -b cookies.txt -H 'Content-Type: application/json' -d '{"code": "ABC123"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 400 (verificado en Swagger) |

***FIGURA:019-autenticacion_totp_totp_confirm.png|POST /api/auth/totp/confirm probado en Swagger UI***

#### **POST /api/auth/totp/setup — Iniciar el alta del segundo factor TOTP**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/totp/setup` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/totp/setup' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:020-autenticacion_totp_totp_setup.png|POST /api/auth/totp/setup probado en Swagger UI***

#### **POST /api/auth/totp/verify — Verificar el código TOTP al iniciar sesión**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/auth/totp/verify` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `{"ticket": "...", "code": "ABC123"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/auth/totp/verify' -H 'Content-Type: application/json' -d '{"ticket": "...", "code": "ABC123"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 401 (verificado en Swagger) |

***FIGURA:021-autenticacion_totp_totp_verify.png|POST /api/auth/totp/verify probado en Swagger UI***

### **7.2.4 Perfil (4 endpoints)**

Datos de la cuenta propia: perfil, contraseña, tema y baja de cuenta.

#### **DELETE /api/users/me — Eliminar la cuenta propia**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/users/me` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"password": "Secreta1234"}` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/users/me' -b cookies.txt -H 'Content-Type: application/json' -d '{"password": "Secreta1234"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — borra la cuenta con la que se está probando |

***FIGURA:022-perfil_delete_account.png|DELETE /api/users/me probado en Swagger UI***

#### **PATCH /api/users/me — Actualizar el perfil propio**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/users/me` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"full_name": "Juan Diego Carranza", "email": "docente@upao.edu.pe", "university_id": 1, "gender": "...", "phone_number": "..."}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/users/me' -b cookies.txt -H 'Content-Type: application/json' -d '{"full_name": "Juan Diego Carranza", "email": "docente@upao.edu.pe", "university_id": 1, "gender": "...", "phone_number": "..."}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:023-perfil_update_profile.png|PATCH /api/users/me probado en Swagger UI***

#### **POST /api/users/me/change-password — Cambiar la contraseña propia**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/change-password` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"current_password": "Secreta1234", "new_password": "NuevaClave1234", "confirm_password": "..."}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/change-password' -b cookies.txt -H 'Content-Type: application/json' -d '{"current_password": "Secreta1234", "new_password": "NuevaClave1234", "confirm_password": "..."}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — cambiaría la contraseña de la cuenta de prueba |

***FIGURA:024-perfil_change_password.png|POST /api/users/me/change-password probado en Swagger UI***

#### **PATCH /api/users/me/theme — Actualizar el tema de la interfaz**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/users/me/theme` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"colorMode": "...", "designMode": "...", "palette": {}}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/users/me/theme' -b cookies.txt -H 'Content-Type: application/json' -d '{"colorMode": "...", "designMode": "...", "palette": {}}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:025-perfil_update_theme.png|PATCH /api/users/me/theme probado en Swagger UI***

### **7.2.5 Ajustes de usuario (12 endpoints)**

Preferencias del usuario autenticado: claves de API, modelos habilitados, ajustes de LLM, de OVA y de recursos.

#### **GET /api/users/me/api-keys — Obtener las claves de API propias**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/api-keys` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/api-keys' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:026-ajustes_de_usuario_get_api_keys.png|GET /api/users/me/api-keys probado en Swagger UI***

#### **PUT /api/users/me/api-keys — Guardar las claves de API propias**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/users/me/api-keys` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/users/me/api-keys' -b cookies.txt -H 'Content-Type: application/json' -d '{}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — sobrescribiría las claves de API del usuario |

***FIGURA:027-ajustes_de_usuario_put_api_keys.png|PUT /api/users/me/api-keys probado en Swagger UI***

#### **GET /api/users/me/enabled-models — Obtener los modelos habilitados**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/enabled-models` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/enabled-models' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:028-ajustes_de_usuario_get_enabled_models.png|GET /api/users/me/enabled-models probado en Swagger UI***

#### **PUT /api/users/me/enabled-models — Actualizar los modelos habilitados**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/users/me/enabled-models` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"models": [{}]}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/users/me/enabled-models' -b cookies.txt -H 'Content-Type: application/json' -d '{"models": [{}]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:029-ajustes_de_usuario_put_enabled_models.png|PUT /api/users/me/enabled-models probado en Swagger UI***

#### **GET /api/users/me/image-models — Listar los modelos de imagen disponibles**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/image-models` |
| Autenticación | Sí (cookie) |
| Parámetros | `provider` (query, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/image-models?provider=siliconflow' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:030-ajustes_de_usuario_get_image_models.png|GET /api/users/me/image-models probado en Swagger UI***

#### **GET /api/users/me/llm-settings — Obtener los ajustes de LLM propios**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/llm-settings` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/llm-settings' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:031-ajustes_de_usuario_get_llm_settings.png|GET /api/users/me/llm-settings probado en Swagger UI***

#### **PUT /api/users/me/llm-settings — Actualizar los ajustes de LLM propios**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/users/me/llm-settings` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"settings": {}}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/users/me/llm-settings' -b cookies.txt -H 'Content-Type: application/json' -d '{"settings": {}}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:032-ajustes_de_usuario_put_llm_settings.png|PUT /api/users/me/llm-settings probado en Swagger UI***

#### **POST /api/users/me/llm-settings/refresh-catalog — Refrescar el catálogo de modelos del usuario**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/llm-settings/refresh-catalog` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/llm-settings/refresh-catalog' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:033-ajustes_de_usuario_refresh_llm_catalog.png|POST /api/users/me/llm-settings/refresh-catalog probado en Swagger UI***

#### **GET /api/users/me/ova-settings — Obtener los ajustes de OVA propios**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/ova-settings` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/ova-settings' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:034-ajustes_de_usuario_get_ova_settings.png|GET /api/users/me/ova-settings probado en Swagger UI***

#### **PUT /api/users/me/ova-settings — Actualizar los ajustes de OVA propios**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/users/me/ova-settings` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"max_images": 1, "image_provider": "...", "image_model": "..."}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/users/me/ova-settings' -b cookies.txt -H 'Content-Type: application/json' -d '{"max_images": 1, "image_provider": "...", "image_model": "..."}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:035-ajustes_de_usuario_put_ova_settings.png|PUT /api/users/me/ova-settings probado en Swagger UI***

#### **GET /api/users/me/resource-configs — Obtener la configuración de recursos**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/resource-configs` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/resource-configs' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:036-ajustes_de_usuario_get_resource_configs.png|GET /api/users/me/resource-configs probado en Swagger UI***

#### **PUT /api/users/me/resource-configs — Actualizar la configuración de recursos**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/users/me/resource-configs` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"configs": {}}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/users/me/resource-configs' -b cookies.txt -H 'Content-Type: application/json' -d '{"configs": {}}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:037-ajustes_de_usuario_put_resource_configs.png|PUT /api/users/me/resource-configs probado en Swagger UI***

### **7.2.6 Vinculaciones (6 endpoints)**

Vínculos docente↔estudiante: códigos, invitaciones y aceptación.

#### **GET /api/users/me/links — Listar los vínculos propios**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/me/links` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/me/links' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:038-vinculaciones_list_my_links.png|GET /api/users/me/links probado en Swagger UI***

#### **POST /api/users/me/links/accept — Aceptar una vinculación con un código**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/links/accept` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"code": "ABC123"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/links/accept' -b cookies.txt -H 'Content-Type: application/json' -d '{"code": "ABC123"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 400 (verificado en Swagger) |

***FIGURA:039-vinculaciones_accept_link.png|POST /api/users/me/links/accept probado en Swagger UI***

#### **POST /api/users/me/links/code — Generar un código de vinculación**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/links/code` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/links/code' -b cookies.txt` |
| Respuesta esperada | 201 |
| Resultado de la prueba | 201 (verificado en Swagger) |

***FIGURA:040-vinculaciones_create_link_code.png|POST /api/users/me/links/code probado en Swagger UI***

#### **POST /api/users/me/links/invite — Invitar por correo a vincularse**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/links/invite` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"email": "docente@upao.edu.pe"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/links/invite' -b cookies.txt -H 'Content-Type: application/json' -d '{"email": "docente@upao.edu.pe"}'` |
| Respuesta esperada | 201 |
| Resultado de la prueba | No ejecutado — envía un correo real de invitación |

***FIGURA:041-vinculaciones_invite_link.png|POST /api/users/me/links/invite probado en Swagger UI***

#### **DELETE /api/users/me/links/{link_id} — Eliminar un vínculo propio**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/users/me/links/{link_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `link_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/users/me/links/2d1c3b4a-5f6e-4d7c-8b9a-0f1e2d3c4b5a' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:042-vinculaciones_delete_my_link.png|DELETE /api/users/me/links/{link_id} probado en Swagger UI***

#### **POST /api/users/me/links/{link_id}/resend — Reenviar la invitación de un vínculo**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/me/links/{link_id}/resend` |
| Autenticación | Sí (cookie) |
| Parámetros | `link_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/me/links/2d1c3b4a-5f6e-4d7c-8b9a-0f1e2d3c4b5a/resend' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:043-vinculaciones_resend_link.png|POST /api/users/me/links/{link_id}/resend probado en Swagger UI***

### **7.2.7 Agentes 5E (10 endpoints)**

Agentes por fase del modelo 5E: catálogo de recursos y generación puntual.

#### **POST /api/agents/elaborate/generate — Generar un recurso de la fase Elaborate**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/agents/elaborate/generate` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/agents/elaborate/generate' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera contenido con el LLM y consume créditos |

***FIGURA:044-agentes_5e_generate_elaborate_resource.png|POST /api/agents/elaborate/generate probado en Swagger UI***

#### **GET /api/agents/elaborate/recursos — Listar los recursos de la fase Elaborate**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/elaborate/recursos` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/elaborate/recursos'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:045-agentes_5e_list_elaborate_recursos.png|GET /api/agents/elaborate/recursos probado en Swagger UI***

#### **POST /api/agents/engage/generate — Generar un recurso de la fase Engage**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/agents/engage/generate` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/agents/engage/generate' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera contenido con el LLM y consume créditos |

***FIGURA:046-agentes_5e_generate_engage_resource.png|POST /api/agents/engage/generate probado en Swagger UI***

#### **GET /api/agents/engage/recursos — Listar los recursos de la fase Engage**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/engage/recursos` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/engage/recursos'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:047-agentes_5e_list_engage_recursos.png|GET /api/agents/engage/recursos probado en Swagger UI***

#### **POST /api/agents/evaluate/generate — Generar un recurso de la fase Evaluate**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/agents/evaluate/generate` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/agents/evaluate/generate' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera contenido con el LLM y consume créditos |

***FIGURA:048-agentes_5e_generate_evaluate_resource.png|POST /api/agents/evaluate/generate probado en Swagger UI***

#### **GET /api/agents/evaluate/recursos — Listar los recursos de la fase Evaluate**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/evaluate/recursos` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/evaluate/recursos'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:049-agentes_5e_list_evaluate_recursos.png|GET /api/agents/evaluate/recursos probado en Swagger UI***

#### **POST /api/agents/explain/generate — Generar un recurso de la fase Explain**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/agents/explain/generate` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/agents/explain/generate' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera contenido con el LLM y consume créditos |

***FIGURA:050-agentes_5e_generate_explain_resource.png|POST /api/agents/explain/generate probado en Swagger UI***

#### **GET /api/agents/explain/recursos — Listar los recursos de la fase Explain**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/explain/recursos` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/explain/recursos'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:051-agentes_5e_list_explain_recursos.png|GET /api/agents/explain/recursos probado en Swagger UI***

#### **POST /api/agents/explore/generate — Generar un recurso de la fase Explore**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/agents/explore/generate` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/agents/explore/generate' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_type": 1, "concept": "...", "upload_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera contenido con el LLM y consume créditos |

***FIGURA:052-agentes_5e_generate_explore_resource.png|POST /api/agents/explore/generate probado en Swagger UI***

#### **GET /api/agents/explore/recursos — Listar los recursos de la fase Explore**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/agents/explore/recursos` |
| Autenticación | No |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/agents/explore/recursos'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:053-agentes_5e_list_explore_recursos.png|GET /api/agents/explore/recursos probado en Swagger UI***

### **7.2.8 Generación (9 endpoints)**

Trabajos de generación de OVA: alta, consulta, streaming SSE, cancelación, reanudación y regeneración.

#### **GET /api/jobs — Buscar un trabajo por criterios**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/jobs` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (query, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/jobs?ova_id=b2f9a15f-5009-4929-bc23-3b9b8af59662' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:054-generacion_find_job.png|GET /api/jobs probado en Swagger UI***

#### **POST /api/jobs — Encolar un trabajo de generación de OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/jobs` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"prompt": "Redes neuronales para estudiantes de pregrado", "upload_ids": ["..."], "resources": [{"phase_type": "...", "resource_type": "..."}], "phases": ["..."], "theme": {"color": "upao", "design": "upao"}, "resource_configs": {}}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/jobs' -b cookies.txt -H 'Content-Type: application/json' -d '{"prompt": "Redes neuronales para estudiantes de pregrado", "upload_ids": ["..."], "resources": [{"phase_type": "...", "resource_type": "..."}], "phases": ["..."], "theme": {"color": "upao", "design": "upao"}, "resource_configs": {}}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — lanza una generación real y consume créditos del proveedor LLM |

***FIGURA:055-generacion_start_job.png|POST /api/jobs probado en Swagger UI***

#### **GET /api/jobs/{job_id} — Consultar el estado de un trabajo**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/jobs/{job_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `job_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/jobs/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:056-generacion_get_job_status.png|GET /api/jobs/{job_id} probado en Swagger UI***

#### **POST /api/jobs/{job_id}/cancel — Cancelar un trabajo en curso**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/jobs/{job_id}/cancel` |
| Autenticación | Sí (cookie) |
| Parámetros | `job_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/jobs/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8/cancel' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:057-generacion_cancel_job.png|POST /api/jobs/{job_id}/cancel probado en Swagger UI***

#### **GET /api/jobs/{job_id}/resources/{resource_id}/content — Obtener el contenido de un recurso generado**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/jobs/{job_id}/resources/{resource_id}/content` |
| Autenticación | Sí (cookie) |
| Parámetros | `job_id` (path, obligatorio); `resource_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/jobs/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8/resources/9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d/content' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:058-generacion_get_resource_content.png|GET /api/jobs/{job_id}/resources/{resource_id}/content probado en Swagger UI***

#### **POST /api/jobs/{job_id}/resume — Reanudar un trabajo interrumpido**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/jobs/{job_id}/resume` |
| Autenticación | Sí (cookie) |
| Parámetros | `job_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"resource_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/jobs/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8/resume' -b cookies.txt -H 'Content-Type: application/json' -d '{"resource_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — reanuda una generación real y consume créditos del proveedor LLM |

***FIGURA:059-generacion_resume_job.png|POST /api/jobs/{job_id}/resume probado en Swagger UI***

#### **GET /api/jobs/{job_id}/stream — Seguir el progreso del trabajo por SSE**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/jobs/{job_id}/stream` |
| Autenticación | Sí (cookie) |
| Parámetros | `job_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/jobs/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8/stream' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — abre un flujo SSE que permanece abierto |

***FIGURA:060-generacion_stream_job.png|GET /api/jobs/{job_id}/stream probado en Swagger UI***

#### **POST /api/ovas/{ova_id}/regenerar — Regenerar los recursos de una OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/regenerar` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"prompt": "Redes neuronales para estudiantes de pregrado", "fase_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/regenerar' -b cookies.txt -H 'Content-Type: application/json' -d '{"prompt": "Redes neuronales para estudiantes de pregrado", "fase_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — lanza una regeneración real y consume créditos del proveedor LLM |

***FIGURA:061-generacion_regenerate_ova.png|POST /api/ovas/{ova_id}/regenerar probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/regenerar/{job_id}/progress — Consultar el progreso de una regeneración**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/regenerar/{job_id}/progress` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `job_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/regenerar/3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8/progress' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:062-generacion_get_regen_progress.png|GET /api/ovas/{ova_id}/regenerar/{job_id}/progress probado en Swagger UI***

### **7.2.9 OVA · CRUD (7 endpoints)**

Alta, listado, edición de metadatos, duplicado y borrado de OVA.

#### **GET /api/ovas — Listar las OVA del usuario**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas` |
| Autenticación | Sí (cookie) |
| Parámetros | `page` (query); `limit` (query); `search` (query); `status` (query) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas?page=1&limit=10' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:063-ova_crud_list_ovas.png|GET /api/ovas probado en Swagger UI***

#### **GET /api/ovas/llm-options — Listar los modelos LLM disponibles *(deprecado)***

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/llm-options` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/llm-options' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:064-ova_crud_list_llm_options.png|GET /api/ovas/llm-options probado en Swagger UI***

#### **POST /api/ovas/save — Guardar una OVA generada**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/save` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"prompt": "Redes neuronales para estudiantes de pregrado", "phases": [{"type": "...", "order": "...", "content": "<contenido de la fase en HTML>", "title": "Introducción al Machine Learning", "resource_type_id": "..."}], "upload_ids": []}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/save' -b cookies.txt -H 'Content-Type: application/json' -d '{"prompt": "Redes neuronales para estudiantes de pregrado", "phases": [{"type": "...", "order": "...", "content": "<contenido de la fase en HTML>", "title": "Introducción al Machine Learning", "resource_type_id": "..."}], "upload_ids": []}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:065-ova_crud_save_ova.png|POST /api/ovas/save probado en Swagger UI***

#### **DELETE /api/ovas/{ova_id} — Enviar la OVA a la papelera**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/{ova_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:066-ova_crud_delete_ova.png|DELETE /api/ovas/{ova_id} probado en Swagger UI***

#### **POST /api/ovas/{ova_id}/duplicar — Duplicar una OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/duplicar` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/duplicar' -b cookies.txt` |
| Respuesta esperada | 201 |
| Resultado de la prueba | 201 (verificado en Swagger) |

***FIGURA:067-ova_crud_duplicate_ova.png|POST /api/ovas/{ova_id}/duplicar probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/editar — Obtener la OVA para el editor**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/editar` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/editar' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:068-ova_crud_get_ova_editor.png|GET /api/ovas/{ova_id}/editar probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/metadata — Actualizar los metadatos de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/metadata` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"title": "Introducción al Machine Learning", "description": "OVA sobre aprendizaje supervisado"}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/metadata' -b cookies.txt -H 'Content-Type: application/json' -d '{"title": "Introducción al Machine Learning", "description": "OVA sobre aprendizaje supervisado"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:069-ova_crud_update_ova_metadata.png|PATCH /api/ovas/{ova_id}/metadata probado en Swagger UI***

### **7.2.10 OVA · Fases y versiones (10 endpoints)**

Fases y subelementos de una OVA, su historial de versiones y reversión.

#### **POST /api/ovas/{ova_id}/fases — Añadir una fase a la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/fases` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"phase_type": "...", "prompt": "Redes neuronales para estudiantes de pregrado"}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases' -b cookies.txt -H 'Content-Type: application/json' -d '{"phase_type": "...", "prompt": "Redes neuronales para estudiantes de pregrado"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — genera la fase con el LLM y consume créditos |

***FIGURA:070-ova_fases_y_versiones_add_phase.png|POST /api/ovas/{ova_id}/fases probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/fases/reorder — Reordenar las fases de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/fases/reorder` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"reorders": [{"phase_id": "...", "new_order": "..."}]}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/reorder' -b cookies.txt -H 'Content-Type: application/json' -d '{"reorders": [{"phase_id": "...", "new_order": "..."}]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:071-ova_fases_y_versiones_reorder_phases.png|PATCH /api/ovas/{ova_id}/fases/reorder probado en Swagger UI***

#### **DELETE /api/ovas/{ova_id}/fases/{fase_id} — Eliminar una fase**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/{ova_id}/fases/{fase_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `fase_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/375711b9-2614-4648-93e6-f8f0fc680b09' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:072-ova_fases_y_versiones_delete_phase.png|DELETE /api/ovas/{ova_id}/fases/{fase_id} probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/fases/{fase_id} — Guardar los cambios de una fase**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/fases/{fase_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `fase_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"content": "<contenido de la fase en HTML>"}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/375711b9-2614-4648-93e6-f8f0fc680b09' -b cookies.txt -H 'Content-Type: application/json' -d '{"content": "<contenido de la fase en HTML>"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:073-ova_fases_y_versiones_save_phase.png|PATCH /api/ovas/{ova_id}/fases/{fase_id} probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/fases/{fase_id}/subelementos/{sub_id} — Editar un subelemento de una fase**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/fases/{fase_id}/subelementos/{sub_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `fase_id` (path, obligatorio); `sub_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"subelement_id": "...", "prompt": "Redes neuronales para estudiantes de pregrado"}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/375711b9-2614-4648-93e6-f8f0fc680b09/subelementos/0b0a4f3e-1c2d-4a5b-8c7d-9e0f1a2b3c4d' -b cookies.txt -H 'Content-Type: application/json' -d '{"subelement_id": "...", "prompt": "Redes neuronales para estudiantes de pregrado"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — regenera el subelemento con el LLM y consume créditos |

***FIGURA:074-ova_fases_y_versiones_edit_subelement.png|PATCH /api/ovas/{ova_id}/fases/{fase_id}/subelementos/{sub_id} probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/fases/{fase_id}/versiones — Listar las versiones de una fase**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/fases/{fase_id}/versiones` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `fase_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/375711b9-2614-4648-93e6-f8f0fc680b09/versiones' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:075-ova_fases_y_versiones_list_phase_versions.png|GET /api/ovas/{ova_id}/fases/{fase_id}/versiones probado en Swagger UI***

#### **POST /api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert — Revertir una fase a una versión anterior**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `fase_id` (path, obligatorio); `mvid` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/fases/375711b9-2614-4648-93e6-f8f0fc680b09/versiones/5c9d2f61-3a44-4f0e-9d21-7b6c8e4a1f30/revert' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 404 (verificado en Swagger) |

***FIGURA:076-ova_fases_y_versiones_revert_phase_version.png|POST /api/ovas/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/versiones — Listar las versiones de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/versiones` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/versiones' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:077-ova_fases_y_versiones_list_ova_versions.png|GET /api/ovas/{ova_id}/versiones probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/versiones/diff — Comparar dos versiones de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/versiones/diff` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `v1` (query, obligatorio); `v2` (query, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/versiones/diff?v1=83bcc9a5-bbea-4b1f-a62e-5c2450d2fb9f&v2=22139d7c-64bf-4fd5-a8b7-12b8ef9b034d' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:078-ova_fases_y_versiones_get_version_diff.png|GET /api/ovas/{ova_id}/versiones/diff probado en Swagger UI***

#### **POST /api/ovas/{ova_id}/versiones/{version_id}/revert — Revertir la OVA a una versión anterior**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/versiones/{version_id}/revert` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `version_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/versiones/83bcc9a5-bbea-4b1f-a62e-5c2450d2fb9f/revert' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:079-ova_fases_y_versiones_revert_to_version.png|POST /api/ovas/{ova_id}/versiones/{version_id}/revert probado en Swagger UI***

### **7.2.11 OVA · Chat (5 endpoints)**

Conversación de asistencia asociada a una OVA.

#### **DELETE /api/ovas/{ova_id}/chat — Vaciar el chat de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/{ova_id}/chat` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/chat' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:080-ova_chat_clear_chat.png|DELETE /api/ovas/{ova_id}/chat probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/chat — Obtener el historial de chat de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/chat` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/chat' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:081-ova_chat_get_chat.png|GET /api/ovas/{ova_id}/chat probado en Swagger UI***

#### **POST /api/ovas/{ova_id}/chat — Enviar un mensaje al chat de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/{ova_id}/chat` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"id": "...", "role": "...", "kind": "message", "text": "", "status": "...", "percentage": 1, "resource_labels": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/chat' -b cookies.txt -H 'Content-Type: application/json' -d '{"id": "...", "role": "...", "kind": "message", "text": "", "status": "...", "percentage": 1, "resource_labels": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:082-ova_chat_post_chat.png|POST /api/ovas/{ova_id}/chat probado en Swagger UI***

#### **DELETE /api/ovas/{ova_id}/chat/{message_id} — Eliminar un mensaje del chat**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/{ova_id}/chat/{message_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `message_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/chat/e5bb202c-cb2f-43ae-b196-e625126ac5de' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:083-ova_chat_delete_chat_message.png|DELETE /api/ovas/{ova_id}/chat/{message_id} probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/chat/{message_id} — Editar un mensaje del chat**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/chat/{message_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio); `message_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"text": "...", "status": "...", "percentage": 1, "resource_labels": ["..."]}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/chat/e5bb202c-cb2f-43ae-b196-e625126ac5de' -b cookies.txt -H 'Content-Type: application/json' -d '{"text": "...", "status": "...", "percentage": 1, "resource_labels": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:084-ova_chat_patch_chat.png|PATCH /api/ovas/{ova_id}/chat/{message_id} probado en Swagger UI***

### **7.2.12 OVA · Papelera (7 endpoints)**

Borrado lógico: papelera, restauración y borrado permanente (individual y por lote).

#### **POST /api/ovas/lote/papelera — Enviar varias OVA a la papelera**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/lote/papelera` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"ova_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/lote/papelera' -b cookies.txt -H 'Content-Type: application/json' -d '{"ova_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:085-ova_papelera_batch_move_to_trash.png|POST /api/ovas/lote/papelera probado en Swagger UI***

#### **DELETE /api/ovas/lote/permanente — Eliminar varias OVA de forma permanente**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/lote/permanente` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"ova_ids": ["..."]}` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/lote/permanente' -b cookies.txt -H 'Content-Type: application/json' -d '{"ova_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:086-ova_papelera_batch_permanent_delete.png|DELETE /api/ovas/lote/permanente probado en Swagger UI***

#### **POST /api/ovas/lote/restaurar — Restaurar varias OVA**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/ovas/lote/restaurar` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"ova_ids": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/ovas/lote/restaurar' -b cookies.txt -H 'Content-Type: application/json' -d '{"ova_ids": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:087-ova_papelera_batch_restore.png|POST /api/ovas/lote/restaurar probado en Swagger UI***

#### **GET /api/ovas/papelera — Listar las OVA en la papelera**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/papelera` |
| Autenticación | Sí (cookie) |
| Parámetros | `page` (query); `limit` (query) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/papelera?page=1&limit=10' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:088-ova_papelera_list_trashed_ovas.png|GET /api/ovas/papelera probado en Swagger UI***

#### **GET /api/ovas/papelera/count — Contar las OVA en la papelera**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/papelera/count` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/papelera/count' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:089-ova_papelera_count_trashed_ovas.png|GET /api/ovas/papelera/count probado en Swagger UI***

#### **DELETE /api/ovas/{ova_id}/permanente — Eliminar una OVA de forma permanente**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/ovas/{ova_id}/permanente` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/permanente' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:090-ova_papelera_permanent_delete_ova.png|DELETE /api/ovas/{ova_id}/permanente probado en Swagger UI***

#### **PATCH /api/ovas/{ova_id}/restaurar — Restaurar una OVA de la papelera**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/ovas/{ova_id}/restaurar` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/restaurar' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:091-ova_papelera_restore_ova.png|PATCH /api/ovas/{ova_id}/restaurar probado en Swagger UI***

### **7.2.13 SCORM y descargas (3 endpoints)**

Exportación y descarga del paquete SCORM 1.2 de una OVA.

#### **GET /api/ovas/{ova_id}/download — Descargar la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/download` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/download' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:092-scorm_y_descargas_download_ova.png|GET /api/ovas/{ova_id}/download probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/export-scorm — Exportar la OVA como paquete SCORM 1.2**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/export-scorm` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/export-scorm' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:093-scorm_y_descargas_export_scorm.png|GET /api/ovas/{ova_id}/export-scorm probado en Swagger UI***

#### **GET /api/ovas/{ova_id}/scorm — Descargar el paquete SCORM de la OVA**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/ovas/{ova_id}/scorm` |
| Autenticación | Sí (cookie) |
| Parámetros | `ova_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/ovas/b2f9a15f-5009-4929-bc23-3b9b8af59662/scorm' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:094-scorm_y_descargas_download_ova_scorm.png|GET /api/ovas/{ova_id}/scorm probado en Swagger UI***

### **7.2.14 Documentos y RAG (4 endpoints)**

Subida de documentos de apoyo y consulta de los chunks indexados para RAG.

#### **GET /api/rag/chunks/by-upload/{upload_id} — Listar los chunks indexados de un documento**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/rag/chunks/by-upload/{upload_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `upload_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/rag/chunks/by-upload/71fb80ec-514d-499d-bd35-7af60f7bead1' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:095-documentos_y_rag_list_chunks_by_upload.png|GET /api/rag/chunks/by-upload/{upload_id} probado en Swagger UI***

#### **GET /api/uploads/temp — Listar los documentos temporales subidos**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/uploads/temp` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/uploads/temp' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:096-documentos_y_rag_list_temp_uploads.png|GET /api/uploads/temp probado en Swagger UI***

#### **POST /api/uploads/temp — Subir documentos temporales**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/uploads/temp` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `form-data: files=<archivo>` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/uploads/temp' -b cookies.txt -F 'files=@material.pdf'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — Swagger UI no renderiza el selector de archivos para este cuerpo (OpenAPI 3.1 describe el binario con `contentMediaType` y la interfaz dibuja un campo de texto); se prueba con `curl` |

***FIGURA:097-documentos_y_rag_upload_temp_files.png|POST /api/uploads/temp probado en Swagger UI***

#### **DELETE /api/uploads/temp/{upload_id} — Eliminar un documento temporal**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/uploads/temp/{upload_id}` |
| Autenticación | Sí (cookie) |
| Parámetros | `upload_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/uploads/temp/71fb80ec-514d-499d-bd35-7af60f7bead1' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:098-documentos_y_rag_delete_temp_upload.png|DELETE /api/uploads/temp/{upload_id} probado en Swagger UI***

### **7.2.15 Analítica (1 endpoints)**

Métricas agregadas de uso del usuario autenticado.

#### **GET /api/users/analytics — Obtener las métricas de uso del usuario**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/analytics` |
| Autenticación | Sí (cookie) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/analytics' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:099-analitica_analytics.png|GET /api/users/analytics probado en Swagger UI***

### **7.2.16 Admin · Usuarios (8 endpoints)**

Gestión de usuarios por administrador: listado, perfil, rol, estado, desbloqueo y vínculos de cualquier usuario.

#### **GET /api/users — Listar los usuarios de la plataforma**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users` |
| Autenticación | Sí (admin) |
| Parámetros | `page` (query); `limit` (query) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users?page=1&limit=10' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:100-admin_usuarios_get_users.png|GET /api/users probado en Swagger UI***

#### **GET /api/users/links/admin — Listar todos los vínculos**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/users/links/admin` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/users/links/admin' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:101-admin_usuarios_list_all_links.png|GET /api/users/links/admin probado en Swagger UI***

#### **DELETE /api/users/links/admin/{link_id} — Eliminar cualquier vínculo**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/users/links/admin/{link_id}` |
| Autenticación | Sí (admin) |
| Parámetros | `link_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/users/links/admin/2d1c3b4a-5f6e-4d7c-8b9a-0f1e2d3c4b5a' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:102-admin_usuarios_delete_any_link.png|DELETE /api/users/links/admin/{link_id} probado en Swagger UI***

#### **PATCH /api/users/{user_id} — Actualizar el perfil de un usuario**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/users/{user_id}` |
| Autenticación | Sí (admin) |
| Parámetros | `user_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"full_name": "Juan Diego Carranza", "email": "docente@upao.edu.pe", "university_id": 1, "gender": "...", "phone_number": "..."}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/users/f57876ec-142f-4362-83d3-d9761566101d' -b cookies.txt -H 'Content-Type: application/json' -d '{"full_name": "Juan Diego Carranza", "email": "docente@upao.edu.pe", "university_id": 1, "gender": "...", "phone_number": "..."}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:103-admin_usuarios_update_user_profile.png|PATCH /api/users/{user_id} probado en Swagger UI***

#### **POST /api/users/{user_id}/reset-password-email — Enviar correo de restablecimiento a un usuario**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/{user_id}/reset-password-email` |
| Autenticación | Sí (admin) |
| Parámetros | `user_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/f57876ec-142f-4362-83d3-d9761566101d/reset-password-email' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — envía un correo real al usuario indicado |

***FIGURA:104-admin_usuarios_trigger_reset_email.png|POST /api/users/{user_id}/reset-password-email probado en Swagger UI***

#### **PATCH /api/users/{user_id}/role — Cambiar el rol de un usuario**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/users/{user_id}/role` |
| Autenticación | Sí (admin) |
| Parámetros | `user_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"role_id": "<uuid del rol>"}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/users/f57876ec-142f-4362-83d3-d9761566101d/role' -b cookies.txt -H 'Content-Type: application/json' -d '{"role_id": "<uuid del rol>"}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:105-admin_usuarios_update_user_role.png|PATCH /api/users/{user_id}/role probado en Swagger UI***

#### **PATCH /api/users/{user_id}/status — Activar o desactivar un usuario**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/users/{user_id}/status` |
| Autenticación | Sí (admin) |
| Parámetros | `user_id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"is_active": true}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/users/f57876ec-142f-4362-83d3-d9761566101d/status' -b cookies.txt -H 'Content-Type: application/json' -d '{"is_active": true}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:106-admin_usuarios_update_user_status.png|PATCH /api/users/{user_id}/status probado en Swagger UI***

#### **POST /api/users/{user_id}/unlock — Desbloquear un usuario**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/users/{user_id}/unlock` |
| Autenticación | Sí (admin) |
| Parámetros | `user_id` (path, obligatorio) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/users/f57876ec-142f-4362-83d3-d9761566101d/unlock' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:107-admin_usuarios_unlock_user.png|POST /api/users/{user_id}/unlock probado en Swagger UI***

### **7.2.17 Admin · Roles (4 endpoints)**

Roles y permisos de la plataforma.

#### **GET /api/roles — Listar los roles**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/roles` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/roles' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:108-admin_roles_get_roles.png|GET /api/roles probado en Swagger UI***

#### **POST /api/roles — Crear un rol**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/roles` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{"name": "profesor", "description": "OVA sobre aprendizaje supervisado", "permissions": ["..."]}` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/roles' -b cookies.txt -H 'Content-Type: application/json' -d '{"name": "profesor", "description": "OVA sobre aprendizaje supervisado", "permissions": ["..."]}'` |
| Respuesta esperada | 201 |
| Resultado de la prueba | 201 (verificado en Swagger) |

***FIGURA:109-admin_roles_create_role.png|POST /api/roles probado en Swagger UI***

#### **DELETE /api/roles/{id} — Eliminar un rol**

| Campo | Valor |
| ----- | ----- |
| Método | DELETE |
| URL | `/api/roles/{id}` |
| Autenticación | Sí (admin) |
| Parámetros | `id` (path, obligatorio); `reassign_to_id` (query) |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X DELETE 'http://localhost:8000/api/roles/7c1e9a52-64b0-4f18-9f3c-2a0d5e8b7c41?reassign_to_id=7c1e9a52-64b0-4f18-9f3c-2a0d5e8b7c41' -b cookies.txt` |
| Respuesta esperada | 204 |
| Resultado de la prueba | 204 (verificado en Swagger) |

***FIGURA:110-admin_roles_delete_role.png|DELETE /api/roles/{id} probado en Swagger UI***

#### **PATCH /api/roles/{id} — Actualizar un rol**

| Campo | Valor |
| ----- | ----- |
| Método | PATCH |
| URL | `/api/roles/{id}` |
| Autenticación | Sí (admin) |
| Parámetros | `id` (path, obligatorio) |
| Cuerpo de ejemplo | `{"name": "profesor", "description": "OVA sobre aprendizaje supervisado", "permissions": ["..."]}` |
| Ejemplo de uso | `curl -X PATCH 'http://localhost:8000/api/roles/7c1e9a52-64b0-4f18-9f3c-2a0d5e8b7c41' -b cookies.txt -H 'Content-Type: application/json' -d '{"name": "profesor", "description": "OVA sobre aprendizaje supervisado", "permissions": ["..."]}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:111-admin_roles_update_role.png|PATCH /api/roles/{id} probado en Swagger UI***

### **7.2.18 Admin · Plataforma (9 endpoints)**

Configuración global: modelos LLM, nodos del motor, modo de registro y refresco del catálogo.

#### **GET /api/admin/llm-config — Obtener la configuración global de LLM**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/admin/llm-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/admin/llm-config' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:112-admin_plataforma_get_llm_config.png|GET /api/admin/llm-config probado en Swagger UI***

#### **PUT /api/admin/llm-config — Actualizar la configuración global de LLM**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/admin/llm-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/admin/llm-config' -b cookies.txt -H 'Content-Type: application/json' -d '{}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — modifica la configuración global de la plataforma |

***FIGURA:113-admin_plataforma_put_llm_config.png|PUT /api/admin/llm-config probado en Swagger UI***

#### **GET /api/admin/nodes-config — Obtener la configuración de nodos del motor**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/admin/nodes-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/admin/nodes-config' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:114-admin_plataforma_get_nodes_config_endpoint.png|GET /api/admin/nodes-config probado en Swagger UI***

#### **PUT /api/admin/nodes-config — Actualizar la configuración de nodos del motor**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/admin/nodes-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/admin/nodes-config' -b cookies.txt -H 'Content-Type: application/json' -d '{}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — modifica la configuración global de la plataforma |

***FIGURA:115-admin_plataforma_put_nodes_config_endpoint.png|PUT /api/admin/nodes-config probado en Swagger UI***

#### **GET /api/admin/platform-config — Obtener la configuración de la plataforma**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/admin/platform-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/admin/platform-config' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:116-admin_plataforma_get_platform_config.png|GET /api/admin/platform-config probado en Swagger UI***

#### **PUT /api/admin/platform-config — Actualizar la configuración de la plataforma**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/admin/platform-config` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/admin/platform-config' -b cookies.txt -H 'Content-Type: application/json' -d '{}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — modifica la configuración global de la plataforma |

***FIGURA:117-admin_plataforma_put_platform_config.png|PUT /api/admin/platform-config probado en Swagger UI***

#### **POST /api/admin/refresh-catalog — Refrescar el catálogo global de modelos**

| Campo | Valor |
| ----- | ----- |
| Método | POST |
| URL | `/api/admin/refresh-catalog` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X POST 'http://localhost:8000/api/admin/refresh-catalog' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:118-admin_plataforma_admin_refresh_catalog.png|POST /api/admin/refresh-catalog probado en Swagger UI***

#### **GET /api/admin/registration-mode — Obtener el modo de registro**

| Campo | Valor |
| ----- | ----- |
| Método | GET |
| URL | `/api/admin/registration-mode` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `(sin body)` |
| Ejemplo de uso | `curl -X GET 'http://localhost:8000/api/admin/registration-mode' -b cookies.txt` |
| Respuesta esperada | 200 |
| Resultado de la prueba | 200 (verificado en Swagger) |

***FIGURA:119-admin_plataforma_get_registration_mode.png|GET /api/admin/registration-mode probado en Swagger UI***

#### **PUT /api/admin/registration-mode — Actualizar el modo de registro**

| Campo | Valor |
| ----- | ----- |
| Método | PUT |
| URL | `/api/admin/registration-mode` |
| Autenticación | Sí (admin) |
| Parámetros | — |
| Cuerpo de ejemplo | `{}` |
| Ejemplo de uso | `curl -X PUT 'http://localhost:8000/api/admin/registration-mode' -b cookies.txt -H 'Content-Type: application/json' -d '{}'` |
| Respuesta esperada | 200 |
| Resultado de la prueba | No ejecutado — modifica la configuración global de la plataforma |

***FIGURA:120-admin_plataforma_put_registration_mode.png|PUT /api/admin/registration-mode probado en Swagger UI***

## **7.3 Alcance y limitaciones de la prueba**

De las 120 operaciones, 99 se ejecutaron realmente contra el backend desde Swagger UI. Las restantes se documentan con la petición preparada (parámetros y cuerpo rellenados) pero sin pulsar *Execute*, por los motivos que se listan a continuación.

***Tabla 10\. Operaciones documentadas sin ejecutar y motivo***

| Operación | Motivo |
| ----- | ----- |
| `DELETE /api/users/me` | borra la cuenta con la que se está probando |
| `POST /api/users/me/change-password` | cambiaría la contraseña de la cuenta de prueba |
| `PUT /api/users/me/api-keys` | sobrescribiría las claves de API del usuario |
| `POST /api/users/me/links/invite` | envía un correo real de invitación |
| `POST /api/agents/elaborate/generate` | genera contenido con el LLM y consume créditos |
| `POST /api/agents/engage/generate` | genera contenido con el LLM y consume créditos |
| `POST /api/agents/evaluate/generate` | genera contenido con el LLM y consume créditos |
| `POST /api/agents/explain/generate` | genera contenido con el LLM y consume créditos |
| `POST /api/agents/explore/generate` | genera contenido con el LLM y consume créditos |
| `POST /api/jobs` | lanza una generación real y consume créditos del proveedor LLM |
| `POST /api/jobs/{job_id}/resume` | reanuda una generación real y consume créditos del proveedor LLM |
| `GET /api/jobs/{job_id}/stream` | abre un flujo SSE que permanece abierto |
| `POST /api/ovas/{ova_id}/regenerar` | lanza una regeneración real y consume créditos del proveedor LLM |
| `POST /api/ovas/{ova_id}/fases` | genera la fase con el LLM y consume créditos |
| `PATCH /api/ovas/{ova_id}/fases/{fase_id}/subelementos/{sub_id}` | regenera el subelemento con el LLM y consume créditos |
| `POST /api/uploads/temp` | Swagger UI no renderiza el selector de archivos para este cuerpo (OpenAPI 3.1 describe el binario con `contentMediaType` y la interfaz dibuja un campo de texto); se prueba con `curl` |
| `POST /api/users/{user_id}/reset-password-email` | envía un correo real al usuario indicado |
| `PUT /api/admin/llm-config` | modifica la configuración global de la plataforma |
| `PUT /api/admin/nodes-config` | modifica la configuración global de la plataforma |
| `PUT /api/admin/platform-config` | modifica la configuración global de la plataforma |
| `PUT /api/admin/registration-mode` | modifica la configuración global de la plataforma |

Notas adicionales sobre los códigos obtenidos:

●   	Los endpoints de **Generación** devuelven 404 porque la corrida de pruebas no lanzó ningún trabajo real (evita consumir créditos del proveedor LLM); el 404 documenta la respuesta ante un `job_id` inexistente.
●   	`POST /api/auth/reset-password`, `POST /api/auth/verify-email` y los endpoints TOTP devuelven 400/401 porque se probaron con tokens y códigos inválidos a propósito: documentan la validación, no un fallo.
●   	`POST /api/users/me/links/accept` devuelve 400 al intentar aceptar un código propio, que es la validación esperada.
●   	Las pruebas se ejecutaron sobre una OVA de demostración creada al vuelo (`POST /api/ovas/save`) y sobre cuentas sembradas; ninguna operación destructiva se ejecutó sobre datos reales.

# 

# **8\. Comandos útiles de referencia**

## **8.1 Scripts disponibles (raíz del monorepo)**

| Comando | Acción |
| ----- | ----- |
| pnpm dev | Frontend en modo desarrollo |
| pnpm build | Build de producción del frontend |
| pnpm preview | Previsualiza el build (http://localhost:4173) |
| pnpm lint | ESLint sobre el frontend (typescript-eslint strict \+ angular-eslint) |
| pnpm format | Prettier sobre el frontend |
| pnpm test:unit | Pruebas unitarias BDD (cucumber-js, sin navegador ni backend) |
| pnpm \--filter frontend test | Pruebas de componente (Vitest \+ Testing Library) |
| pnpm \--filter frontend typecheck | Chequeo de tipos Angular (ngc \--noEmit, incluye templates) |
| pnpm dev:docker | Levanta todo el stack con Docker (desarrollo) |
| pnpm prod:docker | Levanta todo el stack con Docker (producción) |

## **8.2 Comandos del backend**

\# Lint \+ format (desde backend/)  
 ruff check .        	\# con pip: pip install ruff  
 ruff format .  
 ruff check \--fix .

 \# Equivalente con uv (sin activar el entorno virtual)  
 uv run ruff check .  
 uv run ruff format .

 \# Pruebas automatizadas  
 pytest              	\# con pip  
 uv run pytest       	\# con uv

 \# Pruebas manuales contra una API en ejecución (no mockeada):  
 python tests/test\_agents\_io.py  
 python tests/test\_resource\_quality.py  
 python tests/test\_rag\_uploads.py

Las pruebas manuales anteriores aceptan variables de entorno de override: BASE, EMAIL, PASS, PHASE, TYPE, CONCEPT, para apuntar a un backend específico y probar una fase/tipo de recurso puntual sin pasar por la interfaz web.

## **8.3 Solución de problemas comunes**

***Tabla 8\. Errores frecuentes y su causa más probable***

| Síntoma | Causa probable | Solución |
| ----- | ----- | ----- |
| El backend no arranca: error sobre JWT\_SECRET | JWT\_SECRET vacío o con un valor débil conocido | Generar uno nuevo: python \-c "import secrets; print(secrets.token\_urlsafe(48))" |
| Error de conexión a base de datos bajo carga | Se está usando el pooler de Sesiones en vez del de Transacciones | Verificar que DATABASE\_URL usa el puerto 6543 (Transaction pooler), no el 5432 de Sesiones |
| Los .zip SCORM desaparecen al reiniciar el backend | Supabase Storage no está configurado; el sistema cae a disco local efímero | Configurar SUPABASE\_URL, SUPABASE\_SERVICE\_ROLE\_KEY y crear el bucket scorm-packages |
| No llegan correos de restablecimiento de contraseña | SMTP\_USER/SMTP\_PASSWORD no configuradas (EmailNotConfigured) | Configurar una App Password de Gmail, no la contraseña normal de la cuenta |
| Cookie de sesión no se guarda en el navegador (frontend y backend en dominios distintos) | COOKIE\_SAMESITE en su valor por defecto (lax), que bloquea cookies entre sitios | Configurar COOKIE\_SAMESITE=none (activa Secure=True automáticamente) |
| CORS bloquea las peticiones del frontend en producción | CORS\_ORIGINS no incluye el origen exacto del frontend desplegado | Definir CORS\_ORIGINS con la URL exacta de Vercel (incluyendo https://) |
| GET /api/rag/health responde pgvector\_ready: false | La extensión vector no se creó, o RAG\_DISABLED=1 | Revisar que las migraciones corrieron sin error; confirmar RAG\_DISABLED no está activo |

 


