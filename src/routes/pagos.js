const router = require('express').Router();
const db = require('../db');

const METODOS = ['efectivo', 'transferencia', 'otro'];

router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    const [rows] = proyecto_id
      ? await db.execute('SELECT * FROM pagos WHERE proyecto_id = ? ORDER BY fecha DESC', [proyecto_id])
      : await db.execute('SELECT * FROM pagos ORDER BY fecha DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

// Registra un pago y evita pasarse del monto total del proyecto (transacción)
router.post('/', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { proyecto_id, monto, metodo = 'transferencia', fecha, nota = null } = req.body;
    if (!proyecto_id || !(monto > 0) || !fecha)
      return res.status(400).json({ error: 'proyecto_id, monto (>0) y fecha son obligatorios' });
    if (!METODOS.includes(metodo)) return res.status(400).json({ error: `metodo debe ser: ${METODOS.join(', ')}` });

    await conn.beginTransaction();
    const [[p]] = await conn.execute('SELECT monto_total FROM proyectos WHERE id = ? FOR UPDATE', [proyecto_id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Proyecto no encontrado' }); }
    const [[{ pagado }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE proyecto_id = ?', [proyecto_id]);
    if (Number(pagado) + Number(monto) > Number(p.monto_total)) {
      await conn.rollback();
      return res.status(400).json({ error: 'El pago supera el saldo del proyecto', saldo: Number(p.monto_total) - Number(pagado) });
    }
    const [r] = await conn.execute(
      'INSERT INTO pagos (proyecto_id, monto, metodo, fecha, nota) VALUES (?, ?, ?, ?, ?)',
      [proyecto_id, monto, metodo, fecha, nota]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, proyecto_id, monto, metodo, fecha, nota });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
