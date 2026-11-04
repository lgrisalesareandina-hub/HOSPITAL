const router = require('express').Router();
const { body, param } = require('express-validator');
const { sequelize, Cita, Paciente, Medico, HistoriaClinica, Formula, Medicamento } = require('../models');
const { limpiar, validar } = require('../validar');

const idRegla = param('id').isInt({ min: 1 }).withMessage('Identificador no valido').toInt();

router.get('/', async (req, res, next) => {
  try {
    res.json(await HistoriaClinica.findAll({
      include: [
        { model: Cita, include: [
          { model: Paciente, attributes: ['documento', 'nombres', 'apellidos'] },
          { model: Medico, attributes: ['nombres', 'apellidos'] }
        ] },
        { model: Formula, include: [{ model: Medicamento, attributes: ['nombre', 'presentacion'] }] }
      ],
      order: [['idHistoria', 'DESC']],
      limit: 100
    }));
  } catch (e) { next(e); }
});

// Persistencia con TRANSACCION: se guarda la historia y se marca la cita como Atendida.
// Si una de las dos operaciones falla, no se guarda ninguna (ROLLBACK).
router.post('/', [
  body('idCita').isInt({ min: 1 }).withMessage('Seleccione una cita').toInt(),
  body('sintomas').optional({ values: 'falsy' }).customSanitizer(limpiar).isLength({ max: 300 }).withMessage('Maximo 300 caracteres'),
  body('diagnostico').customSanitizer(limpiar).isLength({ min: 3, max: 300 }).withMessage('Diagnostico de 3 a 300 caracteres'),
  body('tratamiento').optional({ values: 'falsy' }).customSanitizer(limpiar).isLength({ max: 300 }).withMessage('Maximo 300 caracteres')
], validar, async (req, res, next) => {
  try {
    const { idCita, sintomas, diagnostico, tratamiento } = req.body;
    const historia = await sequelize.transaction(async (t) => {
      const cita = await Cita.findByPk(idCita, { transaction: t });
      if (!cita) { const e = new Error('Cita no encontrada'); e.status = 404; throw e; }
      if (cita.estado === 'Cancelada') { const e = new Error('No se puede crear historia de una cita cancelada'); e.status = 409; throw e; }
      const h = await HistoriaClinica.create(
        { idCita, sintomas: sintomas || null, diagnostico, tratamiento: tratamiento || null }, { transaction: t });
      await cita.update({ estado: 'Atendida' }, { transaction: t });
      return h;
    });
    res.status(201).json(historia);
  } catch (e) { next(e); }
});

router.post('/:id/formulas', idRegla, [
  body('idMedicamento').isInt({ min: 1 }).withMessage('Seleccione un medicamento').toInt(),
  body('dosis').customSanitizer(limpiar).isLength({ min: 3, max: 80 }).withMessage('Dosis de 3 a 80 caracteres'),
  body('duracionDias').isInt({ min: 1, max: 365 }).withMessage('Duracion entre 1 y 365 dias').toInt()
], validar, async (req, res, next) => {
  try {
    const { idMedicamento, dosis, duracionDias } = req.body;
    res.status(201).json(await Formula.create({ idHistoria: req.params.id, idMedicamento, dosis, duracionDias }));
  } catch (e) { next(e); }
});

module.exports = router;
