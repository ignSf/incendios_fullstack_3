# 📚 Material de Estudio: Sistema de Gestión de Incendios Fullstack

Este documento es una guía de estudio intensiva para dominar todos los conceptos técnicos detrás del proyecto. Úsala para prepararte ante cualquier pregunta técnica durante tu defensa.

---

## 1. Frontend (React + TypeScript + Vite)

### Conceptos Clave
*   **React y Componentes:** Toda la interfaz está dividida en piezas reutilizables (componentes). Usamos componentes funcionales (no clases).
*   **Vite:** Es el "empaquetador" (bundler). Es mucho más rápido que el antiguo Webpack (Create React App) porque aprovecha los módulos nativos del navegador durante el desarrollo.
*   **TypeScript:** Añade "tipado estático" a JavaScript. Significa que si una función espera un número, no puedes pasarle texto. Evita errores antes de ejecutar el código (ej. interfaces de `Reporte`).
*   **React Router DOM:** Permite crear una "Single Page Application" (SPA). El navegador nunca recarga la página entera; React solo cambia el componente que estás viendo (de `/` a `/dashboard`).

### Hooks Personalizados (Custom Hooks)
*   **`useGeolocation`:** Se conecta a los sensores de tu dispositivo (`navigator.geolocation`) para pedir permiso y leer tus coordenadas GPS reales.
*   **`useRealtime`:** Es el que mantiene vivo el WebSocket. Se suscribe a los canales del backend (STOMP) y cuando llega un aviso (ej: "nuevo incendio"), actualiza el estado (`useState`) para que la pantalla cambie sola.

### Manejo de Sesión (Context API)
*   **`AuthContext`:** Es una "nube" de datos global en el frontend. Guarda quién es el usuario y qué Rol tiene, para que cualquier componente pueda saber si mostrarle o no el botón de "Cambiar Estado". El Token JWT se guarda en el `localStorage` del navegador para que no se borre al cerrar la pestaña.

---

## 2. Backend (Java + Spring Boot)

### Arquitectura de 3 Capas
1.  **Controllers (API REST):** Son la "puerta de entrada". Su único trabajo es recibir la petición HTTP (ej: un POST con JSON) y dársela al Service.
2.  **Services (Lógica de Negocio):** Es el "cerebro". Aquí es donde se decide qué hacer: encriptar la clave, enviar la foto a la IA, o crear el reporte.
3.  **Repositories (Acceso a Datos):** Hablan con la base de datos usando **Spring Data JPA**. En vez de escribir SQL a mano para todo, usamos métodos como `findByEmail()`.

### Seguridad (Spring Security + JWT)
*   **Stateless (Sin Estado):** El servidor Java no recuerda quién está conectado (no hay sesiones de servidor que consuman RAM). Todo depende del Token JWT que el frontend le manda en cada petición.
*   **BCrypt:** Algoritmo que usamos para encriptar las contraseñas. Si alguien roba la base de datos, solo verá textos irreconocibles y no podrá desencriptarlos.

### Comunicación Asíncrona e IA
*   **Microservicio IA:** En vez de poner la Inteligencia Artificial dentro de Java (lo cual es muy lento y pesado), la externalizamos a HuggingFace. Java simplemente hace una llamada HTTP (`RestTemplate`) hacia la IA, espera la respuesta y continúa.
*   **WebSocket (STOMP):** A diferencia del HTTP (donde el cliente pregunta y el servidor responde), el WebSocket es un túnel bidireccional abierto. El Broker de Spring Boot empuja eventos por la tubería hacia todos los Reacts conectados al mismo tiempo.

---

## 3. Base de Datos (PostgreSQL + PostGIS en Supabase)

### ¿Por qué Supabase?
Supabase es PostgreSQL hosteado en la nube. A diferencia de un hosting tradicional, Supabase nos da una base de datos manejada con Connection Pooling (previene que la base colapse si hay muchas conexiones simultáneas).

### Inteligencia Geoespacial (PostGIS)
*   No guardamos latitud y longitud solo como texto. Usamos una extensión matemática llamada **PostGIS**.
*   **`ST_MakePoint` y `ST_DWithin`:** Son comandos especiales que entienden que la Tierra es una esfera. Nos permiten calcular distancias reales en metros entre dos puntos en el mapa, algo que con cálculos matemáticos normales (Pitágoras) fallaría por la curvatura terrestre.

### Automatización con Triggers (Disparadores)
La base de datos hace trabajo por sí sola para quitarle carga a Java:
*   **Trigger de Auditoría:** Si un brigadista cambia un reporte de PENDIENTE a CONTROLADO, un "Trigger" en la base de datos se dispara automáticamente por debajo y guarda ese evento en una tabla de `historial_estados` para saber quién hizo el cambio y cuándo.

---

## 4. Explicación de la Presentación: Estrategia de Branching (Git)

En la diapositiva #7 de tu PowerPoint se muestra la "Estrategia de Branching". Esta es una pregunta clásica de entrevistas de trabajo y defensas académicas sobre "cómo trabajan en equipo sin pisarse el código".

### ¿Qué significa la estrategia mostrada en la PPT?
Utilizamos un flujo de trabajo basado en **Git Flow simplificado** (o GitHub Flow).

1.  **Rama `main` (Verde en la PPT):** Es el "código sagrado". Todo lo que está aquí funciona perfecto y es lo que los ciudadanos ven publicado en Vercel y Railway. **Nadie programa directamente en main.**
2.  **Rama `develop` o `review` (Azul en la PPT):** Es el entorno de pruebas. Aquí es donde juntamos el código tuyo y el de Javier para ver si "explotan" al conectarse.
3.  **Ramas de Feature (`feature/ignacio`, `feature/javier`) (Morado/Naranja):** Cuando tienes que hacer una tarea (ej: crear el mapa), sacas una "copia" del código desde `main` a tu rama personal. Trabajas aislado sin molestar a nadie.

### ¿Cómo es el flujo en la vida real? (El Speech de defensa)
*   *"Profesor, en nuestro equipo evitamos los conflictos de código usando Ramas de Feature. Si yo tenía que programar el login, creaba mi rama `feature/login`. Cuando terminaba, no lo subía directo a producción, sino que creaba un **Pull Request (PR)** hacia la rama de desarrollo."*
*   *"Ahí, Javier revisaba mi código. Si todo estaba bien, lo integrábamos (Merge). Y finalmente, cuando la rama de desarrollo estaba estable y sin bugs, recién ahí le hacíamos Merge a la rama `main`, lo que disparaba automáticamente el despliegue hacia la nube en Vercel."*

**Concepto Clave a mencionar:** **CI/CD (Integración y Despliegue Continuo).** Al unir la rama `main` con Vercel/Railway, logramos que cada vez que aprobamos un cambio, la página en internet se actualice sola sin que nosotros tengamos que subir archivos manualmente.
