-- ============================================================
-- 05_views.sql
-- Vistas para el dashboard
-- ============================================================

CREATE OR REPLACE VIEW v_estadisticas_dashboard AS
SELECT
    DATE(created_at) AS fecha,
    COUNT(*) AS total_reportes,
    ROUND(AVG(nivel_gravedad)::numeric, 1) AS gravedad_promedio,
    COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
    COUNT(*) FILTER (WHERE estado = 'EN_ATENCION') AS en_atencion,
    COUNT(*) FILTER (WHERE estado = 'CONTROLADO') AS controlados,
    COUNT(*) FILTER (WHERE estado = 'EXTINGUIDO') AS extinguidos,
    COUNT(*) FILTER (WHERE nivel_gravedad >= 4) AS criticos
FROM reportes
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW v_reportes_activos AS
SELECT
    r.id, r.created_at, r.latitud, r.longitud,
    r.direccion, r.comuna, r.descripcion, r.foto_url,
    r.nivel_gravedad, r.confianza_ia, r.estado,
    u.nombre AS reportado_por_nombre,
    b.nombre AS atendido_por_nombre
FROM reportes r
LEFT JOIN usuarios u ON r.reportado_por = u.id
LEFT JOIN brigadistas b ON r.atendido_por = b.id
WHERE r.estado NOT IN ('EXTINGUIDO')
ORDER BY r.nivel_gravedad DESC, r.created_at DESC;
