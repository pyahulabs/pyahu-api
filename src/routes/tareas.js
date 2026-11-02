// Pendientes de cada proyecto: lo que le falta, como una lista para tildar
const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido } = require('../middleware/validar');

const TAREA = {
  proyecto_id: { tipo: 'entero', min: 1, obligatorio: true },
  texto: { tipo: 'texto', max: 255, obligatorio: true },
};

// Al editar se mandan las dos cosas: el texto y si está hecha
const TAREA_EDICION = {
  texto: { tipo: 'texto', max: 255, obligatorio: true },
  hecha: { tipo: 'booleano', obligatorio: true },
};

const limpiar = (t) => ({ ...t, hecha: Boolean(t.hecha) });

router.param('id', idValido);

// Lista en el orden en que se cargaron. Filtro opcional: ?proyecto_id=3
router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    if (proyecto_id !== undefined && !/^[1-9]\d*$/.test(proyecto_id))
      return res.status(400).json({ error: 'proyecto_id inválido' });
    const [rows] = proyecto_id
      ? await db.execute('SELECT id, proyecto_id, texto, hecha FROM tareas WHERE proyecto_id = ? ORDER BY id', [proyecto_id])
      : await db.execute('SELECT id, proyecto_id, texto, hecha FROM tareas ORDER BY id');
    res.json(rows.map(limpiar));
  } catch (e) { next(e); }
});

router.post('/', validarBody(TAREA), async (req, res, next) => {
  try {
    const { proyecto_id, texto } = req.datos;
    const [r] = await db.execute('INSERT INTO tareas (proyecto_id, texto) VALUES (?, ?)', [proyecto_id, texto]);
    res.status(201).json({ id: r.insertId, proyecto_id, texto, hecha: false });
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'Proyecto no encontrado' });
    next(e);
  }
});

router.put('/:id', validarBody(TAREA_EDICION), async (req, res, next) => {
  try {
    const { texto, hecha } = req.datos;
    const [r] = await db.execute('UPDATE tareas SET texto=?, hecha=? WHERE id=?', [texto, hecha, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pendiente no encontrado' });
    const [[tarea]] = await db.execute('SELECT id, proyecto_id, texto, hecha FROM tareas WHERE id = ?', [req.params.id]);
    res.json(limpiar(tarea));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM tareas WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pendiente no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
