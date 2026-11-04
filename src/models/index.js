/*
 * MAPEO OBJETO-RELACIONAL (ORM)
 * Cada clase (modelo) representa una tabla del modelo relacional de hospital_ods3.
 *   - Atributo del objeto (camelCase)  <->  columna de la tabla (snake_case), con "field".
 *   - Llave foranea de la tabla        <->  asociacion entre objetos (hasMany / belongsTo).
 * Los modelos NO crean ni modifican las tablas: usan las que ya existen en la BD.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const pk = (field) => ({ type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field });
const fk = (field) => ({ type: DataTypes.INTEGER, allowNull: false, field });

// tabla especialidad -> clase Especialidad
const Especialidad = sequelize.define('Especialidad', {
  idEspecialidad: pk('id_especialidad'),
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true }
}, { tableName: 'especialidad' });

// tabla medico -> clase Medico
const Medico = sequelize.define('Medico', {
  idMedico: pk('id_medico'),
  documento: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombres: { type: DataTypes.STRING(80), allowNull: false },
  apellidos: { type: DataTypes.STRING(80), allowNull: false },
  telefono: DataTypes.STRING(20),
  correo: DataTypes.STRING(100),
  usuarioBd: { type: DataTypes.STRING(63), field: 'usuario_bd' },
  idEspecialidad: fk('id_especialidad')
}, { tableName: 'medico' });

// tabla paciente -> clase Paciente
const Paciente = sequelize.define('Paciente', {
  idPaciente: pk('id_paciente'),
  documento: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombres: { type: DataTypes.STRING(80), allowNull: false },
  apellidos: { type: DataTypes.STRING(80), allowNull: false },
  fechaNacimiento: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_nacimiento' },
  sexo: { type: DataTypes.CHAR(1), allowNull: false },
  telefono: DataTypes.STRING(20),
  direccion: DataTypes.STRING(120),
  eps: DataTypes.STRING(80),
  fechaRegistro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'fecha_registro' }
}, { tableName: 'paciente' });

// tabla cita -> clase Cita
const Cita = sequelize.define('Cita', {
  idCita: pk('id_cita'),
  idPaciente: fk('id_paciente'),
  idMedico: fk('id_medico'),
  fechaHora: { type: DataTypes.DATE, allowNull: false, field: 'fecha_hora' },
  motivo: DataTypes.STRING(200),
  estado: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'Programada' }
}, { tableName: 'cita', name: { singular: 'Cita', plural: 'Citas' } });

// tabla historia_clinica -> clase HistoriaClinica
const HistoriaClinica = sequelize.define('HistoriaClinica', {
  idHistoria: pk('id_historia'),
  idCita: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'id_cita' },
  sintomas: DataTypes.STRING(300),
  diagnostico: { type: DataTypes.STRING(300), allowNull: false },
  tratamiento: DataTypes.STRING(300),
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'historia_clinica' });

// tabla medicamento -> clase Medicamento
const Medicamento = sequelize.define('Medicamento', {
  idMedicamento: pk('id_medicamento'),
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  presentacion: DataTypes.STRING(60)
}, { tableName: 'medicamento' });

// tabla formula -> clase Formula
const Formula = sequelize.define('Formula', {
  idFormula: pk('id_formula'),
  idHistoria: fk('id_historia'),
  idMedicamento: fk('id_medicamento'),
  dosis: { type: DataTypes.STRING(80), allowNull: false },
  duracionDias: { type: DataTypes.INTEGER, allowNull: false, field: 'duracion_dias' }
}, { tableName: 'formula' });

// tabla log_auditoria -> clase LogAuditoria (solo lectura desde la app; la llena el trigger)
const LogAuditoria = sequelize.define('LogAuditoria', {
  idLog: pk('id_log'),
  usuario: DataTypes.STRING(100),
  accion: DataTypes.STRING(20),
  tabla: DataTypes.STRING(50),
  fecha: DataTypes.DATE
}, { tableName: 'log_auditoria' });

// Asociaciones = llaves foraneas del modelo relacional
Especialidad.hasMany(Medico, { foreignKey: 'idEspecialidad' });
Medico.belongsTo(Especialidad, { foreignKey: 'idEspecialidad' });

Paciente.hasMany(Cita, { foreignKey: 'idPaciente' });
Cita.belongsTo(Paciente, { foreignKey: 'idPaciente' });

Medico.hasMany(Cita, { foreignKey: 'idMedico' });
Cita.belongsTo(Medico, { foreignKey: 'idMedico' });

Cita.hasOne(HistoriaClinica, { foreignKey: 'idCita' });
HistoriaClinica.belongsTo(Cita, { foreignKey: 'idCita' });

HistoriaClinica.hasMany(Formula, { foreignKey: 'idHistoria' });
Formula.belongsTo(HistoriaClinica, { foreignKey: 'idHistoria' });

Medicamento.hasMany(Formula, { foreignKey: 'idMedicamento' });
Formula.belongsTo(Medicamento, { foreignKey: 'idMedicamento' });

module.exports = {
  sequelize, Especialidad, Medico, Paciente, Cita,
  HistoriaClinica, Medicamento, Formula, LogAuditoria
};
