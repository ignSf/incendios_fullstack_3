# ⚙️ Plan de Implementación — Backend

## Java 21 + Spring Boot 3 + WebSocket STOMP + PostgreSQL

---

## Stack Técnico

| Componente | Tecnología | Función |
|---|---|---|
| **Lenguaje** | Java 21 LTS | Tipado fuerte, rendimiento, ecosistema empresarial |
| **Framework** | Spring Boot 3.3+ | API REST, seguridad, WebSocket, inyección de dependencias |
| **Realtime** | Spring WebSocket + STOMP + SockJS | Reemplazo de Supabase Realtime |
| **ORM** | Spring Data JPA + Hibernate Spatial | Mapeo objeto-relacional + soporte PostGIS |
| **Auth** | Spring Security + JWT (jjwt) | Autenticación stateless |
| **Validación** | Jakarta Validation (@Valid) | Validación de inputs con anotaciones |
| **Storage fotos** | AWS S3 SDK o almacenamiento local | Subida de imágenes |
| **IA** | RestTemplate/WebClient → HuggingFace API | Clasificación de gravedad |
| **Build** | Maven | Gestión de dependencias y build |

---

## Alternativa a Supabase Realtime: Spring WebSocket + STOMP

> [!IMPORTANT]
> **Spring WebSocket con STOMP** reemplaza Supabase Realtime. Es parte nativa de Spring, gratis, y soporta broadcast, suscripciones por tópico (similar a "rooms"), y fallback con SockJS para navegadores antiguos.

### ¿Cómo funciona?

```
1. Ciudadano crea reporte → POST /api/reportes
2. Backend guarda en PostgreSQL (JPA)
3. Backend envía mensaje STOMP a /topic/reportes
4. TODOS los clientes suscritos al tópico reciben el reporte
5. El mapa agrega el nuevo marcador en tiempo real
```

### Tópicos STOMP del sistema

| Tópico | Dirección | Datos | Cuándo |
|---|---|---|---|
| `/topic/reportes` | Server → Client | `ReporteDTO` | Se crea un nuevo reporte |
| `/topic/alertas` | Server → Client | `AlertaDTO` | Reporte con gravedad ≥ 4 |
| `/topic/estados` | Server → Client | `{ id, estado }` | Brigadista cambia estado |
| `/app/suscribir-zona` | Client → Server | `{ bounds }` | Cliente envía viewport del mapa |

---

## Estructura del Proyecto

```
back/
├── src/main/java/com/valledelsol/incendios/
│   ├── IncendiosApplication.java              # Entry point
│   ├── config/
│   │   ├── SecurityConfig.java                # Spring Security + JWT
│   │   ├── WebSocketConfig.java               # STOMP + SockJS
│   │   ├── CorsConfig.java                    # CORS
│   │   └── JwtUtil.java                       # Generar/validar JWT
│   ├── model/
│   │   ├── Usuario.java                       # @Entity
│   │   ├── Brigadista.java                    # @Entity
│   │   ├── Reporte.java                       # @Entity con PostGIS Point
│   │   ├── Alerta.java                        # @Entity
│   │   ├── HistorialEstado.java               # @Entity
│   │   └── enums/
│   │       ├── RolUsuario.java                # CIUDADANO, ADMIN, BRIGADISTA
│   │       ├── EstadoReporte.java             # PENDIENTE, EN_ATENCION, etc.
│   │       └── MetodoIA.java                  # CNN, XGBOOST, ENSEMBLE
│   ├── dto/
│   │   ├── request/
│   │   │   ├── LoginRequest.java
│   │   │   ├── RegisterRequest.java
│   │   │   ├── CrearReporteRequest.java
│   │   │   └── ActualizarEstadoRequest.java
│   │   └── response/
│   │       ├── AuthResponse.java
│   │       ├── ReporteResponse.java
│   │       ├── EstadisticasResponse.java
│   │       └── ClasificacionResponse.java
│   ├── repository/
│   │   ├── UsuarioRepository.java             # JpaRepository
│   │   ├── ReporteRepository.java             # Queries PostGIS nativas
│   │   ├── BrigadistaRepository.java
│   │   └── AlertaRepository.java
│   ├── service/
│   │   ├── AuthService.java                   # Login, register, JWT
│   │   ├── ReporteService.java                # CRUD + lógica de negocio
│   │   ├── IAService.java                     # Llamada a HuggingFace
│   │   ├── StorageService.java                # Upload fotos
│   │   ├── AlertaService.java                 # Generar alertas
│   │   └── WebSocketService.java              # Emitir eventos STOMP
│   ├── controller/
│   │   ├── AuthController.java                # /api/auth/*
│   │   ├── ReporteController.java             # /api/reportes/*
│   │   ├── DashboardController.java           # /api/dashboard/*
│   │   └── WebSocketController.java           # Mensajes STOMP
│   ├── security/
│   │   ├── JwtAuthFilter.java                 # Filtro JWT
│   │   └── UserDetailsServiceImpl.java
│   └── exception/
│       ├── GlobalExceptionHandler.java        # @ControllerAdvice
│       └── ResourceNotFoundException.java
├── src/main/resources/
│   ├── application.yml                        # Config principal
│   └── application-dev.yml                    # Config desarrollo
├── pom.xml                                    # Dependencias Maven
├── Dockerfile
└── .dockerignore
```

---

## API REST — Endpoints

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Registrar usuario |
| POST | `/api/auth/login` | ❌ | Login → devuelve JWT |
| GET | `/api/auth/me` | ✅ | Datos del usuario actual |

### Reportes

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| POST | `/api/reportes` | ✅ | cualquiera | Crear reporte (foto + GPS) |
| GET | `/api/reportes` | ✅ | cualquiera | Listar reportes (filtros) |
| GET | `/api/reportes/{id}` | ✅ | cualquiera | Detalle de un reporte |
| PATCH | `/api/reportes/{id}/estado` | ✅ | admin/brigadista | Cambiar estado |
| GET | `/api/reportes/zona` | ✅ | cualquiera | Reportes por bounding box |
| GET | `/api/reportes/cercanos` | ✅ | cualquiera | Reportes en radio de X km |

### Dashboard

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| GET | `/api/dashboard/stats` | ✅ | admin | Estadísticas generales |
| GET | `/api/dashboard/por-comuna` | ✅ | admin | Agrupados por comuna |

---

## Implementación Clave

### 1. Entity Reporte con PostGIS

```java
// model/Reporte.java
@Entity
@Table(name = "reportes")
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private Double latitud;

    @Column(nullable = false)
    private Double longitud;

    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point ubicacion;  // org.locationtech.jts.geom.Point

    private String direccion;
    private String comuna;
    private String descripcion;
    private String fotoUrl;

    @Column(name = "nivel_gravedad")
    private Integer nivelGravedad;

    @Column(name = "confianza_ia")
    private Double confianzaIa;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_clasificacion")
    private MetodoIA metodoClasificacion;

    @Enumerated(EnumType.STRING)
    private EstadoReporte estado = EstadoReporte.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reportado_por")
    private Usuario reportadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendido_por")
    private Brigadista atendidoPor;

    // Getters, setters, constructor...

    @PrePersist
    @PreUpdate
    private void actualizarUbicacion() {
        if (latitud != null && longitud != null) {
            GeometryFactory gf = new GeometryFactory(new PrecisionModel(), 4326);
            this.ubicacion = gf.createPoint(new Coordinate(longitud, latitud));
        }
    }
}
```

### 2. Repository con Queries PostGIS

```java
// repository/ReporteRepository.java
@Repository
public interface ReporteRepository extends JpaRepository<Reporte, UUID> {

    // Reportes dentro de un radio (metros)
    @Query(value = """
        SELECT * FROM reportes
        WHERE ST_DWithin(
            ubicacion::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radioMetros
        )
        AND estado IN ('pendiente', 'en_atencion')
        ORDER BY created_at DESC
        """, nativeQuery = true)
    List<Reporte> findCercanos(
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("radioMetros") double radioMetros
    );

    // Reportes dentro de un bounding box (viewport del mapa)
    @Query(value = """
        SELECT * FROM reportes
        WHERE ubicacion && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
        AND created_at > NOW() - INTERVAL '30 days'
        ORDER BY nivel_gravedad DESC
        """, nativeQuery = true)
    List<Reporte> findEnZona(
        @Param("north") double north,
        @Param("south") double south,
        @Param("east") double east,
        @Param("west") double west
    );

    // Estadísticas para dashboard
    @Query(value = """
        SELECT DATE(created_at) as fecha,
               COUNT(*) as total,
               AVG(nivel_gravedad) as gravedad_promedio,
               COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes
        FROM reportes
        GROUP BY DATE(created_at)
        ORDER BY fecha DESC
        LIMIT 30
        """, nativeQuery = true)
    List<Object[]> findEstadisticas();
}
```

### 3. Configuración WebSocket (STOMP + SockJS)

```java
// config/WebSocketConfig.java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefijo para tópicos de suscripción (server → client)
        config.enableSimpleBroker("/topic");
        // Prefijo para mensajes del cliente (client → server)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket con fallback SockJS
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:5173")
                .withSockJS();
    }
}
```

### 4. WebSocket Service (emitir eventos)

```java
// service/WebSocketService.java
@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void emitirNuevoReporte(ReporteResponse reporte) {
        messagingTemplate.convertAndSend("/topic/reportes", reporte);
    }

    public void emitirAlertaCritica(ReporteResponse reporte) {
        messagingTemplate.convertAndSend("/topic/alertas", reporte);
    }

    public void emitirCambioEstado(UUID reporteId, EstadoReporte nuevoEstado) {
        Map<String, Object> payload = Map.of(
            "id", reporteId,
            "estado", nuevoEstado
        );
        messagingTemplate.convertAndSend("/topic/estados", payload);
    }
}
```

### 5. Controller de Reportes

```java
// controller/ReporteController.java
@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReporteResponse> crear(
            @RequestPart("datos") @Valid CrearReporteRequest datos,
            @RequestPart(value = "foto", required = false) MultipartFile foto,
            @AuthenticationPrincipal UserDetails user) {

        ReporteResponse reporte = reporteService.crear(datos, foto, user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(reporte);
    }

    @GetMapping
    public ResponseEntity<List<ReporteResponse>> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Integer gravedad) {
        return ResponseEntity.ok(reporteService.listar(estado, gravedad));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReporteResponse> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(reporteService.obtenerPorId(id));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN', 'BRIGADISTA')")
    public ResponseEntity<ReporteResponse> actualizarEstado(
            @PathVariable UUID id,
            @RequestBody @Valid ActualizarEstadoRequest request) {
        return ResponseEntity.ok(reporteService.actualizarEstado(id, request));
    }

    @GetMapping("/zona")
    public ResponseEntity<List<ReporteResponse>> porZona(
            @RequestParam double north, @RequestParam double south,
            @RequestParam double east, @RequestParam double west) {
        return ResponseEntity.ok(reporteService.buscarEnZona(north, south, east, west));
    }

    @GetMapping("/cercanos")
    public ResponseEntity<List<ReporteResponse>> cercanos(
            @RequestParam double lat, @RequestParam double lng,
            @RequestParam(defaultValue = "5000") double radio) {
        return ResponseEntity.ok(reporteService.buscarCercanos(lat, lng, radio));
    }
}
```

### 6. Service principal (flujo crear reporte)

```java
// service/ReporteService.java
@Service
@Transactional
public class ReporteService {

    private final ReporteRepository reporteRepo;
    private final UsuarioRepository usuarioRepo;
    private final IAService iaService;
    private final StorageService storageService;
    private final WebSocketService wsService;
    private final AlertaService alertaService;

    // Constructor con inyección...

    public ReporteResponse crear(CrearReporteRequest req, MultipartFile foto, String email) {
        Usuario usuario = usuarioRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        // 1. Subir foto
        String fotoUrl = null;
        if (foto != null && !foto.isEmpty()) {
            fotoUrl = storageService.subirFoto(foto);
        }

        // 2. Clasificar con IA
        ClasificacionResponse clasificacion = new ClasificacionResponse();
        if (fotoUrl != null) {
            clasificacion = iaService.clasificarImagen(fotoUrl);
        }

        // 3. Crear entidad
        Reporte reporte = new Reporte();
        reporte.setLatitud(req.getLatitud());
        reporte.setLongitud(req.getLongitud());
        reporte.setDireccion(req.getDireccion());
        reporte.setComuna(req.getComuna());
        reporte.setDescripcion(req.getDescripcion());
        reporte.setFotoUrl(fotoUrl);
        reporte.setNivelGravedad(clasificacion.getNivel());
        reporte.setConfianzaIa(clasificacion.getConfianza());
        reporte.setMetodoClasificacion(clasificacion.getMetodo());
        reporte.setReportadoPor(usuario);

        reporte = reporteRepo.save(reporte);

        ReporteResponse response = toResponse(reporte);

        // 4. Emitir evento WebSocket
        wsService.emitirNuevoReporte(response);

        // 5. Si es grave, emitir alerta
        if (reporte.getNivelGravedad() != null && reporte.getNivelGravedad() >= 4) {
            wsService.emitirAlertaCritica(response);
            alertaService.generarAlertas(reporte);
        }

        return response;
    }
}
```

### 7. Servicio de IA (HuggingFace)

```java
// service/IAService.java
@Service
public class IAService {

    @Value("${app.huggingface.url}")
    private String hfUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public ClasificacionResponse clasificarImagen(String imagePath) {
        try {
            // Construir multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new FileSystemResource(imagePath));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ResponseEntity<Map> response = restTemplate.exchange(
                hfUrl + "/api/predict",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );

            // Parsear respuesta de Gradio
            List<Object> data = (List<Object>) response.getBody().get("data");
            return new ClasificacionResponse(
                (Integer) data.get(0),     // nivel
                (Double) data.get(1),      // confianza
                MetodoIA.CNN
            );
        } catch (Exception e) {
            log.warn("IA no disponible: {}", e.getMessage());
            return new ClasificacionResponse(null, null, null);
        }
    }
}
```

### 8. Security Config (JWT)

```java
// config/SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/ws/**").permitAll()  // WebSocket endpoint
                .requestMatchers("/api/dashboard/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## application.yml

```yaml
# src/main/resources/application.yml
server:
  port: 8080

spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/incendios_db}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate  # No auto-crear tablas (usamos SQL manual)
    properties:
      hibernate:
        dialect: org.hibernate.spatial.dialect.postgis.PostgisPG10Dialect
    show-sql: false

app:
  jwt:
    secret: ${JWT_SECRET:dev_secret_cambiar_en_prod}
    expiration-ms: 604800000  # 7 días
  huggingface:
    url: ${HF_SPACE_URL:https://usuario-fire-severity.hf.space}
  uploads:
    path: ${UPLOADS_PATH:./uploads}
```

---

## pom.xml — Dependencias Clave

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- PostgreSQL + PostGIS -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.hibernate.orm</groupId>
        <artifactId>hibernate-spatial</artifactId>
    </dependency>

    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.6</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Lombok (opcional, reduce boilerplate) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

---

## Conexión Frontend ↔ Backend WebSocket

El frontend se conecta usando **SockJS + STOMP.js** (en vez de socket.io-client):

```typescript
// Frontend: src/lib/socket.ts
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_URL = import.meta.env.VITE_API_URL;

export const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_URL}/ws`),
  reconnectDelay: 5000,
  onConnect: () => {
    console.log('🔌 WebSocket conectado');
  },
});
```

```bash
# Instalar en frontend (en vez de socket.io-client):
npm install @stomp/stompjs sockjs-client
npm install -D @types/sockjs-client
```

---

## Checklist de Implementación

- [ ] Crear proyecto Spring Boot (Spring Initializr o `mvn archetype`)
- [ ] Agregar dependencias en `pom.xml`
- [ ] Configurar `application.yml`
- [ ] Crear entidades JPA (Usuario, Reporte, Brigadista, Alerta)
- [ ] Crear repositorios con queries PostGIS
- [ ] Configurar Spring Security + JWT
- [ ] Implementar AuthController (login/register)
- [ ] Implementar ReporteController (CRUD)
- [ ] Configurar WebSocket STOMP + SockJS
- [ ] Implementar WebSocketService (emitir eventos)
- [ ] Implementar IAService (llamada a HuggingFace)
- [ ] Implementar StorageService (fotos)
- [ ] Implementar DashboardController (stats)
- [ ] Crear Dockerfile (multi-stage con Maven)
- [ ] Testear con Postman + STOMP test client
