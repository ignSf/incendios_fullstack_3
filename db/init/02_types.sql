-- ============================================================
-- 02_types.sql
-- Tipos enumerados del sistema
-- ============================================================

CREATE TYPE rol_usuario AS ENUM ('CIUDADANO', 'ADMIN', 'BRIGADISTA');
CREATE TYPE estado_reporte AS ENUM ('PENDIENTE', 'EN_ATENCION', 'CONTROLADO', 'EXTINGUIDO');
CREATE TYPE metodo_ia AS ENUM ('CNN', 'XGBOOST', 'ENSEMBLE');
CREATE TYPE tipo_alerta AS ENUM ('EMAIL', 'PUSH', 'DASHBOARD');
