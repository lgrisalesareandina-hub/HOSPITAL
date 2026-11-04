# Hospital ODS 3 - Aplicación web

Aplicación web para el taller de Gestión de Bases de Datos (Eje 2). Resuelve una problemática del **ODS 3 (Salud y bienestar)**: la información de pacientes, citas, historias clínicas y fórmulas médicas se registra en un solo lugar, con validaciones, control de acceso y registro de auditoría.

- Lenguaje: **JavaScript (Node.js)** con **Express**
- ORM (mapeo objeto-relacional): **Sequelize**
- Base de datos: **PostgreSQL** (`hospital_ods3`, la misma del punto 1 del taller)
- Interfaz: HTML, CSS y JavaScript (sin frameworks)

## 1. Cómo ejecutarla

Requisitos: Node.js 18 o superior y la base `hospital_ods3` ya creada con el script del punto 1.

1. En pgAdmin, conectado a `hospital_ods3`, ejecute `db/usuario_app.sql` (crea el usuario `app_hospital`). Cambie la clave.
2. En la carpeta del proyecto, copie `.env.example` a `.env` y complete `DB_PASSWORD` con esa clave.
   - Si PostgreSQL no usa el puerto 5432, cambie `DB_PORT`.
3. Abra una terminal en la carpeta y ejecute:
   ```
   npm install
   npm start
   ```
4. Abra http://localhost:3000. La consola debe decir "Conexion con PostgreSQL correcta".

Para ver el SQL que genera el ORM (útil en el video), ponga `SQL_LOG=true` en `.env` y reinicie.

## 2. Modelo relacional frente al modelo de objetos (mapeo)

El **modelo relacional** son las tablas de PostgreSQL. El **modelo de objetos** son las clases de `src/models/index.js`. El ORM traduce entre los dos, de modo que el código trabaja con objetos y no escribe SQL a mano.

| Tabla (relacional) | Clase (objetos) | Ejemplo de correspondencia de columnas |
|---|---|---|
| `especialidad` | `Especialidad` | `id_especialidad` ↔ `idEspecialidad` |
| `medico` | `Medico` | `id_especialidad` ↔ `idEspecialidad`, `usuario_bd` ↔ `usuarioBd` |
| `paciente` | `Paciente` | `fecha_nacimiento` ↔ `fechaNacimiento`, `fecha_registro` ↔ `fechaRegistro` |
| `cita` | `Cita` | `fecha_hora` ↔ `fechaHora` |
| `historia_clinica` | `HistoriaClinica` | `id_historia` ↔ `idHistoria` |
| `medicamento` | `Medicamento` | `id_medicamento` ↔ `idMedicamento` |
| `formula` | `Formula` | `duracion_dias` ↔ `duracionDias` |
| `log_auditoria` | `LogAuditoria` | solo lectura: la llena el trigger de la BD |

| Relación (llave foránea) | Asociación entre objetos |
|---|---|
| `medico.id_especialidad` → `especialidad` | `Especialidad.hasMany(Medico)` / `Medico.belongsTo(Especialidad)` |
| `cita.id_paciente` → `paciente` | `Paciente.hasMany(Cita)` / `Cita.belongsTo(Paciente)` |
| `cita.id_medico` → `medico` | `Medico.hasMany(Cita)` / `Cita.belongsTo(Medico)` |
| `historia_clinica.id_cita` → `cita` (1 a 1) | `Cita.hasOne(HistoriaClinica)` |
| `formula.id_historia` → `historia_clinica` | `HistoriaClinica.hasMany(Formula)` |
| `formula.id_medicamento` → `medicamento` | `Medicamento.hasMany(Formula)` |

Ejemplo: `Cita.findAll({ include: [Paciente, Medico] })` devuelve cada cita como un objeto con su paciente y su médico dentro; el ORM genera el `JOIN` de SQL. Lo mismo ocurre en `src/routes/citas.js` y `src/routes/historias.js`.

## 3. Persistencia de los datos

Los datos se guardan en PostgreSQL, no en memoria: si se apaga el servidor o el computador, siguen ahí.

- **Crear:** `Paciente.create(...)` ejecuta un `INSERT`.
- **Leer:** `Paciente.findAll()` ejecuta un `SELECT`.
- **Actualizar:** `paciente.update(...)` ejecuta un `UPDATE`.
- **Eliminar:** `Paciente.destroy(...)` ejecuta un `DELETE`.
- **Transacción:** al registrar una historia clínica (`POST /api/historias`) se guarda la historia y se marca la cita como *Atendida* dentro de una sola transacción. Si una de las dos operaciones falla, no se guarda ninguna (`ROLLBACK`).
- **Integridad:** las llaves foráneas, `UNIQUE` y `CHECK` de la BD siguen protegiendo los datos; la API traduce sus errores a mensajes claros.
- **Auditoría:** el trigger de la BD anota cada modificación de una historia clínica, y la pantalla *Auditoría* la muestra.

## 4. Seguridad aplicada

| Medida | Dónde |
|---|---|
| Claves y datos de conexión en variables de entorno (`.env`, fuera del código y del repositorio) | `src/db.js`, `.env.example` |
| CORS: solo el origen configurado en `CORS_ORIGIN` puede llamar a la API desde un navegador | `src/app.js` |
| Validación en el backend de todos los datos recibidos | `src/routes/*.js`, `src/validar.js` |
| Sanitización: se quitan etiquetas HTML y caracteres de control antes de guardar; solo se aceptan los campos esperados | `src/validar.js`, `src/routes/*.js` |
| Consultas parametrizadas por el ORM (protege contra inyección SQL) | Sequelize |
| Límite de peticiones (300 por 15 minutos, y 80 cambios por 15 minutos) | `src/app.js` |
| Seguridad por fila (RLS) y permisos por rol en la BD; la app usa `app_hospital`, que no es superusuario, así que PostgreSQL le aplica esas reglas | `db/usuario_app.sql`, script del taller |
| Content Security Policy: solo se ejecutan scripts y estilos del propio servidor; la interfaz usa `textContent` y no `innerHTML` | `src/app.js`, `public/app.js` |
| Otras cabeceras de seguridad (helmet), límite de tamaño del cuerpo (10 KB), errores internos sin detalles | `src/app.js` |

Limitación conocida: la aplicación no tiene inicio de sesión. Es una aplicación de práctica pensada para un solo equipo; para uso real debería agregarse autenticación de usuarios y que cada médico se conecte con su propio rol.

## 5. Estructura

```
hospital-ods3-app/
  db/usuario_app.sql        usuario de la aplicación en PostgreSQL
  src/db.js                 conexión (variables de entorno)
  src/models/index.js       modelos y asociaciones (mapeo ORM)
  src/routes/               pacientes, citas, historias, catálogos
  src/validar.js            validación y sanitización
  src/app.js                seguridad (CSP, CORS, límite de peticiones) y rutas
  src/server.js             arranque
  public/                   interfaz (index.html, styles.css, app.js)
```

## 6. Rutas de la API

| Método y ruta | Qué hace |
|---|---|
| `GET/POST /api/pacientes`, `GET/PUT/DELETE /api/pacientes/:id` | Gestión de pacientes |
| `GET/POST /api/citas`, `PATCH /api/citas/:id/estado` | Gestión de citas |
| `GET/POST /api/historias`, `POST /api/historias/:id/formulas` | Historias clínicas y fórmulas |
| `GET /api/medicos`, `/api/especialidades`, `/api/medicamentos`, `/api/auditoria` | Consultas de apoyo |
