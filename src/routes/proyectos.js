const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido, MONTO_MAX } = require('../middleware/validar');
const { TASAS_IVA, conCuentas } = require('../cuentas');

const ESTADOS = ['presupuesto', 'en_curso', 'entregado', 'cancelado'];

const PROYECTO = {
  cliente_id: { tipo: 'entero', min: 1, obligatorio: true },
  nombre: { tipo: 'texto', max: 150, obligatorio: true },
  descripcion: { tipo: 'texto', max: 2000 },
  estado: { tipo: 'opcion', opciones: ESTADOS, porDefecto: 'presupuesto' },
  monto_total: { tipo: 'entero', min: 0, max: MONTO_MAX, porDefecto: 0 },
  // Porcentaje de IVA incluido en monto_total: 10, 5 o 0 (sin IVA)
  tasa_iva: { tipo: 'opcion', opciones: TASAS_IVA, porDefecto: 10 },
  fecha_entrega: { tipo: 'fecha' },
};

// El PUT reemplaza el proyecto entero: estado, monto_total y tasa_iva no pueden
// faltar, si no un PUT sin estado lo volvería a "presupuesto" sin querer
const PROYECTO_EDICION = {
  ...PROYECTO,
  estado: { ...PROYECTO.estado, obligatorio: true },
  monto_total: { ...PROYECTO.monto_total, obligatorio: true },
  tasa_iva: { ...PROYECTO.tasa_iva, obligatorio: true },
};

// nota: el motivo del cambio (por ejemplo, por qué se canceló). Queda en el historial
const CAMBIO_ESTADO = {
  estado: { tipo: 'opcion', opciones: ESTADOS, obligatorio: true },
  nota: { tipo: 'texto', max: 2000 },
};

// Deja anotado en el historial que el proyecto cambió de estado
const anotarEstado = (conn, id, estado, texto = null) => conn.execute(
  "INSERT INTO notas (proyecto_id, tipo, estado, texto) VALUES (?, 'estado', ?, ?)", [id, estado, texto]);

router.param('id', idValido);

// Lista de proyectos con lo pagado, el saldo, el IVA, los gastos, el neto,
// lo cobrado sin factura y cuántos pendientes tiene.
// Pagos, gastos y tareas se suman en subconsultas separadas: si se hiciera
// JOIN con las tres tablas a la vez, cada pago se repetiría una vez por cada gasto
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.id, p.cliente_id, p.nombre, p.descripcion, p.estado, p.monto_total, p.tasa_iva, p.fecha_entrega,
             DATE_FORMAT(p.creado_en, '%Y-%m-%d') AS creado_en,
             c.nombre AS cliente, c.telefono AS cliente_telefono,
             COALESCE(pg.pagado, 0) AS pagado,
             COALESCE(pg.sin_facturar, 0) AS sin_facturar,
             COALESCE(gs.gastos, 0) AS gastos,
             COALESCE(ta.tareas, 0) AS tareas,
             COALESCE(ta.tareas_hechas, 0) AS tareas_hechas
      FROM proyectos p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN (SELECT proyecto_id, SUM(monto) AS pagado,
                        SUM(CASE WHEN facturado THEN 0 ELSE monto END) AS sin_facturar
                 FROM pagos GROUP BY proyecto_id) pg ON pg.proyecto_id = p.id
      LEFT JOIN (SELECT proyecto_id, SUM(monto) AS gastos FROM gastos GROUP BY proyecto_id) gs ON gs.proyecto_id = p.id
      LEFT JOIN (SELECT proyecto_id, COUNT(*) AS tareas, SUM(hecha) AS tareas_hechas
                 FROM tareas GROUP BY proyecto_id) ta ON ta.proyecto_id = p.id
      ORDER BY p.id DESC`);
    res.json(rows.map(conCuentas));
  } catch (e) { next(e); }
});

router.post('/', validarBody(PROYECTO), async (req, res, next) => {
  try {
    const { cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega } = req.datos;
    const [r] = await db.execute(
      'INSERT INTO proyectos (cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega]);
    res.status(201).json(conCuentas({ id: r.insertId, cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega,
      pagado: 0, sin_facturar: 0, gastos: 0, tareas: 0, tareas_hechas: 0 }));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El cliente no existe' });
    next(e);
  }
});

// Edita un proyecto. Con transacción, para que el monto total nunca quede
// por debajo de lo ya cobrado (POST /pagos bloquea la misma fila)
router.put('/:id', validarBody(PROYECTO_EDICION), async (req, res, next) => {
  const { cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega } = req.datos;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.execute('SELECT estado FROM proyectos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Proyecto no encontrado' }); }
    const [[{ pagado }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE proyecto_id = ?', [req.params.id]);
    if (monto_total < pagado) {
      await conn.rollback();
      return res.status(400).json({ error: 'monto_total no puede ser menor a lo ya cobrado', pagado });
    }
    await conn.execute(
      'UPDATE proyectos SET cliente_id=?, nombre=?, descripcion=?, estado=?, monto_total=?, tasa_iva=?, fecha_entrega=? WHERE id=?',
      [cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega, req.params.id]);
    if (p.estado !== estado) await anotarEstado(conn, req.params.id, estado);
    const [[{ gastos }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS gastos FROM gastos WHERE proyecto_id = ?', [req.params.id]);
    await conn.commit();
    res.json(conCuentas({ id: Number(req.params.id), cliente_id, nombre, descripcion, estado, monto_total, tasa_iva, fecha_entrega, pagado, gastos }));
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El cliente no existe' });
    next(e);
  } finally {
    conn.release();
  }
});

// Cambia solo el estado y lo deja en el historial, con el motivo si viene en "nota".
// Si el estado es el mismo, no se anota el cambio (pero la nota, si hay, se guarda)
router.patch('/:id/estado', validarBody(CAMBIO_ESTADO), async (req, res, next) => {
  const { estado, nota } = req.datos;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.execute('SELECT estado FROM proyectos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Proyecto no encontrado' }); }
    if (p.estado !== estado) {
      await conn.execute('UPDATE proyectos SET estado=? WHERE id=?', [estado, req.params.id]);
      await anotarEstado(conn, req.params.id, estado, nota);
    } else if (nota) {
      await conn.execute("INSERT INTO notas (proyecto_id, tipo, texto) VALUES (?, 'nota', ?)", [req.params.id, nota]);
    }
    await conn.commit();
    res.json({ id: Number(req.params.id), estado });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM proyectos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
