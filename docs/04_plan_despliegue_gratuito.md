# Plan de Despliegue 100% Gratuito (Free Tier)

Para llevar el sistema "Municipalidad Valle del Sol" a producción sin costo, dividiremos el proyecto en 3 servicios gratuitos en la nube. Esta arquitectura reemplaza el `docker-compose` local por servicios administrados.

## 1. Base de Datos: Neon.tech o Supabase (PostgreSQL + PostGIS)
Ambas plataformas ofrecen PostgreSQL serverless gratuito con soporte para datos geoespaciales.

**Pasos (Ejemplo con Supabase):**
1. Crea una cuenta en [Supabase](https://supabase.com) y crea un nuevo proyecto.
2. Ve a la sección **Database** -> **Extensions** y busca/habilita `postgis`.
3. Ve a **Project Settings** -> **Database** y copia tu URI de conexión (Connection String) de la base de datos (asegúrate de poner tu contraseña).
4. En Supabase, abre el "SQL Editor" y pega el contenido de todos tus scripts ubicados en `db/init/` (en orden, del 01 al 06) y ejecútalos para crear tus tablas, tipos y datos de prueba.

## 2. Backend (Spring Boot): Render.com o Koyeb
Spring Boot requiere un entorno que soporte Docker o Java. [Render.com](https://render.com) es la opción más sencilla para esto en su capa gratuita.

**Pasos en Render:**
1. Sube tu código (la carpeta `back`) a un repositorio en GitHub.
2. Crea una cuenta en Render e inicia un nuevo **"Web Service"**.
3. Conecta tu repositorio de GitHub.
4. Render detectará automáticamente el `Dockerfile` que creamos en la carpeta `back`.
5. En la sección **Environment Variables**, configura las variables de entorno de producción:
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `DATABASE_URL`: `jdbc:postgresql://<URL_DE_SUPABASE>:5432/postgres` (OJO: cambia `jdbc:postgresql://` por la URL que te dio Supabase).
   - `DB_USER`: `postgres`
   - `DB_PASSWORD`: `tu_contraseña_de_supabase`
   - `JWT_SECRET`: `cualquier_cadena_larga_en_base64_segura`
   - `FRONTEND_URL`: `https://tu-frontend-en-vercel.vercel.app` (Cámbialo después de subir el frontend).
6. Haz clic en **Deploy**. Render construirá el contenedor de Java y te dará una URL pública (ej. `https://valle-del-sol-api.onrender.com`).
   *Nota: El tier gratuito de Render "duerme" la API si no recibe tráfico en 15 minutos. El primer request después de dormir tardará unos 30 segundos en responder.*

## 3. Frontend (React/Vite): Vercel
[Vercel](https://vercel.com) es la mejor plataforma gratuita para desplegar sitios web estáticos y aplicaciones React.

**Pasos en Vercel:**
1. Sube tu código (la carpeta `front/vite-project`) a GitHub.
2. Entra a Vercel, haz clic en **"Add New Project"** y conecta el repositorio de GitHub.
3. Elige el directorio raíz si te lo pide (`front/vite-project`). Vercel detectará automáticamente que es un proyecto Vite.
4. En la sección **Environment Variables**, añade:
   - `VITE_API_URL`: `https://valle-del-sol-api.onrender.com` (La URL que te dio Render).
5. Haz clic en **Deploy**. En 1 minuto tendrás tu frontend en vivo con una URL HTTPS segura.

---

### Resumen del Flujo de Trabajo para Producción:
1. **Git:** Debes subir todo tu proyecto local (excluyendo carpetas `node_modules`, `target`, y la carpeta `db` si lo deseas) a GitHub.
2. **Aprovisionar BD:** Configura la DB en la nube y ejecuta los scripts SQL.
3. **Backend Cloud:** Despliega en Render conectándolo a la DB en la nube. Toma nota de la URL.
4. **Frontend Cloud:** Despliega en Vercel, pasándole la URL del backend como variable de entorno.

Con esto, el ecosistema completo queda 100% cloud, gratuito y listo para ser presentado en tu evaluación, funcionando exactamente igual a como lo probamos hoy en Docker.
