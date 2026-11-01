const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido, MONTO_MAX } = require('../middleware/validar');

const METODOS = ['efectivo', 'transferencia', 'otro'];

const PAGO = {
  proyecto_id: { tipo: 'entero', min: 1, obligatorio: true },
  monto: { tipo: 'entero', min: 1, max: MONTO_MAX, obligatorio: true },
  metodo: { tipo: 'opcion', opciones: METODOS, porDefecto: 'transferencia' },
  fecha: { tipo: 'fecha', obligatorio: true },
  nota: { tipo: 'texto', max: 255 },
};

// Al editar un pago no se cambia de proyecto: para eso se borra y se carga de nuevo
const { proyecto_id: _sinProyecto, ...PAGO_EDICION } = PAGO;
PAGO_EDICION.metodo = { ...PAGO.metodo, obligatorio: true };

router.param('id', idValido);

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

// Edita monto, método, fecha o nota. Igual que al crear, el proyecto se
// bloquea para que la suma de pagos nunca supere su monto total
router.put('/:id', validarBody(PAGO_EDICION), async (req, res, next) => {
  const { monto, metodo, fecha, nota } = req.datos;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[pago]] = await conn.execute('SELECT proyecto_id FROM pagos WHERE id = ?', [req.params.id]);
    if (!pago) { await conn.rollback(); return res.status(404).json({ error: 'Pago no encontrado' }); }
    const [[p]] = await conn.execute('SELECT monto_total FROM proyectos WHERE id = ? FOR UPDATE', [pago.proyecto_id]);
    const [[{ otros }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS otros FROM pagos WHERE proyecto_id = ? AND id <> ?', [pago.proyecto_id, req.params.id]);
    if (otros + monto > p.monto_total) {
      await conn.rollback();
      return res.status(400).json({ error: 'El pago supera el saldo del proyecto', saldo: p.monto_total - otros });
    }
    await conn.execute('UPDATE pagos SET monto=?, metodo=?, fecha=?, nota=? WHERE id=?', [monto, metodo, fecha, nota, req.params.id]);
    await conn.commit();
    res.json({ id: Number(req.params.id), proyecto_id: pago.proyecto_id, monto, metodo, fecha, nota });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM pagos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pago no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
