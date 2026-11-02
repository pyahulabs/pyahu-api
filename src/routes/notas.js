// Historial de cada proyecto. Hay dos tipos de notas:
// - "nota": las que escribís a mano (qué pidió el cliente, qué se acordó…)
// - "estado": las guarda sola la API cuando el proyecto cambia de estado,
//   con el motivo si se lo pasaste (por ejemplo, por qué se canceló)
const router = require('express').Router();
const db = require('../db');
const { validarBody, idValido } = require('../middleware/validar');

const NOTA = {
  proyecto_id: { tipo: 'entero', min: 1, obligatorio: true },
  texto: { tipo: 'texto', max: 2000, obligatorio: true },
};
const NOTA_EDICION = { texto: NOTA.texto };

// La fecha sale como segundos desde 1970 (UNIX_TIMESTAMP) y se devuelve en
// formato ISO con Z (hora UTC). Así el panel la muestra bien en la hora del
// celu o la PC, aunque el servidor esté en otro país
const COLUMNAS = 'id, proyecto_id, tipo, estado, texto, UNIX_TIMESTAMP(creada_en) AS creada_ts';
const limpiar = ({ creada_ts, ...n }) => ({ ...n, creada_en: new Date(Number(creada_ts) * 1000).toISOString() });

router.param('id', idValido);

// Las más nuevas primero. Filtro opcional: ?proyecto_id=3
router.get('/', async (req, res, next) => {
  try {
    const { proyecto_id } = req.query;
    if (proyecto_id !== undefined && !/^[1-9]\d*$/.test(proyecto_id))
      return res.status(400).json({ error: 'proyecto_id inválido' });
    const [rows] = proyecto_id
      ? await db.execute(`SELECT ${COLUMNAS} FROM notas WHERE proyecto_id = ? ORDER BY creada_en DESC, id DESC`, [proyecto_id])
      : await db.execute(`SELECT ${COLUMNAS} FROM notas ORDER BY creada_en DESC, id DESC`);
    res.json(rows.map(limpiar));
  } catch (e) { next(e); }
});

router.post('/', validarBody(NOTA), async (req, res, next) => {
  try {
    const { proyecto_id, texto } = req.datos;
    const [r] = await db.execute("INSERT INTO notas (proyecto_id, tipo, texto) VALUES (?, 'nota', ?)", [proyecto_id, texto]);
    const [[nota]] = await db.execute(`SELECT ${COLUMNAS} FROM notas WHERE id = ?`, [r.insertId]);
    res.status(201).json(limpiar(nota));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'Proyecto no encontrado' });
    next(e);
  }
});

router.put('/:id', validarBody(NOTA_EDICION), async (req, res, next) => {
  try {
    const [r] = await db.execute('UPDATE notas SET texto=? WHERE id=?', [req.datos.texto, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Nota no encontrada' });
    const [[nota]] = await db.execute(`SELECT ${COLUMNAS} FROM notas WHERE id = ?`, [req.params.id]);
    res.json(limpiar(nota));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await db.execute('DELETE FROM notas WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Nota no encontrada' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
