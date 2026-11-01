const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido } = require('../middleware/validar');

const CLIENTE = {
  nombre: { tipo: 'texto', max: 150, obligatorio: true },
  email: { tipo: 'email' },
  telefono: { tipo: 'texto', patron: /^[0-9+()\s-]{6,30}$/, mensaje: 'solo admite números, espacios, +, - y paréntesis (6 a 30)' },
  // RUC paraguayo (1234567-8) o solo el número de cédula
  ruc_ci: { tipo: 'texto', patron: /^\d{3,12}(-\d)?$/, mensaje: 'debe ser un número de CI o un RUC como 1234567-8' },
};

router.param('id', idValido);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM clientes ORDER BY id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', validarBody(CLIENTE), async (req, res, next) => {
  try {
    const { nombre, email, telefono, ruc_ci } = req.datos;
    const [r] = await db.execute(
      'INSERT INTO clientes (nombre, email, telefono, ruc_ci) VALUES (?, ?, ?, ?)',
      [nombre, email, telefono, ruc_ci]);
    res.status(201).json({ id: r.insertId, nombre, email, telefono, ruc_ci });
  } catch (e) { next(e); }
});

router.put('/:id', validarBody(CLIENTE), async (req, res, next) => {
  try {
    const { nombre, email, telefono, ruc_ci } = req.datos;
    const [r] = await db.execute(
      'UPDATE clientes SET nombre=?, email=?, telefono=?, ruc_ci=? WHERE id=?',
      [nombre, email, telefono, ruc_ci, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ id: Number(req.params.id), nombre, email, telefono, ruc_ci });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
