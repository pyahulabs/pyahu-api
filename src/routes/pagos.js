const router = require('express').Router();
const db = require('../db');
const { validarBody, MONTO_MAX } = require('../middleware/validar');

const METODOS = ['efectivo', 'transferencia', 'otro'];

const PAGO = {
  proyecto_id: { tipo: 'entero', min: 1, obligatorio: true },
  monto: { tipo: 'entero', min: 1, max: MONTO_MAX, obligatorio: true },
  metodo: { tipo: 'opcion', opciones: METODOS, porDefecto: 'transferencia' },
  fecha: { tipo: 'fecha', obligatorio: true },
  nota: { tipo: 'texto', max: 255 },
};

router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    if (proyecto_id !== undefined && !/^[1-9]\d*$/.test(proyecto_id))
      return res.status(400).json({ error: 'proyecto_id inválido' });
    const [rows] = proyecto_id
      ? await db.execute('SELECT * FROM pagos WHERE proyecto_id = ? ORDER BY fecha DESC', [proyecto_id])
      : await db.execute('SELECT * FROM pagos ORDER BY fecha DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

// Registra un pago y evita pasarse del monto total del proyecto (transacción).
// Los datos se validan antes de pedir una conexión al pool.
router.post('/', validarBody(PAGO), async (req, res, next) => {
  const { proyecto_id, monto, metodo, fecha, nota } = req.datos;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.execute('SELECT monto_total FROM proyectos WHERE id = ? FOR UPDATE', [proyecto_id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Proyecto no encontrado' }); }
    const [[{ pagado }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE proyecto_id = ?', [proyecto_id]);
    if (Number(pagado) + monto > Number(p.monto_total)) {
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
