# 🔥 Documentación Técnica — Sistema de Gestión de Incendios
### Municipalidad Valle del Sol

> **Versión:** 1.0 | **Última actualización:** Mayo 2026

---

## 📑 Índice

1. [Resumen del Proyecto](#1--resumen-del-proyecto)
2. [Arquitectura del Proyecto](#2--arquitectura-del-proyecto)
3. [Herramientas y Tecnologías](#3--herramientas-y-tecnologías)
4. [Backend](#4--backend)
5. [Frontend](#5--frontend)
6. [Base de Datos](#6--base-de-datos)
7. [Servicio de IA](#7--servicio-de-ia--huggingface-space)
8. [Servicios Implementados](#8--servicios-implementados)
9. [Funcionalidades Implementadas](#9--funcionalidades-implementadas)
10. [Planes de Mejora](#10--planes-de-mejora)

---

## 1 · Resumen del Proyecto

Sistema fullstack para la gestión y monitoreo de incendios forestales. Permite a ciudadanos reportar incendios con foto y geolocalización, clasifica automáticamente la gravedad mediante IA (CNN + XGBoost), y proporciona un dashboard administrativo con estadísticas en tiempo real vía WebSocket.

---

## 2 · Arquitectura del Proyecto

### 2.1 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                           │
│                                                                 │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │   Frontend   │──▶│     Backend      │──▶│  PostgreSQL    │  │
│  │  React+Vite  │   │  Spring Boot 3   │   │  16 + PostGIS  │  │
│  │  :5173       │   │  :8080           │   │  :5432         │  │
│  └──────────────┘   └────────┬─────────┘   └────────────────┘  │
│                              │                                  │
│                              │ REST / WebSocket                 │
│                              ▼                                  │
│                    ┌──────────────────┐                         │
│                    │  HuggingFace     │                         │
│                    │  Space (IA)      │                         │
│                    │  Gradio API      │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Patrón Arquitectónico

- **Backend:** Arquitectura en capas (Controller → Service → Repository → Model)
- **Frontend:** Component-Based Architecture con React (Pages, Components, Hooks, Context)
- **Comunicación:** REST API + WebSocket (STOMP sobre SockJS)
- **Contenedorización:** Docker Compose con 3 servicios orquestados
- **Seguridad:** JWT Stateless + Spring Security con roles (CIUDADANO, ADMIN, BRIGADISTA)

### 2.3 Estructura de Directorios

```
Incendios_Fullstack/
├── back/                          # Backend Spring Boot
│   ├── Dockerfile                 # Multi-stage build (Maven → JRE Alpine)
│   ├── pom.xml                    # Dependencias Maven
│   └── src/main/java/back/incendios/
│       ├── IncendiosApplication.java
│       ├── config/                # Configuraciones (CORS, JWT, Security, WebSocket)
│       ├── controller/            # Controladores REST
│       ├── service/               # Lógica de negocio
│       ├── repository/            # Acceso a datos (JPA)
│       ├── model/                 # Entidades JPA + Enums
│       ├── DTO/                   # Request/Response DTOs
│       ├── security/              # Filtro JWT + UserDetailsService
│       └── exception/             # Manejo global de errores
├── front/vite-project/            # Frontend React
│   ├── Dockerfile
│   └── src/
│       ├── App.tsx                # Rutas y layout principal
│       ├── pages/                 # 6 páginas
│       ├── components/            # Componentes reutilizables
│       ├── context/               # AuthContext (estado global)
│       ├── hooks/                 # Custom hooks (geolocation, realtime)
│       ├── lib/                   # API client + STOMP client
│       └── types/                 # TypeScript interfaces
├── db/init/                       # Scripts SQL de inicialización
│   ├── 01_extensions.sql
│   ├── 02_types.sql
│   ├── 03_tables.sql
│   ├── 04_triggers.sql
│   ├── 05_views.sql
│   └── 06_seeds.sql
├── huggingface_space/             # Servicio IA (Gradio)
│   ├── app.py
│   └── requirements.txt
├── docs/                          # Documentación de planificación
├── docker-compose.yml             # Orquestación de servicios
└── .env                           # Variables de entorno
```

---

## 3 · Herramientas y Tecnologías

### 3.1 Backend

| Herramienta | Versión | Propósito |
|---|---|---|
| **Java** | 21 (LTS) | Lenguaje principal |
| **Spring Boot** | 3.4.5 | Framework web |
| **Spring Security** | 6.x | Autenticación y autorización |
| **Spring Data JPA** | 3.x | ORM y acceso a datos |
| **Spring WebSocket** | 3.x | Comunicación en tiempo real |
| **Hibernate Spatial** | 6.x | Soporte PostGIS/geometrías |
| **JJWT** | 0.12.6 | Generación/validación de JWT |
| **Lombok** | - | Reducción de boilerplate |
| **Maven** | 3.9 | Gestión de dependencias y build |

### 3.2 Frontend

| Herramienta | Versión | Propósito |
|---|---|---|
| **React** | 19.x | Librería UI |
| **TypeScript** | 6.x | Tipado estático |
| **Vite** | 8.x | Build tool y dev server |
| **React Router DOM** | 7.x | Routing SPA |
| **Leaflet + React-Leaflet** | 1.9 / 5.0 | Mapas interactivos |
| **Lucide React** | 1.14 | Iconografía |
| **@stomp/stompjs** | 7.x | Cliente WebSocket STOMP |
| **SockJS Client** | 1.6 | Fallback WebSocket |

### 3.3 Base de Datos

| Herramienta | Versión | Propósito |
|---|---|---|
| **PostgreSQL** | 16 | RDBMS principal |
| **PostGIS** | 3.4 | Extensión geoespacial |
| **uuid-ossp** | - | Generación de UUIDs |
| **pg_trgm** | - | Búsqueda por similitud de texto |

### 3.4 IA / Machine Learning

| Herramienta | Propósito |
|---|---|
| **PyTorch + TorchVision** | Framework de deep learning |
| **ONNX Runtime** | Inferencia optimizada del modelo CNN |
| **timm** | Arquitectura EfficientNet-B0 |
| **XGBoost** | Clasificación por datos satelitales |
| **scikit-learn** | Pipeline ML |
| **Gradio** | Interfaz web + API REST para el modelo |
| **Pillow** | Procesamiento de imágenes |

### 3.5 DevOps e Infraestructura

| Herramienta | Propósito |
|---|---|
| **Docker** | Contenedorización |
| **Docker Compose** | Orquestación multi-contenedor |
| **HuggingFace Spaces** | Hosting del modelo IA (Gradio) |
| **Eclipse Temurin** | JDK/JRE para contenedores |

---

## 4 · Backend

### 4.1 Controladores (REST API)

#### `AuthController` — `/api/auth`
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/register` | Público | Registro de nuevo usuario |
| `POST` | `/login` | Público | Inicio de sesión → JWT |
| `GET` | `/me` | Autenticado | Datos del usuario actual |

#### `ReporteController` — `/api/reportes`
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/` | Autenticado | Crear reporte (multipart: foto + JSON) |
| `GET` | `/` | Público | Listar reportes activos (filtro por estado) |
| `GET` | `/{id}` | Público | Obtener reporte por ID |
| `GET` | `/mis-reportes` | Autenticado | Reportes del usuario actual |
| `PATCH` | `/{id}/estado` | ADMIN/BRIGADISTA | Cambiar estado de un reporte |
| `GET` | `/zona` | Público | Reportes dentro de un bounding box |
| `GET` | `/cercanos` | Público | Reportes dentro de un radio (metros) |

#### `DashboardController` — `/api/dashboard`
| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/stats` | ADMIN | Estadísticas diarias (últimos 30 días) |

### 4.2 Servicios

| Servicio | Responsabilidad |
|---|---|
| **AuthService** | Registro, login, consulta de perfil. Encripta contraseñas con BCrypt y genera JWT |
| **ReporteService** | CRUD de reportes, clasificación IA, emisión de eventos WebSocket, búsquedas geoespaciales |
| **IAService** | Integración con HuggingFace Space vía Gradio API (`/api/predict`). Fallback si IA no disponible |
| **StorageService** | Almacenamiento local de fotos con UUID como nombre. Ruta configurable |
| **WebSocketService** | Emisión de eventos STOMP a los topics: `/topic/reportes`, `/topic/alertas`, `/topic/estados` |

### 4.3 Modelos (Entidades JPA)

| Entidad | Tabla | Campos Clave |
|---|---|---|
| **Usuario** | `usuarios` | id, email, password_hash, nombre, telefono, rol, activo |
| **Reporte** | `reportes` | id, latitud, longitud, ubicacion (PostGIS Point), descripcion, foto_url, nivel_gravedad (1-5), confianza_ia, metodo_clasificacion, estado |
| **Brigadista** | `brigadistas` | id, user_id (FK), nombre, zona_asignada, disponible |
| **HistorialEstado** | `historial_estados` | id, reporte_id, estado_anterior, estado_nuevo, cambiado_por |
| **Alerta** | `alertas` | id, reporte_id, tipo (EMAIL/PUSH/DASHBOARD), destinatario, mensaje, enviada |

### 4.4 Enums

| Enum | Valores |
|---|---|
| `RolUsuario` | CIUDADANO, ADMIN, BRIGADISTA |
| `EstadoReporte` | PENDIENTE, EN_ATENCION, CONTROLADO, EXTINGUIDO |
| `MetodoIA` | CNN, XGBOOST, ENSEMBLE |

### 4.5 Seguridad

- **Autenticación:** JWT stateless con HMAC-SHA firmado con clave Base64
- **Filtro:** `JwtAuthFilter` intercepta cada request, valida token y establece el `SecurityContext`
- **Autorización por roles:** `@PreAuthorize("hasRole('ADMIN')")` en endpoints restringidos
- **Password Encoding:** BCrypt
- **CORS:** Configurable por variable de entorno `app.cors.allowed-origins`
- **Sesiones:** Deshabilitadas (`STATELESS`)

### 4.6 Configuraciones

| Clase | Función |
|---|---|
| **SecurityConfig** | Cadena de filtros, permisos por endpoint, BCrypt, AuthenticationManager |
| **CorsConfig** | Orígenes permitidos, métodos, headers, credenciales |
| **WebSocketConfig** | Broker STOMP (`/topic`), endpoint `/ws` con SockJS |
| **JwtUtil** | Generación y validación de tokens JWT |

### 4.7 Manejo de Errores

`GlobalExceptionHandler` captura:
- `RuntimeException` → 400 Bad Request
- `MethodArgumentNotValidException` → 400 con detalle por campo
- `Exception` genérica → 500 Internal Server Error

---

## 5 · Frontend

### 5.1 Páginas

| Página | Ruta | Acceso | Descripción |
|---|---|---|---|
| **HomePage** | `/` | Público | Mapa interactivo con reportes activos en tiempo real |
| **AuthPage** | `/auth` | Público | Login y registro con toggle |
| **ReportPage** | `/reportar` | Autenticado | Formulario para reportar incendio con foto, GPS y descripción |
| **MyReportsPage** | `/mis-reportes` | Autenticado | Lista de reportes propios del usuario |
| **ReportDetailPage** | `/reporte/:id` | Autenticado | Detalle completo de un reporte, cambio de estado (admin/brigadista) |
| **DashboardPage** | `/dashboard` | Solo ADMIN | Panel con estadísticas y tabla de desglose diario |

### 5.2 Componentes

| Componente | Ubicación | Función |
|---|---|---|
| **Navbar** | `components/layout/` | Barra de navegación con enlaces por rol |
| **FireMap** | `components/map/` | Mapa Leaflet con marcadores por nivel de gravedad (dark theme CARTO) |
| **AlertBanner** | `components/ui/` | Banner de alerta crítica en tiempo real |
| **Badges** | `components/ui/` | Badges de estado y gravedad |

### 5.3 Custom Hooks

| Hook | Función |
|---|---|
| **useGeolocation** | Obtiene coordenadas GPS del navegador (alta precisión) |
| **useRealtime** | Conexión WebSocket STOMP. Suscripción a `/topic/reportes`, `/topic/alertas`. Gestión de alertas críticas con auto-dismiss (10s) |

### 5.4 Contexto Global

**AuthContext** — Gestiona el estado de autenticación:
- Persistencia de sesión via `localStorage` (token JWT)
- Métodos: `login()`, `register()`, `logout()`
- Verificación automática al cargar la app (`/api/auth/me`)

### 5.5 API Client (`lib/api.ts`)

Cliente HTTP centralizado con:
- Inyección automática de token JWT en headers
- Manejo de `Content-Type` (JSON vs FormData)
- Parseo automático de errores
- Módulos: `auth`, `reportes`, `dashboard`

### 5.6 Rutas Protegidas

Componente `ProtectedRoute`:
- Redirige a `/auth` si no autenticado
- Redirige a `/` si ruta `adminOnly` y usuario no es ADMIN
- Muestra spinner durante carga

---

## 6 · Base de Datos

### 6.1 Motor y Extensiones

- **PostgreSQL 16** con imagen Docker `postgis/postgis:16-3.4`
- **Extensiones:** `uuid-ossp` (UUIDs v4), `postgis` (geometrías), `pg_trgm` (búsqueda fuzzy)

### 6.2 Tipos Enumerados (SQL)

```sql
rol_usuario:    CIUDADANO | ADMIN | BRIGADISTA
estado_reporte: PENDIENTE | EN_ATENCION | CONTROLADO | EXTINGUIDO
metodo_ia:      CNN | XGBOOST | ENSEMBLE
tipo_alerta:    EMAIL | PUSH | DASHBOARD
```

### 6.3 Tablas

| Tabla | PK | Índices | Relaciones |
|---|---|---|---|
| **usuarios** | UUID | email (unique), rol | - |
| **brigadistas** | UUID | disponible | FK → usuarios.id |
| **reportes** | UUID | ubicacion (GIST), estado, gravedad, created_at | FK → usuarios.id, FK → brigadistas.id |
| **historial_estados** | UUID | reporte_id | FK → reportes.id, FK → usuarios.id |
| **alertas** | UUID | pendientes (parcial: enviada=false) | FK → reportes.id |

### 6.4 Triggers

| Trigger | Evento | Función |
|---|---|---|
| `trg_actualizar_ubicacion` | INSERT/UPDATE de lat/lng en `reportes` | Auto-genera la columna PostGIS `ubicacion` con `ST_MakePoint` + SRID 4326 |
| `trg_historial_estado` | UPDATE de `estado` en `reportes` | Inserta registro automático en `historial_estados` |

### 6.5 Vistas

| Vista | Propósito |
|---|---|
| `v_estadisticas_dashboard` | Estadísticas diarias: totales, promedios, conteos por estado, críticos |
| `v_reportes_activos` | Reportes no extinguidos con joins a usuarios y brigadistas |

### 6.6 Consultas Geoespaciales (Repository)

- **Bounding Box:** `ST_MakeEnvelope` para buscar reportes en el viewport del mapa
- **Radio:** `ST_DWithin` para buscar reportes cercanos a un punto (en metros)

### 6.7 Seeds

Datos de prueba: 1 admin, 1 brigadista, 1 ciudadano, 3 reportes de ejemplo (password: `password123`).

---

## 7 · Servicio de IA — HuggingFace Space

### 7.1 Modelos Implementados

| Modelo | Tipo | Input | Output |
|---|---|---|---|
| **EfficientNet-B0** (ONNX) | CNN | Imagen 224×224 | Nivel 1-5 + confianza % |
| **XGBoost** (joblib) | Gradient Boosting | Datos satelitales (NASA FIRMS) | Nivel 1-5 + confianza % |

### 7.2 Pipeline de Clasificación por Imagen

1. Recibe imagen → Resize a 224×224
2. Normaliza con medias/stds de ImageNet
3. Inferencia ONNX → logits
4. Softmax → probabilidades por clase
5. Retorna: nivel predicho, confianza, distribución completa

### 7.3 Pipeline de Clasificación Satelital

Recibe: brightness (K), FRP (MW), confidence, scan (km), track (km) → XGBoost predice nivel.

### 7.4 Niveles de Gravedad

| Nivel | Nombre | Emoji | Descripción |
|---|---|---|---|
| 1 | Conato | 🟢 | Fuego muy pequeño |
| 2 | Menor | 🟡 | Fuego localizado |
| 3 | Moderado | 🟠 | Fuego considerable |
| 4 | Mayor | 🔴 | Fuego grande |
| 5 | Catastrófico | ⚫ | Fuego masivo |

### 7.5 Integración Backend ↔ IA

`IAService` llama al Gradio API (`/api/predict`) del Space. Si el servicio no responde, el reporte se crea sin clasificación (graceful degradation).

---

## 8 · Servicios Implementados

### 8.1 Resumen de Servicios End-to-End

| # | Servicio | Capa | Descripción |
|---|---|---|---|
| 1 | **Autenticación JWT** | Backend | Registro, login, verificación de sesión con tokens stateless |
| 2 | **Gestión de Reportes** | Full Stack | CRUD completo con upload de fotos, geolocalización y clasificación IA |
| 3 | **Clasificación IA** | Backend + HF | Clasificación automática de gravedad (1-5) al crear reporte con foto |
| 4 | **Almacenamiento de Fotos** | Backend | Upload local con nombres UUID, servido estáticamente |
| 5 | **Tiempo Real (WebSocket)** | Full Stack | Notificación instantánea de nuevos reportes y alertas críticas vía STOMP |
| 6 | **Búsqueda Geoespacial** | Backend + BD | Consultas PostGIS por bounding box y radio en metros |
| 7 | **Dashboard Estadístico** | Full Stack | Panel admin con métricas diarias de los últimos 30 días |
| 8 | **Mapa Interactivo** | Frontend | Visualización de reportes en mapa Leaflet con marcadores por gravedad |
| 9 | **Gestión de Estados** | Full Stack | Flujo de estados (PENDIENTE → EN_ATENCION → CONTROLADO → EXTINGUIDO) con historial |
| 10 | **Alertas Críticas** | Full Stack | Alertas automáticas en tiempo real cuando gravedad ≥ 4 |
| 11 | **Control de Acceso por Roles** | Full Stack | Rutas protegidas y endpoints restringidos por rol |
| 12 | **Auditoría de Estados** | Backend + BD | Registro automático vía trigger de todos los cambios de estado |

---

## 9 · Funcionalidades Implementadas

### 9.1 Ciudadano
- ✅ Registro y login
- ✅ Reportar incendio con foto + GPS + descripción
- ✅ Clasificación automática de gravedad por IA
- ✅ Ver mapa con todos los reportes activos
- ✅ Ver listado de sus propios reportes
- ✅ Ver detalle de un reporte específico
- ✅ Recibir alertas críticas en tiempo real

### 9.2 Admin
- ✅ Dashboard con estadísticas (totales, pendientes, en atención, extinguidos, críticos)
- ✅ Tabla de desglose diario
- ✅ Cambiar estado de reportes
- ✅ Todas las funciones de ciudadano

### 9.3 Brigadista
- ✅ Cambiar estado de reportes asignados
- ✅ Todas las funciones de ciudadano

### 9.4 Sistema
- ✅ Clasificación IA con fallback (graceful degradation)
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Triggers de base de datos para auditoría
- ✅ Dockerización completa (3 contenedores)
- ✅ Seeds de datos de prueba
- ✅ Manejo global de excepciones
- ✅ CORS configurable

---

## 10 · Planes de Mejora

### 10.1 Prioridad Alta

| # | Mejora | Descripción |
|---|---|---|
| 1 | **Notificaciones Push** | Implementar notificaciones push reales (Firebase Cloud Messaging) para alertas críticas |
| 2 | **Upload a Cloud Storage** | Migrar almacenamiento de fotos de local a S3/Cloudflare R2 para escalabilidad |
| 3 | **Tests Unitarios e Integración** | Agregar cobertura de tests con JUnit 5 + Mockito (backend) y Vitest (frontend) |
| 4 | **Refresh Token** | Implementar flujo de refresh token para evitar re-login frecuente |
| 5 | **Validación de Imágenes** | Validar tipo MIME, tamaño máximo y comprimir imágenes antes de almacenar |

### 10.2 Prioridad Media

| # | Mejora | Descripción |
|---|---|---|
| 6 | **Asignación de Brigadistas** | Asignación automática de brigadistas por zona y disponibilidad |
| 7 | **Historial Visual de Estados** | Timeline visual del ciclo de vida de cada reporte |
| 8 | **Filtros Avanzados en Mapa** | Filtrar por gravedad, estado, fecha, comuna en el mapa |
| 9 | **Gráficos en Dashboard** | Agregar charts (Chart.js/Recharts) para tendencias, distribución por gravedad, heatmap |
| 10 | **Paginación y Caché** | Implementar paginación server-side y caché (Redis) para endpoints frecuentes |
| 11 | **Internacionalización (i18n)** | Soporte multi-idioma |

### 10.3 Prioridad Baja (Futuro)

| # | Mejora | Descripción |
|---|---|---|
| 12 | **PWA / App Móvil** | Convertir a Progressive Web App o crear app nativa con React Native |
| 13 | **Integración NASA FIRMS** | Feed automático de datos satelitales en tiempo real |
| 14 | **Modelo IA v2** | Reentrenar CNN con dataset local chileno, mejorar accuracy |
| 15 | **CI/CD Pipeline** | GitHub Actions con build, test, deploy automático |
| 16 | **Monitoreo y Observabilidad** | Integrar Spring Actuator + Prometheus + Grafana |
| 17 | **Rate Limiting** | Limitar requests por IP/usuario para prevenir abuso |
| 18 | **Auditoría Completa** | Logging estructurado con ELK Stack |
| 19 | **Exportación de Datos** | Exportar reportes a CSV/PDF para informes municipales |
| 20 | **Multi-tenancy** | Soporte para múltiples municipalidades en una sola instancia |

---

> **Desarrollado por:** Ignacio Salazar & Javier Quiroga  
> **Proyecto Académico:** DuocUC — Caso Semestral
