-- ============================================================
-- 06_seeds.sql
-- Datos de prueba
-- Los passwords son 'password123' hasheados con BCrypt
-- ============================================================

INSERT INTO usuarios (email, password_hash, nombre, telefono, rol) VALUES
('admin@valledelsol.cl', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin Municipal', '+56911111111', 'ADMIN'),
('brigadista1@valledelsol.cl', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Carlos Pérez', '+56922222222', 'BRIGADISTA'),
('ciudadano1@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'María González', '+56933333333', 'CIUDADANO');

INSERT INTO brigadistas (user_id, nombre, telefono, zona_asignada) VALUES
((SELECT id FROM usuarios WHERE email = 'brigadista1@valledelsol.cl'),
 'Carlos Pérez', '+56922222222', 'Zona Norte');

INSERT INTO reportes (latitud, longitud, descripcion, nivel_gravedad, confianza_ia, metodo_clasificacion, estado, reportado_por)
VALUES
(-33.4489, -70.6693, 'Incendio forestal en cerro San Cristóbal, humo visible', 4, 87.3, 'CNN', 'EN_ATENCION',
    (SELECT id FROM usuarios WHERE email = 'ciudadano1@gmail.com')),
(-33.4372, -70.6506, 'Fuego menor en pastizal cerca de parque', 2, 72.1, 'CNN', 'PENDIENTE',
    (SELECT id FROM usuarios WHERE email = 'ciudadano1@gmail.com')),
(-33.4569, -70.6483, 'Incendio en bodega industrial zona sur', 5, 94.5, 'ENSEMBLE', 'PENDIENTE',
    (SELECT id FROM usuarios WHERE email = 'ciudadano1@gmail.com'));
