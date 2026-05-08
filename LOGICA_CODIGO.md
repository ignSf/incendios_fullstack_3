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
*Documento generado para fines académicos - Municipalidad Valle del Sol*
