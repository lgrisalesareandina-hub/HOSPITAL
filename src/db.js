// Conexion a PostgreSQL mediante Sequelize (ORM).
// Los datos de conexion salen de variables de entorno, nunca del codigo.
require('dotenv').config();
const pg = require('pg');
const { Sequelize } = require('sequelize');

for (const k of ['DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
  if (!process.env[k]) {
    console.error(`Falta la variable de entorno ${k}. Copie .env.example a .env y complete los datos.`);
    process.exit(1);
  }
}

// Las columnas "timestamp" no guardan zona horaria: se interpretan con DB_TIMEZONE
// para que lo escrito por la app y lo leido coincidan siempre.
const TZ = process.env.DB_TIMEZONE || '-05:00';
pg.types.setTypeParser(1114, (v) => new Date(v.replace(' ', 'T') + TZ));

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  timezone: TZ,
  logging: process.env.SQL_LOG === 'true' ? (sql) => console.log('[SQL]', sql) : false,
  define: { timestamps: false, freezeTableName: true }
});

module.exports = sequelize;
