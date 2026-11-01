// Tests de punta a punta: levantan la API contra la base pyahu_test y
// recorren el flujo completo como lo haría el panel o curl.
const { prepararBase, levantarApp } = require('./ayuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const limiteIntentos = require('../src/middleware/limiteIntentos');

let pedir, cerrar, base, token;
const USUARIO = { nombre: 'Nicolás', email: 'nicolas@pyahulabs.com', password: 'unaClaveSegura123' };

before(async () => {
  await prepararBase();
  ({ pedir, cerrar, base } = await levantarApp());
});
after(() => cerrar());

test('el primer usuario se puede registrar aunque el registro esté cerrado', async () => {
  assert.deepEqual((await pedir('GET', '/auth/config')).datos, { registro_abierto: true });
  const r = await pedir('POST', '/auth/registro', { cuerpo: USUARIO });
  assert.equal(r.status, 201);
  assert.equal(r.datos.email, USUARIO.email);
});

test('después del primero, el registro queda cerrado', async () => {
  assert.deepEqual((await pedir('GET', '/auth/config')).datos, { registro_abierto: false });
  const r = await pedir('POST', '/auth/registro', { cuerpo: { ...USUARIO, email: 'otro@ejemplo.com' } });
  assert.equal(r.status, 403);
});

test('login correcto devuelve un token; incorrecto, 401', async () => {
  assert.equal((await pedir('POST', '/auth/login', { cuerpo: { ...USUARIO, password: 'mal' } })).status, 401);
  const r = await pedir('POST', '/auth/login', { cuerpo: USUARIO });
  assert.equal(r.status, 200);
  token = r.datos.token;
  assert.match(token, /^ey/);
});

test('demasiados intentos fallidos bloquean el login con 429', async () => {
  limiteIntentos.reiniciar();
  let ultimo;
  for (let i = 0; i < 9; i++) ultimo = await pedir('POST', '/auth/login', { cuerpo: { ...USUARIO, password: 'mal' } });
  assert.equal(ultimo.status, 429);
  limiteIntentos.reiniciar();
});

test('sin token, las rutas protegidas responden 401', async () => {
  assert.equal((await pedir('GET', '/clientes')).status, 401);
  assert.equal((await pedir('GET', '/clientes', { token: 'basura' })).status, 401);
});

test('flujo completo: cliente, proyecto, pagos y resumen', async () => {
  const c = await pedir('POST', '/clientes', { token, cuerpo: { nombre: "Café Ka'a", ruc_ci: '80045123-1' } });
  assert.equal(c.status, 201);

  const p = await pedir('POST', '/proyectos', {
    token, cuerpo: { cliente_id: c.datos.id, nombre: 'Sitio web', estado: 'en_curso', monto_total: 3000000, fecha_entrega: '2026-12-15' },
  });
  assert.equal(p.status, 201);
  assert.equal(p.datos.fecha_entrega, '2026-12-15');

  const pago = await pedir('POST', '/pagos', { token, cuerpo: { proyecto_id: p.datos.id, monto: 1000000, fecha: '2026-11-01' } });
  assert.equal(pago.status, 201);

  // No se puede pagar de más
  const deMas = await pedir('POST', '/pagos', { token, cuerpo: { proyecto_id: p.datos.id, monto: 2500000, fecha: '2026-11-02' } });
  assert.equal(deMas.status, 400);
  assert.equal(deMas.datos.saldo, 2000000);

  // Editar el pago respeta el mismo límite
  const editado = await pedir('PUT', `/pagos/${pago.datos.id}`, { token, cuerpo: { monto: 1200000, metodo: 'efectivo', fecha: '2026-11-01' } });
  assert.equal(editado.status, 200);
  const editadoDeMas = await pedir('PUT', `/pagos/${pago.datos.id}`, { token, cuerpo: { monto: 3000001, metodo: 'efectivo', fecha: '2026-11-01' } });
  assert.equal(editadoDeMas.status, 400);

  // El proyecto no puede bajar de lo cobrado
  const bajar = await pedir('PUT', `/proyectos/${p.datos.id}`, {
    token, cuerpo: { cliente_id: c.datos.id, nombre: 'Sitio web', estado: 'en_curso', monto_total: 1000000 },
  });
  assert.equal(bajar.status, 400);

  const [proyecto] = (await pedir('GET', '/proyectos', { token })).datos;
  assert.equal(proyecto.pagado, 1200000);
  assert.equal(proyecto.saldo, 1800000);

  const resumen = (await pedir('GET', '/resumen', { token })).datos;
  assert.equal(resumen.total_cobrado, 1200000);
  assert.equal(resumen.total_pendiente, 1800000);

  const mensual = (await pedir('GET', '/resumen/mensual?meses=3', { token })).datos;
  assert.equal(mensual.length, 3);

  // Borrar el pago devuelve el saldo
  assert.equal((await pedir('DELETE', `/pagos/${pago.datos.id}`, { token })).status, 204);
  assert.equal((await pedir('GET', '/resumen', { token })).datos.total_cobrado, 0);
});

test('los errores de validación vienen con el detalle de cada campo', async () => {
  const r = await pedir('POST', '/proyectos', { token, cuerpo: { nombre: '', monto_total: '1000', fecha_entrega: '2026-02-31' } });
  assert.equal(r.status, 400);
  assert.equal(r.datos.detalles.length, 4); // cliente_id, nombre, monto_total y fecha_entrega
});

test('JSON mal escrito responde 400, no 500', async () => {
  const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email": ' });
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: 'El cuerpo no es un JSON válido' });
});
