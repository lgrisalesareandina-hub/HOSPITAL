// Consultas de solo lectura: medicos, especialidades, medicamentos y auditoria.
const router = require('express').Router();
const { Medico, Especialidad, Medicamento, LogAuditoria } = require('../models');

router.get('/medicos', async (req, res, next) => {
  try {
    res.json(await Medico.findAll({
      attributes: ['idMedico', 'nombres', 'apellidos', 'idEspecialidad'],
      include: [{ model: Especialidad, attributes: ['nombre'] }],
      order: [['apellidos', 'ASC']]
    }));
  } catch (e) { next(e); }
});

router.get('/especialidades', async (req, res, next) => {
  try { res.json(await Especialidad.findAll({ order: [['nombre', 'ASC']] })); } catch (e) { next(e); }
});

router.get('/medicamentos', async (req, res, next) => {
  try { res.json(await Medicamento.findAll({ order: [['nombre', 'ASC']] })); } catch (e) { next(e); }
});

router.get('/auditoria', async (req, res, next) => {
  try { res.json(await LogAuditoria.findAll({ order: [['idLog', 'DESC']], limit: 50 })); } catch (e) { next(e); }
});

module.exports = router;
