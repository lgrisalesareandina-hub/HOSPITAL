'use strict';
// Interfaz de la aplicacion. Todo el texto que viene de la API se escribe con textContent
// (nunca con innerHTML), asi un dato malicioso no puede ejecutarse como codigo.

const $ = (id) => document.getElementById(id);
const fechaHora = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const fechaCorta = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' });

function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const h of hijos.flat()) n.append(h instanceof Node ? h : document.createTextNode(h ?? ''));
  return n;
}

async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
  const r = await fetch('/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  if (r.status === 204) return null;
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(datos.error || 'No se pudo completar la operación');
    e.detalles = datos.detalles;
    throw e;
  }
  return datos;
}

let temporizador;
function aviso(mensaje, tipo = 'ok', detalles) {
  const caja = $('aviso');
  caja.className = 'aviso ' + tipo;
  caja.replaceChildren(mensaje);
  if (detalles && detalles.length) caja.append(el('ul', {}, detalles.map((d) => el('li', {}, `${d.campo}: ${d.mensaje}`))));
  clearTimeout(temporizador);
  if (tipo === 'ok') temporizador = setTimeout(() => caja.classList.add('oculto'), 4000);
}
const fallo = (e) => aviso(e.message, 'error', e.detalles);

function llenar(select, items, valor, texto, primera) {
  select.replaceChildren(el('option', { value: '' }, primera));
  for (const it of items) select.append(el('option', { value: it[valor] }, texto(it)));
}
function filas(tbody, items, columnas, vacio) {
  tbody.replaceChildren();
  if (!items.length) { tbody.append(el('tr', {}, el('td', { class: 'vacio', colspan: columnas }, vacio))); return; }
  for (const f of items) tbody.append(f);
}
const datosForm = (form) => Object.fromEntries(new FormData(form).entries());

/* ---------------- Pacientes ---------------- */
const formP = $('form-paciente');
function editarPaciente(p) {
  formP.idPaciente.value = p.idPaciente;
  for (const c of ['documento', 'nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'direccion', 'eps']) formP[c].value = p[c] ?? '';
  $('titulo-paciente').textContent = 'Editar paciente';
  $('guardar-paciente').textContent = 'Guardar cambios';
  $('cancelar-paciente').classList.remove('oculto');
  formP.documento.focus();
}
function limpiarPaciente() {
  formP.reset(); formP.idPaciente.value = '';
  $('titulo-paciente').textContent = 'Registrar paciente';
  $('guardar-paciente').textContent = 'Guardar paciente';
  $('cancelar-paciente').classList.add('oculto');
}
async function cargarPacientes() {
  const lista = await api('/pacientes');
  $('cuenta-pacientes').textContent = `${lista.length} registrados`;
  filas($('tabla-pacientes'), lista.map((p) => el('tr', {},
    el('td', {}, p.documento),
    el('td', {}, `${p.nombres} ${p.apellidos}`),
    el('td', {}, fechaCorta(p.fechaNacimiento)),
    el('td', {}, p.eps || '-'),
    el('td', {}, el('div', { class: 'acciones' },
      el('button', { type: 'button', class: 'secundario mini', onclick: () => editarPaciente(p) }, 'Editar'),
      el('button', { type: 'button', class: 'peligro mini', onclick: () => eliminarPaciente(p) }, 'Eliminar'))))),
  5, 'Todavía no hay pacientes. Registre el primero con el formulario.');
}
async function eliminarPaciente(p) {
  if (!confirm(`¿Eliminar a ${p.nombres} ${p.apellidos}? Esta acción no se puede deshacer.`)) return;
  try { await api('/pacientes/' + p.idPaciente, { metodo: 'DELETE' }); aviso('Paciente eliminado'); await cargarPacientes(); } catch (e) { fallo(e); }
}
formP.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = datosForm(formP); const id = d.idPaciente; delete d.idPaciente;
  try {
    await api(id ? '/pacientes/' + id : '/pacientes', { metodo: id ? 'PUT' : 'POST', cuerpo: d });
    aviso(id ? 'Cambios guardados' : 'Paciente registrado'); limpiarPaciente(); await cargarPacientes();
  } catch (e) { fallo(e); }
});
$('cancelar-paciente').addEventListener('click', limpiarPaciente);

/* ---------------- Citas ---------------- */
const formC = $('form-cita');
async function cargarCitas() {
  const [citas, pacientes, medicos] = await Promise.all([api('/citas'), api('/pacientes'), api('/medicos')]);
  llenar(formC.idPaciente, pacientes, 'idPaciente', (p) => `${p.nombres} ${p.apellidos} (${p.documento})`, 'Seleccione un paciente');
  llenar(formC.idMedico, medicos, 'idMedico', (m) => `${m.nombres} ${m.apellidos} - ${m.Especialidad?.nombre ?? ''}`, 'Seleccione un médico');
  $('cuenta-citas').textContent = `${citas.length} citas`;
  filas($('tabla-citas'), citas.map((c) => {
    const estado = el('select', { 'aria-label': 'Estado de la cita', onchange: (ev) => cambiarEstado(c.idCita, ev.target.value) },
      ['Programada', 'Atendida', 'Cancelada'].map((s) => el('option', { value: s, selected: s === c.estado }, s)));
    return el('tr', {},
      el('td', {}, fechaHora(c.fechaHora)),
      el('td', {}, `${c.Paciente.nombres} ${c.Paciente.apellidos}`),
      el('td', {}, `${c.Medico.nombres} ${c.Medico.apellidos}`, el('br'), c.Medico.Especialidad?.nombre ?? ''),
      el('td', {}, c.motivo || '-'),
      el('td', {}, estado));
  }), 5, 'No hay citas programadas.');
}
async function cambiarEstado(id, estado) {
  try { await api(`/citas/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } }); aviso('Estado actualizado'); await cargarCitas(); } catch (e) { fallo(e); await cargarCitas(); }
}
formC.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = datosForm(formC);
  if (d.fechaHora) d.fechaHora = new Date(d.fechaHora).toISOString();
  try { await api('/citas', { metodo: 'POST', cuerpo: d }); aviso('Cita programada'); formC.reset(); await cargarCitas(); } catch (e) { fallo(e); }
});

/* ---------------- Historias clinicas ---------------- */
const formH = $('form-historia');
const formF = $('form-formula');
async function cargarHistorias() {
  const [historias, citas, medicamentos] = await Promise.all([api('/historias'), api('/citas'), api('/medicamentos')]);
  const conHistoria = new Set(historias.map((h) => h.idCita));
  const disponibles = citas.filter((c) => c.estado !== 'Cancelada' && !conHistoria.has(c.idCita));
  llenar(formH.idCita, disponibles, 'idCita',
    (c) => `${fechaHora(c.fechaHora)} - ${c.Paciente.nombres} ${c.Paciente.apellidos}`, 'Seleccione una cita');
  llenar(formF.idHistoria, historias, 'idHistoria',
    (h) => `#${h.idHistoria} ${h.Cita.Paciente.nombres} ${h.Cita.Paciente.apellidos} - ${h.diagnostico}`, 'Seleccione una historia');
  llenar(formF.idMedicamento, medicamentos, 'idMedicamento', (m) => `${m.nombre} (${m.presentacion ?? ''})`, 'Seleccione un medicamento');
  $('cuenta-historias').textContent = `${historias.length} historias`;
  filas($('tabla-historias'), historias.map((h) => el('tr', {},
    el('td', {}, `${h.Cita.Paciente.nombres} ${h.Cita.Paciente.apellidos}`, el('br'), fechaHora(h.Cita.fechaHora)),
    el('td', {}, `${h.Cita.Medico.nombres} ${h.Cita.Medico.apellidos}`),
    el('td', {}, h.diagnostico),
    el('td', {}, h.tratamiento || '-'),
    el('td', {}, h.Formulas.length
      ? h.Formulas.map((f) => el('span', { class: 'formula-item' }, `${f.Medicamento.nombre}: ${f.dosis}, ${f.duracionDias} días`))
      : '-'))),
  5, 'Todavía no hay historias clínicas.');
}
formH.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try { await api('/historias', { metodo: 'POST', cuerpo: datosForm(formH) }); aviso('Historia clínica registrada y cita marcada como atendida'); formH.reset(); await cargarHistorias(); } catch (e) { fallo(e); }
});
formF.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = datosForm(formF); const id = d.idHistoria; delete d.idHistoria;
  if (!id) { aviso('Seleccione una historia clínica', 'error'); return; }
  try { await api(`/historias/${id}/formulas`, { metodo: 'POST', cuerpo: d }); aviso('Fórmula agregada'); formF.reset(); await cargarHistorias(); } catch (e) { fallo(e); }
});

/* ---------------- Auditoria ---------------- */
async function cargarAuditoria() {
  const lista = await api('/auditoria');
  $('cuenta-auditoria').textContent = `${lista.length} eventos recientes`;
  filas($('tabla-auditoria'), lista.map((l) => el('tr', {},
    el('td', {}, fechaHora(l.fecha)), el('td', {}, l.usuario), el('td', {}, l.accion), el('td', {}, l.tabla))),
  4, 'Aún no se han modificado historias clínicas.');
}

/* ---------------- Navegacion por #hash ---------------- */
const vistas = { pacientes: cargarPacientes, citas: cargarCitas, historias: cargarHistorias, auditoria: cargarAuditoria };
async function mostrar() {
  const nombre = vistas[location.hash.slice(1)] ? location.hash.slice(1) : 'pacientes';
  for (const v of Object.keys(vistas)) {
    $('vista-' + v).classList.toggle('oculto', v !== nombre);
    document.querySelector(`[data-vista="${v}"]`).classList.toggle('activa', v === nombre);
  }
  $('aviso').classList.add('oculto');
  try { await vistas[nombre](); } catch (e) { fallo(e); }
}
window.addEventListener('hashchange', mostrar);
mostrar();
