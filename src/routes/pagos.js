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
  // ¿Se le dio factura por este pago? El número es opcional (001-001-0000123)
  facturado: { tipo: 'booleano', porDefecto: false },
  factura_numero: { tipo: 'texto', max: 30 },
};

// Al editar un pago no se cambia de proyecto: para eso se borra y se carga de nuevo.
// metodo y facturado no pueden faltar, para que un PUT no los pise sin querer
const { proyecto_id: _sinProyecto, ...PAGO_EDICION } = PAGO;
PAGO_EDICION.metodo = { ...PAGO.metodo, obligatorio: true };
PAGO_EDICION.facturado = { ...PAGO.facturado, obligatorio: true };

const FACTURA = {
  facturado: { tipo: 'booleano', obligatorio: true },
  factura_numero: { tipo: 'texto', max: 30 },
};

// MySQL guarda los sí/no como 1 y 0: la API devuelve true y false
const limpiar = (pago) => ({ ...pago, facturado: Boolean(pago.facturado) });
// Sin factura no hay número de factura
const numeroDe = (d) => (d.facturado ? d.factura_numero : null);

router.param('id', idValido);

router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    if (proyecto_id !== undefined && !/^[1-9]\d*$/.test(proyecto_id))
      return res.status(400).json({ error: 'proyecto_id inválido' });
    const [rows] = proyecto_id
      ? await db.execute('SELECT * FROM pagos WHERE proyecto_id = ? ORDER BY fecha DESC, id DESC', [proyecto_id])
      : await db.execute('SELECT * FROM pagos ORDER BY fecha DESC, id DESC');
    res.json(rows.map(limpiar));
  } catch (e) { next(e); }
});

// Registra un pago y evita pasarse del monto total del proyecto (transacción).
// Los datos se validan antes de pedir una conexión al pool.
router.post('/', validarBody(PAGO), async (req, res, next) => {
  const { proyecto_id, monto, metodo, fecha, nota, facturado } = req.datos;
  const factura_numero = numeroDe(req.datos);
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
      'INSERT INTO pagos (proyecto_id, monto, metodo, fecha, nota, facturado, factura_numero) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [proyecto_id, monto, metodo, fecha, nota, facturado, factura_numero]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, proyecto_id, monto, metodo, fecha, nota, facturado, factura_numero });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Edita monto, método, fecha, nota o factura. Igual que al crear, el proyecto se
// bloquea para que la suma de pagos nunca supere su monto total
router.put('/:id', validarBody(PAGO_EDICION), async (req, res, next) => {
  const { monto, metodo, fecha, nota, facturado } = req.datos;
  const factura_numero = numeroDe(req.datos);
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
    await conn.execute('UPDATE pagos SET monto=?, metodo=?, fecha=?, nota=?, facturado=?, factura_numero=? WHERE id=?',
      [monto, metodo, fecha, nota, facturado, factura_numero, req.params.id]);
    await conn.commit();
    res.json({ id: Number(req.params.id), proyecto_id: pago.proyecto_id, monto, metodo, fecha, nota, facturado, factura_numero });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Marcar (o desmarcar) que se dio factura, sin tocar el resto del pago
router.patch('/:id/factura', validarBody(FACTURA), async (req, res, next) => {
  try {
    const { facturado } = req.datos;
    const factura_numero = numeroDe(req.datos);
    const [r] = await db.execute('UPDATE pagos SET facturado=?, factura_numero=? WHERE id=?', [facturado, factura_numero, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json({ id: Number(req.params.id), facturado, factura_numero });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM pagos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pago no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
