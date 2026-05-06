-- ============================================================
-- 04_triggers.sql
-- Triggers automáticos
-- ============================================================

-- Auto-generar columna PostGIS desde lat/lng
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
    ON reportes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_ubicacion_geometry();

-- Registrar cambios de estado automáticamente
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
    AFTER UPDATE OF estado
    ON reportes
    FOR EACH ROW
    EXECUTE FUNCTION registrar_cambio_estado();
