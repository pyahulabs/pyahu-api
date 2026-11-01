const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido, MONTO_MAX } = require('../middleware/validar');

const ESTADOS = ['presupuesto', 'en_curso', 'entregado', 'cancelado'];

const PROYECTO = {
  cliente_id: { tipo: 'entero', min: 1, obligatorio: true },
  nombre: { tipo: 'texto', max: 150, obligatorio: true },
  descripcion: { tipo: 'texto', max: 2000 },
  estado: { tipo: 'opcion', opciones: ESTADOS, porDefecto: 'presupuesto' },
  monto_total: { tipo: 'entero', min: 0, max: MONTO_MAX, porDefecto: 0 },
};

// El PUT reemplaza el proyecto entero: estado y monto_total no pueden faltar,
// si no un PUT sin estado lo volvería a "presupuesto" sin querer
const PROYECTO_EDICION = {
  ...PROYECTO,
  estado: { ...PROYECTO.estado, obligatorio: true },
  monto_total: { ...PROYECTO.monto_total, obligatorio: true },
};

const CAMBIO_ESTADO = {
  estado: { tipo: 'opcion', opciones: ESTADOS, obligatorio: true },
};

router.param('id', idValido);

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

router.post('/', validarBody(PROYECTO), async (req, res, next) => {
  try {
    const { cliente_id, nombre, descripcion, estado, monto_total } = req.datos;
    const [r] = await db.execute(
      'INSERT INTO proyectos (cliente_id, nombre, descripcion, estado, monto_total) VALUES (?, ?, ?, ?, ?)',
      [cliente_id, nombre, descripcion, estado, monto_total]);
    res.status(201).json({ id: r.insertId, cliente_id, nombre, descripcion, estado, monto_total });
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El cliente no existe' });
    next(e);
  }
});

// Edita un proyecto. Con transacción, para que el monto total nunca quede
// por debajo de lo ya cobrado (POST /pagos bloquea la misma fila)
router.put('/:id', validarBody(PROYECTO_EDICION), async (req, res, next) => {
  const { cliente_id, nombre, descripcion, estado, monto_total } = req.datos;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.execute('SELECT id FROM proyectos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Proyecto no encontrado' }); }
    const [[{ pagado }]] = await conn.execute(
      'SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE proyecto_id = ?', [req.params.id]);
    if (monto_total < pagado) {
      await conn.rollback();
      return res.status(400).json({ error: 'monto_total no puede ser menor a lo ya cobrado', pagado });
    }
    await conn.execute(
      'UPDATE proyectos SET cliente_id=?, nombre=?, descripcion=?, estado=?, monto_total=? WHERE id=?',
      [cliente_id, nombre, descripcion, estado, monto_total, req.params.id]);
    await conn.commit();
    res.json({ id: Number(req.params.id), cliente_id, nombre, descripcion, estado, monto_total, pagado, saldo: monto_total - pagado });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El cliente no existe' });
    next(e);
  } finally {
    conn.release();
  }
});

router.patch('/:id/estado', validarBody(CAMBIO_ESTADO), async (req, res, next) => {
  try {
    const { estado } = req.datos;
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
