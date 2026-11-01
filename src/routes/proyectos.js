const router = require('express').Router();
const db = require('../db');

const ESTADOS = ['presupuesto', 'en_curso', 'entregado', 'cancelado'];

// Lista de proyectos con lo pagado y el saldo pendiente
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, c.nombre AS cliente,
             COALESCE(SUM(g.monto), 0) AS pagado,
             p.monto_total - COALESCE(SUM(g.monto), 0) AS saldo
      FROM proyectos p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN pagos g ON g.proyecto_id = p.id
      GROUP BY p.id ORDER BY p.id DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { cliente_id, nombre, descripcion = null, estado = 'presupuesto', monto_total = 0 } = req.body;
    if (!cliente_id || !nombre) return res.status(400).json({ error: 'cliente_id y nombre son obligatorios' });
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `estado debe ser: ${ESTADOS.join(', ')}` });
    if (!(monto_total >= 0)) return res.status(400).json({ error: 'monto_total inválido' });
    const [r] = await db.execute(
      'INSERT INTO proyectos (cliente_id, nombre, descripcion, estado, monto_total) VALUES (?, ?, ?, ?, ?)',
      [cliente_id, nombre, descripcion, estado, monto_total]);
    res.status(201).json({ id: r.insertId, cliente_id, nombre, descripcion, estado, monto_total });
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El cliente no existe' });
    next(e);
  }
});

router.patch('/:id/estado', async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `estado debe ser: ${ESTADOS.join(', ')}` });
    const [r] = await db.execute('UPDATE proyectos SET estado=? WHERE id=?', [estado, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json({ id: Number(req.params.id), estado });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM proyectos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
