const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } = require('sequelize');

const app = express();

// 1) Content Security Policy: solo se ejecutan scripts y estilos del propio servidor.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null // la app corre en http://localhost
    }
  }
}));

// 2) CORS: solo el origen configurado puede llamar a la API desde un navegador.
const origenes = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use('/api', cors({
  origin: (origin, cb) => (!origin || origenes.includes(origin) ? cb(null, true) : cb(new Error('Origen no permitido por CORS'))),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

// 3) Limite de peticiones (rate limiting) para frenar abusos.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intente de nuevo en unos minutos.' } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: true, legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { error: 'Demasiados cambios seguidos. Intente de nuevo en unos minutos.' } }));

app.use(express.json({ limit: '10kb' }));

app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/historias', require('./routes/historias'));
app.use('/api', require('./routes/catalogos'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Manejo de errores: traduce los errores de la BD a mensajes claros, sin mostrar detalles internos.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof UniqueConstraintError) return res.status(409).json({ error: 'Ya existe un registro con ese dato (por ejemplo, el documento o la historia de esa cita).' });
  if (err instanceof ForeignKeyConstraintError) return res.status(409).json({ error: 'La operacion depende de otros registros (por ejemplo, el paciente tiene citas o el dato relacionado no existe).' });
  if (err instanceof ValidationError) return res.status(400).json({ error: 'Datos no validos' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON mal formado' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  if (err.message === 'Origen no permitido por CORS') return res.status(403).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
