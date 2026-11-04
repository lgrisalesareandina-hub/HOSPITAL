-- Usuario de la APLICACION (no se usa el superusuario postgres).
-- Se ejecuta UNA vez en pgAdmin, conectado a hospital_ods3, despues del script del taller.
-- Cambie la clave y use la misma en el archivo .env (DB_PASSWORD).
-- Al NO ser superusuario, PostgreSQL le aplica los permisos del rol y la seguridad por fila (RLS).
CREATE USER app_hospital WITH PASSWORD 'CambieEstaClave#2026';
GRANT rol_administrador TO app_hospital;
