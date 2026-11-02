// Cuentas de IVA y neto que usan varias rutas.
//
// En Paraguay los precios se dan con el IVA incluido. Si un proyecto cuesta
// ₲ 1.100.000 con IVA 10 %, el IVA es 1.100.000 × 10 / 110 = ₲ 100.000
// (o sea, el total dividido 11) y lo que queda sin IVA es ₲ 1.000.000.

const TASAS_IVA = [10, 5, 0];

// IVA que va incluido en un monto, redondeado a guaraníes enteros
const ivaIncluido = (monto, tasa) => Math.round((monto * tasa) / (100 + tasa));

// Agrega a un proyecto (con estado, monto_total, tasa_iva, pagado y gastos)
// el saldo, el IVA y el neto: lo que le queda al estudio.
// Si el proyecto se canceló, ya no se va a cobrar el total: el neto sale de lo
// que efectivamente se cobró (por ejemplo, la seña que no se devuelve)
function conCuentas(p) {
  const base = p.estado === 'cancelado' ? p.pagado : p.monto_total;
  const iva = ivaIncluido(base, p.tasa_iva);
  return { ...p, saldo: p.monto_total - p.pagado, iva, neto: base - iva - p.gastos };
}

module.exports = { TASAS_IVA, ivaIncluido, conCuentas };
