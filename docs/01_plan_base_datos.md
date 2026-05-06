# 🗄️ Plan de Implementación — Base de Datos

## PostgreSQL + PostGIS en AWS RDS Free Tier

---

## Decisiones Técnicas

| Aspecto | Decisión | Justificación |
|---|---|---|
| **Motor** | PostgreSQL 16 | Soporte geoespacial con PostGIS |
| **Extensión GIS** | PostGIS 3.4+ | Consultas por radio, bounding box, clustering |
| **Hosting prod** | AWS RDS Free Tier | 750 hrs/mes db.t3.micro, 20GB, 12 meses gratis |
| **Hosting dev** | Docker (PostGIS) | Desarrollo local sin consumir free tier |

### Free Tier de AWS RDS

| Recurso | Límite |
|---|---|
| Instancia | `db.t3.micro` (1 vCPU, 1GB RAM) |
| Almacenamiento | 20 GB SSD (gp2) |
| Horas/mes | 750 (1 instancia 24/7) |
| Duración | 12 meses |

---

## 1. Modelo de Datos (Diagrama ER)

```mermaid
erDiagram
    USUARIOS ||--o{ REPORTES : "reporta"
    USUARIOS ||--o| BRIGADISTAS : "puede ser"
    REPORTES ||--o{ ALERTAS : "genera"
    BRIGADISTAS ||--o{ REPORTES : "atiende"
    REPORTES ||--o{ HISTORIAL_ESTADOS : "cambios"

    USUARIOS {
        uuid id PK
        text email UK
        text nombre
        text telefono
        enum rol "ciudadano|admin|brigadista"
    }
    REPORTES {
        uuid id PK
        double latitud
        double longitud
        geometry ubicacion "PostGIS POINT 4326"
        text descripcion
        text foto_url
        int nivel_gravedad "1-5"
        float confianza_ia
        enum estado "pendiente|en_atencion|controlado|extinguido"
        uuid reportado_por FK
        uuid atendido_por FK
    }
    BRIGADISTAS {
        uuid id PK
        text nombre
        text zona_asignada
        boolean disponible
        uuid user_id FK
    }
    ALERTAS {
        uuid id PK
        uuid reporte_id FK
        enum tipo "email|push|dashboard"
        boolean enviada
    }
    HISTORIAL_ESTADOS {
        uuid id PK
        uuid reporte_id FK
        enum estado_anterior
        enum estado_nuevo
        uuid cambiado_por FK
    }
```

---

## 2. SQL de Creación Completo

### 2.1 Extensiones y Tipos

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE rol_usuario AS ENUM ('ciudadano', 'admin', 'brigadista');
CREATE TYPE estado_reporte AS ENUM ('pendiente', 'en_atencion', 'controlado', 'extinguido');
CREATE TYPE metodo_ia AS ENUM ('cnn', 'xgboost', 'ensemble');
CREATE TYPE tipo_alerta AS ENUM ('email', 'push', 'dashboard');
```

### 2.2 Tablas

```sql
-- USUARIOS
CREATE TABLE usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    rol rol_usuario DEFAULT 'ciudadano',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- BRIGADISTAS
CREATE TABLE brigadistas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    zona_asignada TEXT,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_brigadistas_disponible ON brigadistas(disponible);

-- REPORTES (tabla principal)
CREATE TABLE reportes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    ubicacion GEOMETRY(Point, 4326),  -- PostGIS SRID 4326 = WGS84
    direccion TEXT,
    comuna TEXT,
    descripcion TEXT,
    foto_url TEXT,
    nivel_gravedad INTEGER CHECK (nivel_gravedad BETWEEN 1 AND 5),
    confianza_ia DOUBLE PRECISION CHECK (confianza_ia BETWEEN 0 AND 100),
    metodo_clasificacion metodo_ia,
    clasificado_at TIMESTAMPTZ,
    estado estado_reporte DEFAULT 'pendiente',
    reportado_por UUID REFERENCES usuarios(id),
    atendido_por UUID REFERENCES brigadistas(id)
);
CREATE INDEX idx_reportes_ubicacion ON reportes USING GIST(ubicacion);
CREATE INDEX idx_reportes_estado ON reportes(estado);
CREATE INDEX idx_reportes_gravedad ON reportes(nivel_gravedad);
CREATE INDEX idx_reportes_created ON reportes(created_at DESC);

-- HISTORIAL DE ESTADOS
CREATE TABLE historial_estados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
    estado_anterior estado_reporte,
    estado_nuevo estado_reporte NOT NULL,
    cambiado_por UUID REFERENCES usuarios(id),
    comentario TEXT
);
CREATE INDEX idx_historial_reporte ON historial_estados(reporte_id);

-- ALERTAS
CREATE TABLE alertas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reporte_id UUID REFERENCES reportes(id) ON DELETE CASCADE,
    tipo tipo_alerta NOT NULL,
    destinatario TEXT NOT NULL,
    mensaje TEXT,
    enviada BOOLEAN DEFAULT false,
    enviada_at TIMESTAMPTZ
);
CREATE INDEX idx_alertas_pendientes ON alertas(enviada) WHERE enviada = false;
```

---

## 3. Triggers

### 3.1 Auto-generar geometría PostGIS

```sql
CREATE OR REPLACE FUNCTION actualizar_ubicacion_geometry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.longitud, NEW.latitud), 4326);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_ubicacion
    BEFORE INSERT OR UPDATE OF latitud, longitud
    ON reportes FOR EACH ROW
    EXECUTE FUNCTION actualizar_ubicacion_geometry();
```

### 3.2 Registrar cambios de estado

```sql
CREATE OR REPLACE FUNCTION registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO historial_estados (reporte_id, estado_anterior, estado_nuevo)
        VALUES (NEW.id, OLD.estado, NEW.estado);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_estado
    AFTER UPDATE OF estado ON reportes
    FOR EACH ROW EXECUTE FUNCTION registrar_cambio_estado();
```

---

## 4. Consultas Geoespaciales Clave

### Reportes en un radio de 5 km

```sql
SELECT id, descripcion, nivel_gravedad,
    ST_Distance(ubicacion::geography,
        ST_SetSRID(ST_MakePoint(-70.6483, -33.4569), 4326)::geography
    ) / 1000 AS distancia_km
FROM reportes
WHERE ST_DWithin(ubicacion::geography,
    ST_SetSRID(ST_MakePoint(-70.6483, -33.4569), 4326)::geography, 5000)
AND estado IN ('pendiente', 'en_atencion')
ORDER BY distancia_km;
```

### Reportes dentro del viewport del mapa (bounding box)

```sql
SELECT id, latitud, longitud, nivel_gravedad, estado
FROM reportes
WHERE ubicacion && ST_MakeEnvelope(-71.5, -34.0, -70.0, -33.0, 4326)
AND created_at > NOW() - INTERVAL '30 days';
```

---

## 5. Vistas para Dashboard

```sql
CREATE OR REPLACE VIEW v_estadisticas_dashboard AS
SELECT
    DATE(created_at) AS fecha,
    COUNT(*) AS total_reportes,
    ROUND(AVG(nivel_gravedad), 1) AS gravedad_promedio,
    COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
    COUNT(*) FILTER (WHERE estado = 'en_atencion') AS en_atencion,
    COUNT(*) FILTER (WHERE estado = 'extinguido') AS extinguidos,
    COUNT(*) FILTER (WHERE nivel_gravedad >= 4) AS criticos
FROM reportes
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW v_reportes_activos AS
SELECT r.*, u.nombre AS reportado_por_nombre, b.nombre AS atendido_por_nombre
FROM reportes r
LEFT JOIN usuarios u ON r.reportado_por = u.id
LEFT JOIN brigadistas b ON r.atendido_por = b.id
WHERE r.estado NOT IN ('extinguido')
ORDER BY r.nivel_gravedad DESC, r.created_at DESC;
```

---

## 6. Datos Semilla (Seed)

```sql
INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES
('admin@valledelsol.cl', '$2b$10$PLACEHOLDER', 'Admin Municipal', 'admin'),
('brigadista1@valledelsol.cl', '$2b$10$PLACEHOLDER', 'Carlos Pérez', 'brigadista'),
('ciudadano1@gmail.com', '$2b$10$PLACEHOLDER', 'María González', 'ciudadano');

INSERT INTO brigadistas (user_id, nombre, telefono, zona_asignada) VALUES
((SELECT id FROM usuarios WHERE email='brigadista1@valledelsol.cl'),
 'Carlos Pérez', '+56912345678', 'Zona Norte');

INSERT INTO reportes (latitud, longitud, descripcion, nivel_gravedad,
    confianza_ia, metodo_clasificacion, estado, reportado_por) VALUES
(-33.4489, -70.6693, 'Incendio forestal en cerro', 4, 87.3, 'cnn', 'en_atencion',
    (SELECT id FROM usuarios WHERE email='ciudadano1@gmail.com')),
(-33.4372, -70.6506, 'Fuego menor en pastizal', 2, 72.1, 'cnn', 'pendiente',
    (SELECT id FROM usuarios WHERE email='ciudadano1@gmail.com'));
```

---

## 7. Setup en AWS RDS

1. **AWS Console → RDS → Create database**
2. Engine: PostgreSQL 16, Template: **Free tier**
3. Instance: `db.t3.micro`, Storage: 20GB gp2
4. DB name: `incendios_db`, User: `postgres`
5. Public access: **Yes** (dev), Security Group: abrir 5432
6. Conectar con `psql` y ejecutar SQL en orden

### Variables de entorno

```env
DB_HOST=tu-instancia.xxx.rds.amazonaws.com
DB_PORT=5432
DB_NAME=incendios_db
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
DATABASE_URL=postgresql://postgres:pass@host:5432/incendios_db
```

---

## 8. Checklist

- [ ] Crear instancia RDS PostgreSQL Free Tier
- [ ] Configurar Security Group (puerto 5432)
- [ ] Conectar con psql/pgAdmin
- [ ] `CREATE EXTENSION postgis`
- [ ] Crear tipos enumerados
- [ ] Crear tablas
- [ ] Crear triggers
- [ ] Crear vistas
- [ ] Insertar seeds
- [ ] Verificar consultas PostGIS
- [ ] Guardar credenciales en `.env`
