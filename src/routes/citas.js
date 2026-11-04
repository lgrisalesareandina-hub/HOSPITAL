const router = require('express').Router();
const { body, param } = require('express-validator');
const { Cita, Paciente, Medico, Especialidad } = require('../models');
const { limpiar, validar } = require('../validar');

const idRegla = param('id').isInt({ min: 1 }).withMessage('Identificador no valido').toInt();
const ESTADOS = ['Programada', 'Atendida', 'Cancelada'];

router.get('/', async (req, res, next) => {
  try {
    // El ORM arma los JOIN a partir de las asociaciones (Cita -> Paciente, Cita -> Medico)
    res.json(await Cita.findAll({
      include: [
        { model: Paciente, attributes: ['idPaciente', 'documento', 'nombres', 'apellidos'] },
        { model: Medico, attributes: ['idMedico', 'nombres', 'apellidos'], include: [{ model: Especialidad, attributes: ['nombre'] }] }
      ],
      order: [['fechaHora', 'DESC']],
      limit: 200
    }));
  } catch (e) { next(e); }
});

router.post('/', [
  body('idPaciente').isInt({ min: 1 }).withMessage('Seleccione un paciente').toInt(),
  body('idMedico').isInt({ min: 1 }).withMessage('Seleccione un medico').toInt(),
  body('fechaHora').isISO8601().withMessage('Fecha y hora no validas'),
  body('motivo').optional({ values: 'falsy' }).customSanitizer(limpiar).isLength({ max: 200 }).withMessage('Maximo 200 caracteres')
], validar, async (req, res, next) => {
  try {
    const { idPaciente, idMedico, fechaHora, motivo } = req.body;
    res.status(201).json(await Cita.create({ idPaciente, idMedico, fechaHora: new Date(fechaHora), motivo: motivo || null }));
  } catch (e) { next(e); }
});

router.patch('/:id/estado', idRegla, [
  body('estado').isIn(ESTADOS).withMessage(`Estado debe ser: ${ESTADOS.join(', ')}`)
], validar, async (req, res, next) => {
  try {
    const c = await Cita.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cita no encontrada' });
    await c.update({ estado: req.body.estado });
    return res.json(c);
  } catch (e) { return next(e); }
});

module.exports = router;
