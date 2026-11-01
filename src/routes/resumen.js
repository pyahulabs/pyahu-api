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

module.exports = router;
