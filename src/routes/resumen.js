const router = require('express').Router();
const db = require('../db');
const { ivaIncluido } = require('../cuentas');

// Resumen de la plata del estudio.
// - total_cobrado: todos los pagos registrados.
// - total_pendiente: lo que falta cobrar de proyectos en curso o entregados.
// - total_presupuestado: lo que falta de presupuestos que el cliente todavía no aceptó.
// - iva_cobrado: el IVA que viene incluido en lo cobrado (no es plata del estudio).
// - total_gastos: todo lo gastado en los proyectos (dominios, hosting…).
// - neto_cobrado: lo que le queda al estudio de lo cobrado = cobrado − IVA − gastos.
// - neto_proyectado: el neto de los proyectos en curso y entregados si se cobran completos.
// - sin_facturar: lo cobrado en pagos que todavía no tienen factura.
// Los proyectos cancelados no suman a lo pendiente (lo que se cobró y se gastó en ellos sí cuenta).
router.get('/', async (req, res, next) => {
  try {
    // Una fila por proyecto, con pagos y gastos sumados en subconsultas: si se
    // hiciera JOIN directo con pagos, un proyecto con 3 pagos contaría su
    // monto_total 3 veces
    const [proyectos] = await db.execute(`
      SELECT p.estado, p.monto_total, p.tasa_iva,
             COALESCE(pg.cobrado, 0) AS cobrado,
             COALESCE(pg.sin_facturar, 0) AS sin_facturar,
             COALESCE(gs.gastos, 0) AS gastos
      FROM proyectos p
      LEFT JOIN (SELECT proyecto_id, SUM(monto) AS cobrado,
                        SUM(CASE WHEN facturado THEN 0 ELSE monto END) AS sin_facturar
                 FROM pagos GROUP BY proyecto_id) pg ON pg.proyecto_id = p.id
      LEFT JOIN (SELECT proyecto_id, SUM(monto) AS gastos FROM gastos GROUP BY proyecto_id) gs ON gs.proyecto_id = p.id`);

    const por_estado = {};
    for (const estado of ['presupuesto', 'en_curso', 'entregado', 'cancelado']) {
      const lista = proyectos.filter((p) => p.estado === estado);
      const suma = (campo) => lista.reduce((t, p) => t + p[campo], 0);
      const monto_total = suma('monto_total');
      const cobrado = suma('cobrado');
      por_estado[estado] = {
        proyectos: lista.length,
        monto_total,
        cobrado,
        pendiente: estado === 'cancelado' ? 0 : monto_total - cobrado,
        gastos: suma('gastos'),
      };
    }

    const suma = (campo, estados) => estados.reduce((t, e) => t + por_estado[e][campo], 0);
    const total_cobrado = suma('cobrado', Object.keys(por_estado));
    const iva_cobrado = proyectos.reduce((t, p) => t + ivaIncluido(p.cobrado, p.tasa_iva), 0);
    const total_gastos = suma('gastos', Object.keys(por_estado));
    const neto_proyectado = proyectos
      .filter((p) => p.estado === 'en_curso' || p.estado === 'entregado')
      .reduce((t, p) => t + p.monto_total - ivaIncluido(p.monto_total, p.tasa_iva) - p.gastos, 0);

    res.json({
      total_cobrado,
      total_pendiente: suma('pendiente', ['en_curso', 'entregado']),
      total_presupuestado: por_estado.presupuesto.pendiente,
      iva_cobrado,
      total_gastos,
      neto_cobrado: total_cobrado - iva_cobrado - total_gastos,
      neto_proyectado,
      sin_facturar: proyectos.reduce((t, p) => t + p.sin_facturar, 0),
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
