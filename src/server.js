const app = require('./app');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    await sequelize.authenticate(); // comprueba la conexion con PostgreSQL
    console.log('Conexion con PostgreSQL correcta');
    app.listen(PORT, () => console.log(`Aplicacion en http://localhost:${PORT}`));
  } catch (e) {
    console.error('No se pudo conectar con la base de datos:', e.message);
    process.exit(1);
  }
})();
