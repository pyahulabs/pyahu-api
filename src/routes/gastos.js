const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido, MONTO_MAX } = require('../middleware/validar');

const CATEGORIAS = ['dominio', 'hosting', 'software', 'tercerizado', 'otro'];

const GASTO = {
  proyecto_id: { tipo: 'entero', min: 1, obligatorio: true },
  concepto: { tipo: 'texto', max: 150, obligatorio: true },
  categoria: { tipo: 'opcion', opciones: CATEGORIAS, porDefecto: 'otro' },
  monto: { tipo: 'entero', min: 1, max: MONTO_MAX, obligatorio: true },
  fecha: { tipo: 'fecha', obligatorio: true },
};

// Igual que con los pagos: al editar no se cambia de proyecto, y la categoría
// no puede faltar (si no, un PUT sin categoría la volvería a "otro")
const { proyecto_id: _sinProyecto, ...GASTO_EDICION } = GASTO;
GASTO_EDICION.categoria = { ...GASTO.categoria, obligatorio: true };

router.param('id', idValido);

// Lista de gastos, los más nuevos primero. Filtro opcional: ?proyecto_id=3
router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    if (proyecto_id !== undefined && !/^[1-9]\d*$/.test(proyecto_id))
      return res.status(400).json({ error: 'proyecto_id inválido' });
    const [rows] = proyecto_id
      ? await db.execute('SELECT id, proyecto_id, concepto, categoria, monto, fecha FROM gastos WHERE proyecto_id = ? ORDER BY fecha DESC, id DESC', [proyecto_id])
      : await db.execute('SELECT id, proyecto_id, concepto, categoria, monto, fecha FROM gastos ORDER BY fecha DESC, id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', validarBody(GASTO), async (req, res, next) => {
  try {
    const { proyecto_id, concepto, categoria, monto, fecha } = req.datos;
    const [r] = await db.execute(
      'INSERT INTO gastos (proyecto_id, concepto, categoria, monto, fecha) VALUES (?, ?, ?, ?, ?)',
      [proyecto_id, concepto, categoria, monto, fecha]);
    res.status(201).json({ id: r.insertId, proyecto_id, concepto, categoria, monto, fecha });
  } catch (e) {
    // La clave foránea avisa si el proyecto no existe
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'Proyecto no encontrado' });
    next(e);
  }
});

router.put('/:id', validarBody(GASTO_EDICION), async (req, res, next) => {
  try {
    const { concepto, categoria, monto, fecha } = req.datos;
    const [r] = await db.execute(
      'UPDATE gastos SET concepto=?, categoria=?, monto=?, fecha=? WHERE id=?',
      [concepto, categoria, monto, fecha, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Gasto no encontrado' });
    const [[gasto]] = await db.execute('SELECT id, proyecto_id, concepto, categoria, monto, fecha FROM gastos WHERE id = ?', [req.params.id]);
    res.json(gasto);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM gastos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
