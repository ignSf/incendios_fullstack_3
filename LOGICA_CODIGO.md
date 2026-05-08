# Lógica Interna del Sistema de Incendios — Frontend y Backend

Este documento explica de forma detallada cómo interactúan y funcionan internamente los distintos módulos del proyecto, abarcando desde que el usuario hace clic en un botón en el navegador hasta que los datos persisten en la base de datos y se notifican al resto del sistema.

---

## 1. Lógica del Backend (Java / Spring Boot)

El backend funciona bajo una arquitectura clásica de 3 capas: **Controlador (API) → Servicio (Lógica de Negocio) → Repositorio (Base de Datos)**.

### A. Autenticación y Seguridad (JWT)
1. **Registro / Login:** Cuando un usuario inicia sesión (`AuthController`), el `AuthService` busca el email en la base de datos y verifica que la contraseña coincida utilizando `BCrypt` (un algoritmo de hashing seguro).
2. **Generación del Token:** Si todo es correcto, `JwtUtil` genera un token JWT firmado con una clave secreta. Este token contiene el email y el **Rol** (CIUDADANO, ADMIN, o BRIGADISTA).
3. **Validación (Filtro):** Cada vez que el frontend hace una petición a una ruta protegida (ej: ver dashboard), la petición pasa primero por `JwtAuthFilter`. Este filtro intercepta la solicitud, extrae el token, verifica que no esté expirado, y si es válido, "deja pasar" la petición hacia los Controladores, identificando internamente qué usuario está haciendo la acción.

### B. Creación de un Reporte y la IA
Esta es la función más compleja del backend (`ReporteService.crear`). Ocurre en estos pasos:
1. **Recepción Multipart:** El controlador recibe un JSON con los datos del incendio (latitud, descripción, etc) y un archivo adjunto que es la foto.
2. **Almacenamiento (StorageService):** El archivo se guarda temporalmente en una carpeta del servidor (`/uploads/...`) y se obtiene su ruta.
3. **Clasificación IA (IAService):** El sistema toma esa ruta de la foto y le envía un JSON a la API externa de **HuggingFace** (`/api/predict`).
4. **Respuesta IA:** HuggingFace procesa la foto con el modelo CNN (EfficientNet-B0) y XGBoost, y devuelve un nivel del 1 al 5 y un % de confianza.
5. **Guardado (Base de Datos):** Con el nivel ya calculado, se crea el objeto `Reporte` y se guarda en PostgreSQL (`reporteRepository.save`).
6. **Notificación en Tiempo Real:** Justo antes de terminar, el `WebSocketService` toma el reporte recién guardado y lo "grita" (broadcast) a través de un canal STOMP al que están suscritos todos los usuarios conectados.

### C. Lógica de Base de Datos (PostGIS y Triggers)
El repositorio no es solo un almacén tonto, la base de datos (PostgreSQL) tiene inteligencia propia:
*   **Trigger de Ubicación:** Cuando insertas la latitud y longitud, un Trigger de SQL detecta el evento y automáticamente genera un punto geoespacial complejo (`ST_MakePoint`) en la columna `ubicacion`. Esto permite luego buscar incendios cercanos midiendo la distancia en metros reales, tomando en cuenta la curvatura de la tierra.
*   **Trigger de Historial:** Cada vez que un reporte cambia su columna `estado` (de PENDIENTE a CONTROLADO), otro Trigger detecta el `UPDATE` y crea automáticamente un registro en la tabla `historial_estados` para auditoría.

### D. WebSocket (STOMP sobre SockJS)
A diferencia de una petición HTTP donde el cliente pregunta y el servidor responde, el WebSocket mantiene un túnel abierto. 
El `WebSocketConfig.java` crea un "Broker" de mensajes en la ruta `/topic`. El servidor usa este túnel para empujar datos al cliente sin que el cliente los pida, permitiendo notificar inmediatamente cuando hay nuevos reportes, cambios de estado o alertas críticas.

---

## 2. Lógica del Frontend (React + Vite)

El frontend está estructurado mediante componentes funcionales y "Custom Hooks" que separan la lógica visual del comportamiento del sistema.

### A. Contexto de Autenticación (`AuthContext`)
1. **Estado Global:** Envolvemos toda la aplicación en un `AuthProvider`. Este contexto maneja si el usuario está logueado, sus datos, y su rol.
2. **Persistencia:** Al iniciar sesión, el token recibido del backend se guarda en `localStorage`. Cuando recargas la página web, React lee el localStorage, extrae el token y llama a `/api/auth/me` para reconstruir la sesión sin pedir usuario y clave otra vez.
3. **Rutas Protegidas (`ProtectedRoute`):** Antes de mostrar un componente (ej. Dashboard), este componente de seguridad verifica el rol en el Contexto. Si no eres ADMIN, te bloquea y te redirige a la portada.

### B. Comunicación en Tiempo Real (`useRealtime.ts`)
Este "Hook" personalizado es el corazón de la interactividad.
1. **Conexión:** Al abrir la web, se ejecuta la conexión SockJS hacia el backend.
2. **Suscripciones:** Se suscribe a dos canales clave:
   *   `/topic/reportes`: Cuando entra un mensaje aquí, React añade el nuevo reporte a la lista global de reportes, haciendo que el mapa dibuje un nuevo marcador en vivo.
   *   `/topic/alertas`: Si entra un mensaje aquí, React activa un banner de alerta rojo en la pantalla que se auto-cierra después de 10 segundos (`setTimeout`).
3. **Reconexión Automática:** Si el backend se cae o hay un parpadeo de internet, la lógica subyacente (`stompClient`) intenta reconectarse cada 5 segundos.

### C. Mapas y Geolocalización
La vista principal une varias lógicas:
1. **GPS Local (`useGeolocation.ts`):** Usa el API de `navigator.geolocation` del navegador. Le pide permiso al usuario y, si acepta, obtiene la latitud y longitud actual del celular/computadora con alta precisión.
2. **Renderizado del Mapa (`FireMap`):** Utiliza Leaflet para dibujar el mapa cartográfico. Mediante un `useEffect`, cuando cambia la lista de reportes (ej. llega uno nuevo por WebSocket), Leaflet destruye los marcadores anteriores y pinta los nuevos usando iconos condicionales dependiendo de la gravedad del incendio (verde, amarillo, naranja, rojo, negro).

### D. Cliente API (`api.ts`)
Para no repetir código, todas las llamadas al servidor (REST) pasan por aquí.
*   **Interceptors:** Antes de que la petición HTTP salga de tu navegador hacia Railway, este cliente inyecta automáticamente el "Token JWT" en las cabeceras (`Authorization: Bearer <token>`). Así el backend siempre sabe quién eres.
*   También se encarga de manejar automáticamente si lo que se está enviando es un JSON normal o un archivo adjunto (`FormData` para las fotos).

---

## 3. Guía de Defensa (Preguntas que te podrían hacer)

Para defender el proyecto con seguridad, además de saber *qué* hace el código, debes saber explicar *por qué* lo hicieron de esta manera. Aquí tienes preguntas típicas que hacen los profesores explicadas con analogías fáciles:

### 1. "Si miles de personas miran el mapa al mismo tiempo, ¿se cae la aplicación?"
**Respuesta para defender:** "No, porque nuestro diseño es escalable. Usamos **WebSockets** (`STOMP`), lo que significa que el servidor no tiene que responder a miles de peticiones HTTP por segundo preguntando '¿hay incendios nuevos?'. El túnel está abierto y el servidor solo empuja datos cuando realmente hay un cambio. Además, usamos la CDN de **Vercel** que distribuye la carga del lado del usuario, y **Supabase** (que es PostgreSQL en la nube) tiene 'Connection Pooling' para aguantar tráfico intenso en base de datos".

### 2. "¿Por qué separaron el Frontend y el Backend en proyectos y plataformas distintas?"
**Respuesta para defender:** "Por un principio de arquitectura moderna (Microservicios / Desacoplamiento). Si el servidor de React colapsa por una falla de interfaz, nuestro servidor principal de Java y Base de Datos sigue intacto y las alertas de emergencia siguen funcionando. Además, nos permitió usar la mejor herramienta para cada cosa: **Vercel** es el líder para React, y **Railway** es excelente levantando contenedores de Java (Docker)".

### 3. "¿Qué pasa si el servidor de Inteligencia Artificial falla o se cae?"
**Respuesta para defender:** "El sistema **NO se rompe**. Implementamos un concepto llamado 'Degradación Elegante' (*Graceful Degradation*). En el servicio `ReporteService.java`, tenemos la llamada a HuggingFace envuelta en un bloque `try-catch`. Si la IA no responde o da error de red, el sistema captura el error internamente y guarda el reporte igual (con gravedad `null` para revisión humana) en lugar de mostrarle una pantalla de error al ciudadano en la calle".

### 4. "¿Cómo garantizan que cualquier persona no llene el mapa de incendios falsos usando un script/bot?"
**Respuesta para defender:** "Tenemos múltiples barreras de seguridad. Primero, nuestro filtro `JwtAuthFilter` en Spring Boot bloquea en milisegundos cualquier intento de enviar reportes si la petición no incluye un **Token JWT** válido. Es decir, obligamos a estar logueado. En el Frontend, el usuario no puede escribir su ubicación a mano para fingir estar en otro lado: nuestro hook `useGeolocation` extrae el GPS directamente de los sensores de hardware de su celular o computadora".

### 5. "Dime en palabras simples, ¿qué hace exactamente el JWT (JSON Web Token)?"
**Respuesta para defender:** "El JWT es como la **pulsera VIP** de una discoteca. Cuando el usuario pone bien su correo y clave en el login, Java genera esta pulsera firmada digitalmente y se la entrega a React. De ahí en adelante, cada vez que React le pide algo a Java (ej. 'dame el dashboard'), el interceptor en `api.ts` le muestra la pulsera. Java solo mira la firma de la pulsera, verifica que sea real y ve el Rol (ej: ADMIN) escrito en ella, sin tener que ir a buscar a la base de datos en cada clic para comprobar la contraseña. Esto hace el sistema rapidísimo y *stateless*".

### 6. "¿Por qué se complicaron instalando la extensión PostGIS en vez de guardar latitud y longitud como simples números decimales?"
**Respuesta para defender:** "Guardar números normales (Double) solo sirve para 'pintar' un punto en la pantalla. Pero la Tierra es redonda. Si a futuro queremos que el sistema le mande un aviso a los brigadistas que están en un radio exacto de 5 kilómetros del fuego, con números normales el cálculo matemático en código es lento y complejo. Con **PostGIS**, la base de datos tiene inteligencia geoespacial y podemos hacer eso con un simple comando SQL (`ST_DWithin`) en fracciones de segundo".

---

## 4. Guion para la Presentación (El "Speech" Diapositiva por Diapositiva)

A continuación, un guion sugerido para acompañar tu presentación de PowerPoint. Úsalo como base, hablando de forma natural y segura.

**[Slide 1: Portada]**
> "Hola a todos, buenos días/tardes. Somos Ignacio Salazar y Javier Quiroga, y hoy les vamos a presentar nuestro proyecto semestral para DuocUC: El 'Sistema de Gestión de Incendios Fullstack' desarrollado para la Municipalidad Valle del Sol. Esta es una plataforma diseñada para centralizar, agilizar y modernizar la forma en que se manejan las emergencias forestales."

**[Slide 2: Introducción]**
> "La problemática principal que identificamos en la Municipalidad era la lentitud de los reportes, la falta de clasificación automática y la nula visibilidad en tiempo real para coordinar brigadistas. Por eso, propusimos una solución integral: una aplicación web donde el ciudadano reporta con foto y GPS, una IA que clasifica la urgencia en segundos, y un mapa en vivo para que los administradores tomen decisiones sin tener que refrescar la página."

**[Slide 3: Servicios Utilizados (Cloud)]**
> "Para que nuestro sistema sea moderno y escalable, descartamos servidores locales y nos fuimos directo a la nube. El Frontend lo desplegamos en **Vercel** por su increíble velocidad con React. El Backend en Java lo contenerizamos y lo subimos a **Railway**, que se encarga de escalarlo automáticamente. Nuestra base de datos vive en **Supabase** (un PostgreSQL robusto y manejado), y nuestro modelo de Inteligencia Artificial está alojado como un microservicio en **HuggingFace Spaces**."

**[Slide 4: Tecnologías Utilizadas]**
> "Hablando del código, elegimos un stack muy potente. En el lado visual usamos **React 19 con TypeScript y Vite** para asegurar un tipado estricto y mapas fluidos con Leaflet. El cerebro del sistema (backend) corre sobre **Java 21 y Spring Boot**, dándonos robustez corporativa. Para la base de datos, no nos quedamos con datos simples, activamos la extensión **PostGIS** para trabajar con cálculos geográficos reales. Y finalmente, nuestra IA utiliza una red neuronal **CNN (EfficientNet)** respaldada por XGBoost."

**[Slide 5: Arquitectura (3 Capas + IA)]**
> "Nuestro sistema sigue el patrón de 3 capas. A la izquierda tenemos la Capa de Presentación (React) que se comunica vía REST y WebSockets con la Capa Lógica (Spring Boot). Java actúa como un orquestador: recibe peticiones, va a la Capa de Datos (PostgreSQL) para consultar o escribir información usando STOMP para notificar los cambios. Adicionalmente, el backend se conecta de forma externa a la API de Gradio en HuggingFace, aislando la carga del procesamiento de la IA del servidor principal."

**[Slide 6: Arquitectura de los Códigos]**
> "Internamente, el código está muy ordenado. En Java, separamos responsabilidades estrictamente: *Controllers* solo reciben peticiones HTTP, *Services* procesan la lógica compleja (como subir fotos o pedir la IA), y *Repositories* hablan con la base de datos. En React, también modularizamos todo: tenemos *Pages* para las vistas principales, *Components* reutilizables como el Mapa y Navbar, y *Hooks* personalizados, como nuestro hook `useRealtime` que encapsula toda la magia del WebSocket."

**[Slide 7: Estrategia de Branching]**
> "Dado que trabajamos en equipo, fuimos muy metódicos con Git. Nunca programamos directamente en `main`. Cada uno trabajó en ramas propias (`feature/ignacio` y `feature/javier`). Al terminar una funcionalidad, pasaba por un Pull Request hacia la rama `develop`, donde nos revisábamos el código. Solo cuando la integración funcionaba perfecto en el ambiente de desarrollo, la fusionábamos hacia `main`, que automáticamente despliega la versión oficial a producción."

**[Slide 8: Mejoras a Futuro]**
> "Sabemos que el software nunca está 'terminado', así que dejamos un Roadmap. A corto plazo, buscamos enviar las fotos a Amazon S3 en vez del servidor local, y agregar notificaciones Push al celular. A mediano plazo, implementar un algoritmo que asigne brigadistas automáticamente según la distancia en GPS. Y a largo plazo, nos gustaría re-entrenar nuestro modelo de IA pero con un dataset local de incendios exclusivamente chilenos para mayor precisión, o crear una versión app móvil nativa."

**[Slide 9: Conclusión]**
> "En conclusión, logramos crear un sistema end-to-end, funcional y completamente en la nube. Conectamos **12 servicios clave**, construimos una arquitectura distribuida y demostramos que integrar tecnologías modernas como React, Java, bases de datos geoespaciales e Inteligencia Artificial es no solo posible, sino fundamental para salvar vidas y coordinar emergencias hoy en día. Muchas gracias. Quedamos atentos a sus preguntas."

---
*Documento de estudio y apoyo académico - Municipalidad Valle del Sol*
