const router = require('express').Router();
const { body, param } = require('express-validator');
const { Paciente } = require('../models');
const { limpiar, validar } = require('../validar');

const nombre = (campo) =>
  body(campo).customSanitizer(limpiar).isLength({ min: 2, max: 80 }).withMessage('Entre 2 y 80 caracteres')
    .matches(/^[\p{L}][\p{L} '.-]*$/u).withMessage('Solo letras, espacios, apostrofe, punto y guion');

const reglas = [
  body('documento').customSanitizer(limpiar).matches(/^[0-9A-Za-z-]{5,20}$/).withMessage('Documento de 5 a 20 letras, numeros o guion'),
  nombre('nombres'),
  nombre('apellidos'),
  body('fechaNacimiento').isISO8601({ strict: true }).withMessage('Fecha no valida (AAAA-MM-DD)')
    .custom((v) => new Date(v) <= new Date()).withMessage('La fecha no puede ser futura'),
  body('sexo').isIn(['F', 'M']).withMessage('Sexo debe ser F o M'),
  body('telefono').optional({ values: 'falsy' }).customSanitizer(limpiar).matches(/^[0-9+() -]{7,20}$/).withMessage('Telefono no valido'),
  body('direccion').optional({ values: 'falsy' }).customSanitizer(limpiar).isLength({ max: 120 }).withMessage('Maximo 120 caracteres'),
  body('eps').optional({ values: 'falsy' }).customSanitizer(limpiar).isLength({ max: 80 }).withMessage('Maximo 80 caracteres')
];
const idRegla = param('id').isInt({ min: 1 }).withMessage('Identificador no valido').toInt();

// Solo se aceptan estos campos (evita que el cliente escriba otros, como idPaciente)
const campos = ({ documento, nombres, apellidos, fechaNacimiento, sexo, telefono, direccion, eps }) =>
  ({ documento, nombres, apellidos, fechaNacimiento, sexo, telefono: telefono || null, direccion: direccion || null, eps: eps || null });

router.get('/', async (req, res, next) => {
  try { res.json(await Paciente.findAll({ order: [['idPaciente', 'DESC']], limit: 200 })); } catch (e) { next(e); }
});

router.get('/:id', idRegla, validar, async (req, res, next) => {
  try {
    const p = await Paciente.findByPk(req.params.id);
    return p ? res.json(p) : res.status(404).json({ error: 'Paciente no encontrado' });
  } catch (e) { return next(e); }
});

router.post('/', reglas, validar, async (req, res, next) => {
  try { res.status(201).json(await Paciente.create(campos(req.body))); } catch (e) { next(e); }
});

router.put('/:id', idRegla, reglas, validar, async (req, res, next) => {
  try {
    const p = await Paciente.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
    await p.update(campos(req.body));
    return res.json(p);
  } catch (e) { return next(e); }
});

router.delete('/:id', idRegla, validar, async (req, res, next) => {
  try {
    const n = await Paciente.destroy({ where: { idPaciente: req.params.id } });
    return n ? res.status(204).end() : res.status(404).json({ error: 'Paciente no encontrado' });
  } catch (e) { return next(e); }
});

module.exports = router;
