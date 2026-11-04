// Tests de las cuentas de IVA y neto: no necesitan base de datos
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TASAS_IVA, ivaIncluido, conCuentas } = require('../src/cuentas');

test('las tasas de IVA de Paraguay son 10, 5 y 0', () => {
  assert.deepEqual(TASAS_IVA, [10, 5, 0]);
});

test('ivaIncluido saca el IVA de un monto que ya lo incluye', () => {
  assert.equal(ivaIncluido(1100000, 10), 100000);
  assert.equal(ivaIncluido(1050000, 5), 50000);
  assert.equal(ivaIncluido(1000000, 0), 0);
});

test('ivaIncluido redondea a guaraníes enteros', () => {
  assert.equal(ivaIncluido(1000000, 10), 90909);
});

test('conCuentas calcula saldo, IVA y neto de un proyecto en curso', () => {
  const p = conCuentas({ estado: 'en_curso', monto_total: 1100000, tasa_iva: 10, pagado: 400000, gastos: 50000 });
  assert.equal(p.saldo, 700000);
  assert.equal(p.iva, 100000);
  assert.equal(p.neto, 950000);
});

test('conCuentas de un proyecto cancelado usa solo lo cobrado', () => {
  const p = conCuentas({ estado: 'cancelado', monto_total: 1100000, tasa_iva: 10, pagado: 220000, gastos: 0 });
  assert.equal(p.iva, 20000);
  assert.equal(p.neto, 200000);
});
