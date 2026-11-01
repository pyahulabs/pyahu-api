const router = require('express').Router();
const db = require('../db');

// Resumen de la plata del estudio.
// - total_cobrado: todos los pagos registrados.
// - total_pendiente: lo que falta cobrar de proyectos en curso o entregados.
// - total_presupuestado: lo que falta de presupuestos que el cliente todavía no aceptó.
// Los proyectos cancelados no suman a lo pendiente (lo que se cobró de ellos sí cuenta).
router.get('/', async (req, res, next) => {
  try {
    // Se suman los pagos en una subconsulta: si se hiciera JOIN directo con
    // pagos, un proyecto con 3 pagos contaría su monto_total 3 veces
    const [filas] = await db.execute(`
      SELECT p.estado,
             COUNT(*) AS proyectos,
             SUM(p.monto_total) AS monto_total,
             SUM(COALESCE(g.cobrado, 0)) AS cobrado
      FROM proyectos p
      LEFT JOIN (SELECT proyecto_id, SUM(monto) AS cobrado FROM pagos GROUP BY proyecto_id) g
             ON g.proyecto_id = p.id
      GROUP BY p.estado`);

    const por_estado = {};
    for (const estado of ['presupuesto', 'en_curso', 'entregado', 'cancelado']) {
      const f = filas.find((x) => x.estado === estado) || { proyectos: 0, monto_total: 0, cobrado: 0 };
      por_estado[estado] = {
        proyectos: f.proyectos,
        monto_total: f.monto_total,
        cobrado: f.cobrado,
        pendiente: estado === 'cancelado' ? 0 : f.monto_total - f.cobrado,
      };
    }

    const suma = (campo, estados) => estados.reduce((t, e) => t + por_estado[e][campo], 0);
    res.json({
      total_cobrado: suma('cobrado', Object.keys(por_estado)),
      total_pendiente: suma('pendiente', ['en_curso', 'entregado']),
      total_presupuestado: por_estado.presupuesto.pendiente,
      por_estado,
    });
  } catch (e) { next(e); }
});

// Cobrado mes por mes: GET /resumen/mensual?meses=12 (de 1 a 36).
// Los meses sin pagos también aparecen, con 0, para que el gráfico no tenga huecos
router.get('/mensual', async (req, res, next) => {
  try {
    const meses = req.query.meses === undefined ? 12 : Number(req.query.meses);
    if (!Number.isInteger(meses) || meses < 1 || meses > 36)
      return res.status(400).json({ error: 'meses debe ser un entero entre 1 y 36' });

    const hoy = new Date();
    const desde = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() - meses + 1, 1));
    const [filas] = await db.execute(`
      SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes, SUM(monto) AS cobrado, COUNT(*) AS pagos
      FROM pagos WHERE fecha >= ?
      GROUP BY mes`, [desde.toISOString().slice(0, 10)]);

    const lista = [];
    for (let i = 0; i < meses; i++) {
      const d = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + i, 1));
      const mes = d.toISOString().slice(0, 7);
      const f = filas.find((x) => x.mes === mes);
      lista.push({ mes, cobrado: f ? f.cobrado : 0, pagos: f ? f.pagos : 0 });
    }
    res.json(lista);
  } catch (e) { next(e); }
});

module.exports = router;
