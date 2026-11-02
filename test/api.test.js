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
  const editado = await pedir('PUT', `/pagos/${pago.datos.id}`, { token, cuerpo: { monto: 1200000, metodo: 'efectivo', fecha: '2026-11-01', facturado: false } });
  assert.equal(editado.status, 200);
  const editadoDeMas = await pedir('PUT', `/pagos/${pago.datos.id}`, { token, cuerpo: { monto: 3000001, metodo: 'efectivo', fecha: '2026-11-01', facturado: false } });
  assert.equal(editadoDeMas.status, 400);

  // El proyecto no puede bajar de lo cobrado
  const bajar = await pedir('PUT', `/proyectos/${p.datos.id}`, {
    token, cuerpo: { cliente_id: c.datos.id, nombre: 'Sitio web', estado: 'en_curso', monto_total: 1000000, tasa_iva: 10 },
  });
  assert.equal(bajar.status, 400);
  assert.equal(bajar.datos.pagado, 1200000);

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

test('IVA incluido, gastos y neto por proyecto y en el resumen', async () => {
  const c = await pedir('POST', '/clientes', { token, cuerpo: { nombre: 'Mesa Guairá' } });
  // ₲ 1.100.000 con IVA 10 % incluido: ₲ 100.000 son IVA
  const p = await pedir('POST', '/proyectos', {
    token, cuerpo: { cliente_id: c.datos.id, nombre: 'Reservas', estado: 'en_curso', monto_total: 1100000, tasa_iva: 10 },
  });
  assert.equal(p.status, 201);
  assert.equal(p.datos.iva, 100000);

  // Tasa que no existe en Paraguay
  const tasaMala = await pedir('POST', '/proyectos', { token, cuerpo: { cliente_id: c.datos.id, nombre: 'X', tasa_iva: 7 } });
  assert.equal(tasaMala.status, 400);

  const dominio = await pedir('POST', '/gastos', {
    token, cuerpo: { proyecto_id: p.datos.id, concepto: 'Dominio .com.py', categoria: 'dominio', monto: 250000, fecha: '2026-11-01' },
  });
  assert.equal(dominio.status, 201);
  await pedir('POST', '/gastos', { token, cuerpo: { proyecto_id: p.datos.id, concepto: 'Hosting', categoria: 'hosting', monto: 150000, fecha: '2026-11-01' } });
  await pedir('POST', '/pagos', { token, cuerpo: { proyecto_id: p.datos.id, monto: 550000, fecha: '2026-11-01' } });

  // Dos gastos y un pago: los montos no se multiplican entre sí
  const proyecto = (await pedir('GET', '/proyectos', { token })).datos.find((x) => x.id === p.datos.id);
  assert.equal(proyecto.pagado, 550000);
  assert.equal(proyecto.gastos, 400000);
  assert.equal(proyecto.neto, 1100000 - 100000 - 400000);

  // Gasto en un proyecto que no existe, categoría inventada y monto en texto
  assert.equal((await pedir('POST', '/gastos', { token, cuerpo: { proyecto_id: 99999, concepto: 'X', monto: 1, fecha: '2026-11-01' } })).status, 404);
  const malo = await pedir('POST', '/gastos', { token, cuerpo: { proyecto_id: p.datos.id, concepto: 'X', categoria: 'viajes', monto: '1', fecha: '2026-11-01' } });
  assert.equal(malo.datos.detalles.length, 2);

  const editado = await pedir('PUT', `/gastos/${dominio.datos.id}`, { token, cuerpo: { concepto: 'Dominio por 2 años', categoria: 'dominio', monto: 450000, fecha: '2026-11-01' } });
  assert.equal(editado.datos.monto, 450000);
  assert.equal((await pedir('GET', `/gastos?proyecto_id=${p.datos.id}`, { token })).datos.length, 2);

  // Resumen: IVA de lo cobrado (550.000 / 11 = 50.000), gastos y neto
  const r = (await pedir('GET', '/resumen', { token })).datos;
  assert.equal(r.iva_cobrado, 50000);
  assert.equal(r.total_gastos, 600000);
  assert.equal(r.neto_cobrado, r.total_cobrado - 50000 - 600000);
  assert.equal(r.neto_proyectado, 1100000 - 100000 - 600000 + (3000000 - 272727)); // este proyecto + el del test anterior

  // Borrar el proyecto borra sus gastos
  await pedir('DELETE', `/proyectos/${p.datos.id}`, { token });
  assert.equal((await pedir('GET', `/gastos?proyecto_id=${p.datos.id}`, { token })).datos.length, 0);
});

test('facturas, pendientes e historial de un proyecto', async () => {
  const c = await pedir('POST', '/clientes', { token, cuerpo: { nombre: 'Kuarahy Tech', telefono: '+595 982 515 040' } });
  const p = await pedir('POST', '/proyectos', { token, cuerpo: { cliente_id: c.datos.id, nombre: 'Panel', estado: 'en_curso', monto_total: 2000000 } });
  const id = p.datos.id;

  // Un pago con factura y otro sin: lo que falta facturar es el segundo
  const conFactura = await pedir('POST', '/pagos', {
    token, cuerpo: { proyecto_id: id, monto: 800000, fecha: '2026-11-01', facturado: true, factura_numero: '001-001-0000123' },
  });
  assert.equal(conFactura.datos.facturado, true);
  const sinFactura = await pedir('POST', '/pagos', { token, cuerpo: { proyecto_id: id, monto: 500000, fecha: '2026-11-02' } });
  assert.equal(sinFactura.datos.facturado, false);
  let proyecto = (await pedir('GET', '/proyectos', { token })).datos.find((x) => x.id === id);
  assert.equal(proyecto.sin_facturar, 500000);
  assert.equal(proyecto.cliente_telefono, '+595 982 515 040');
  assert.ok((await pedir('GET', '/resumen', { token })).datos.sin_facturar >= 500000);

  // Marcar facturado; "facturado" en texto no vale
  assert.equal((await pedir('PATCH', `/pagos/${sinFactura.datos.id}/factura`, { token, cuerpo: { facturado: 'si' } })).status, 400);
  const marcado = await pedir('PATCH', `/pagos/${sinFactura.datos.id}/factura`, { token, cuerpo: { facturado: true, factura_numero: '001-001-0000124' } });
  assert.equal(marcado.status, 200);
  // Sin factura no queda número guardado
  const desmarcado = await pedir('PATCH', `/pagos/${conFactura.datos.id}/factura`, { token, cuerpo: { facturado: false, factura_numero: '001-001-0000123' } });
  assert.equal(desmarcado.datos.factura_numero, null);
  const pagos = (await pedir('GET', `/pagos?proyecto_id=${id}`, { token })).datos;
  assert.deepEqual(pagos.map((x) => x.facturado), [true, false]); // el más nuevo primero

  // Pendientes: cargar, tildar, contar y borrar
  const t1 = await pedir('POST', '/tareas', { token, cuerpo: { proyecto_id: id, texto: 'Pedir el logo en alta' } });
  await pedir('POST', '/tareas', { token, cuerpo: { proyecto_id: id, texto: 'Configurar el dominio' } });
  assert.equal((await pedir('PUT', `/tareas/${t1.datos.id}`, { token, cuerpo: { texto: 'Pedir el logo en alta', hecha: true } })).datos.hecha, true);
  proyecto = (await pedir('GET', '/proyectos', { token })).datos.find((x) => x.id === id);
  assert.equal(proyecto.tareas, 2);
  assert.equal(proyecto.tareas_hechas, 1);
  assert.equal((await pedir('POST', '/tareas', { token, cuerpo: { proyecto_id: 99999, texto: 'x' } })).status, 404);

  // Historial: una nota a mano y el cambio de estado con el motivo
  const nota = await pedir('POST', '/notas', { token, cuerpo: { proyecto_id: id, texto: 'Quiere sumar un blog más adelante' } });
  assert.equal(nota.status, 201);
  assert.match(nota.datos.creada_en, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  await pedir('PATCH', `/proyectos/${id}/estado`, { token, cuerpo: { estado: 'cancelado', nota: 'El cliente frenó el proyecto por presupuesto' } });
  // Mismo estado otra vez: no se anota un cambio repetido
  await pedir('PATCH', `/proyectos/${id}/estado`, { token, cuerpo: { estado: 'cancelado' } });
  // Cancelado: el neto sale de lo cobrado (1.300.000 con IVA 10 % = 118.182 de IVA), no del total
  const cancelado = (await pedir('GET', '/proyectos', { token })).datos.find((x) => x.id === id);
  assert.equal(cancelado.neto, 1300000 - 118182);
  const notas = (await pedir('GET', `/notas?proyecto_id=${id}`, { token })).datos;
  assert.equal(notas.length, 2);
  const cambio = notas.find((n) => n.tipo === 'estado');
  assert.equal(cambio.estado, 'cancelado');
  assert.equal(cambio.texto, 'El cliente frenó el proyecto por presupuesto');

  // Borrar el proyecto borra pendientes y notas
  await pedir('DELETE', `/proyectos/${id}`, { token });
  assert.equal((await pedir('GET', `/tareas?proyecto_id=${id}`, { token })).datos.length, 0);
  assert.equal((await pedir('GET', `/notas?proyecto_id=${id}`, { token })).datos.length, 0);
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
