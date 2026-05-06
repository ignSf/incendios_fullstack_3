-- ============================================================
-- 03_tables.sql
-- Todas las tablas del sistema
-- ============================================================

-- USUARIOS
CREATE TABLE usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    rol rol_usuario DEFAULT 'CIUDADANO',
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
    ubicacion GEOMETRY(Point, 4326),
    direccion TEXT,
    comuna TEXT,
    descripcion TEXT,
    foto_url TEXT,
    nivel_gravedad INTEGER CHECK (nivel_gravedad BETWEEN 1 AND 5),
    confianza_ia DOUBLE PRECISION CHECK (confianza_ia BETWEEN 0 AND 100),
    metodo_clasificacion metodo_ia,
    clasificado_at TIMESTAMPTZ,
    estado estado_reporte DEFAULT 'PENDIENTE',
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
