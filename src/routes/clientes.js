const router = require('express').Router();
const db = require('../db');

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

router.post('/', async (req, res, next) => {
  try {
    const { nombre, email = null, telefono = null, ruc_ci = null } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
    const [r] = await db.execute(
      'INSERT INTO clientes (nombre, email, telefono, ruc_ci) VALUES (?, ?, ?, ?)',
      [nombre, email, telefono, ruc_ci]);
    res.status(201).json({ id: r.insertId, nombre, email, telefono, ruc_ci });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, email = null, telefono = null, ruc_ci = null } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
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
