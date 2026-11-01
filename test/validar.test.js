// Tests del middleware de validación: no necesitan base de datos
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarBody, idValido } = require('../src/middleware/validar');

// Simula un pedido y devuelve qué hizo el middleware
function correr(reglas, body) {
  const req = { body };
  let respuesta = null;
  let paso = false;
  const res = { status(c) { return { json(d) { respuesta = { status: c, ...d }; } }; } };
  validarBody(reglas)(req, res, () => { paso = true; });
  return { paso, datos: req.datos, respuesta };
}

test('acepta datos válidos y los deja limpios en req.datos', () => {
  const { paso, datos } = correr(
    { nombre: { tipo: 'texto', obligatorio: true }, email: { tipo: 'email' } },
    { nombre: '  Café Ka\'a  ', email: 'Hola@CafeKaa.com.py' });
  assert.equal(paso, true);
  assert.deepEqual(datos, { nombre: "Café Ka'a", email: 'hola@cafekaa.com.py' });
});

test('los campos opcionales que faltan quedan en null o en su valor por defecto', () => {
  const { datos } = correr(
    { nota: { tipo: 'texto' }, metodo: { tipo: 'opcion', opciones: ['efectivo', 'otro'], porDefecto: 'otro' } },
    {});
  assert.deepEqual(datos, { nota: null, metodo: 'otro' });
});

test('junta todos los errores en una sola respuesta 400', () => {
  const { paso, respuesta } = correr(
    { nombre: { tipo: 'texto', obligatorio: true }, monto: { tipo: 'entero', min: 1 } },
    { monto: 0 });
  assert.equal(paso, false);
  assert.equal(respuesta.status, 400);
  assert.deepEqual(respuesta.detalles, ['nombre es obligatorio', 'monto debe ser mayor o igual a 1']);
});

test('un número entre comillas no cuenta como entero', () => {
  const { respuesta } = correr({ monto: { tipo: 'entero' } }, { monto: '1000' });
  assert.match(respuesta.detalles[0], /número entero/);
});

test('rechaza fechas que no existen', () => {
  for (const fecha of ['2026-02-30', '2026-13-01', '01/11/2026']) {
    const { paso } = correr({ fecha: { tipo: 'fecha' } }, { fecha });
    assert.equal(paso, false, fecha);
  }
  assert.equal(correr({ fecha: { tipo: 'fecha' } }, { fecha: '2028-02-29' }).paso, true); // año bisiesto
});

test('no recorta la contraseña si la regla dice recortar: false', () => {
  const { datos } = correr({ password: { tipo: 'texto', recortar: false } }, { password: ' clave ' });
  assert.equal(datos.password, ' clave ');
});

test('cuerpo vacío (req.body undefined en Express 5) no rompe', () => {
  const { respuesta } = correr({ nombre: { tipo: 'texto', obligatorio: true } }, undefined);
  assert.equal(respuesta.status, 400);
});

test('idValido rechaza ids que no son enteros positivos', () => {
  for (const [id, valido] of [['7', true], ['0', false], ['-3', false], ['abc', false], ['1.5', false]]) {
    let paso = false;
    let status = null;
    idValido({}, { status(c) { status = c; return { json() {} }; } }, () => { paso = true; }, id);
    assert.equal(paso, valido, id);
    if (!valido) assert.equal(status, 400);
  }
});
