# Plan de Despliegue 100% Gratuito (Free Tier)

Para llevar el sistema "Municipalidad Valle del Sol" a producción sin costo, dividiremos el proyecto en 3 servicios gratuitos en la nube. Esta arquitectura reemplaza el `docker-compose` local por servicios administrados.

## 1. Base de Datos: Neon.tech o Supabase (PostgreSQL + PostGIS)
Ambas plataformas ofrecen PostgreSQL serverless gratuito con soporte para datos geoespaciales.

**Pasos (Ejemplo con Supabase):**
1. Crea una cuenta en [Supabase](https://supabase.com) y crea un nuevo proyecto.
2. Ve a la sección **Database** -> **Extensions** y busca/habilita `postgis`.
3. Ve a **Project Settings** -> **Database** y copia tu URI de conexión (Connection String) de la base de datos (asegúrate de poner tu contraseña).
4. En Supabase, abre el "SQL Editor" y pega el contenido de todos tus scripts ubicados en `db/init/` (en orden, del 01 al 06) y ejecútalos para crear tus tablas, tipos y datos de prueba.

## 2. Backend (Spring Boot): Back4App Containers
Dado que Render y Koyeb ahora exigen verificación con tarjeta de crédito para evitar abusos, la mejor alternativa 100% gratuita que **NO PIDE TARJETA** es **[Back4App Containers](https://www.back4app.com/containers)**.

**Pasos en Back4App:**
1. Sube tu código (la carpeta `back`) a un repositorio en GitHub.
2. Entra a [Back4App Containers](https://www.back4app.com/containers) y haz clic en "Sign up". Regístrate con tu cuenta de GitHub.
3. Haz clic en **"New App"** -> **"Container as a Service"**.
4. Conecta tu repositorio de GitHub donde tienes el backend.
5. Back4App detectará automáticamente el `Dockerfile`. 
6. En el paso de configuración, pon las **Environment Variables** (variables de entorno):
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `DATABASE_URL`: `jdbc:postgresql://<URL_DE_SUPABASE>:5432/postgres` (Reemplaza con la URL que te dio Supabase).
   - `DB_USER`: `postgres`
   - `DB_PASSWORD`: `tu_contraseña_de_supabase`
   - `JWT_SECRET`: `cualquier_cadena_larga_en_base64_segura`
   - `FRONTEND_URL`: `https://tu-frontend-en-vercel.vercel.app` (Cámbialo después de subir el frontend).
7. En el apartado de "Port" escribe `8080`.
8. Selecciona el Free Tier y haz clic en **Create App**. 
9. Espera unos minutos a que se compile tu imagen Docker y se lance. Obtendrás una URL pública como `https://tu-app.b4a.run`.

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
