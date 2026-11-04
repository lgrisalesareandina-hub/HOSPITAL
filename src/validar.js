// Validacion y sanitizacion en el BACKEND (no se confia en lo que valide el navegador).
const { validationResult } = require('express-validator');

// Quita etiquetas HTML, < > y caracteres de control antes de guardar (evita inyectar HTML/scripts).
const limpiar = (v) =>
  typeof v === 'string'
    ? v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
    : v;

// Corta la peticion con 400 si alguna regla fallo.
function validar(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(400).json({
    error: 'Datos no validos',
    detalles: r.array().map((e) => ({ campo: e.path, mensaje: e.msg }))
  });
}

module.exports = { limpiar, validar };
