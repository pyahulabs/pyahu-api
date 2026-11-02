// Carga datos de ejemplo para probar el panel: npm run demo
// Crea el usuario demo (si no existe) y, si no hay clientes, algunos clientes,
// proyectos y pagos inventados. No borra nada.
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const DEMO = { nombre: 'Demo Pyahu', email: 'demo@pyahulabs.com', password: 'pyahu-demo-2026' };

const CLIENTES = [
  { nombre: "Café Ka'a", email: 'hola@cafekaa.com.py', telefono: '+595 981 204 118', ruc_ci: '80045123-1' },
  { nombre: 'Mesa Guairá', email: 'reservas@mesaguaira.com.py', telefono: '+595 971 330 902', ruc_ci: '80112907-4' },
  { nombre: 'Odontología Benítez', email: 'turnos@odontobenitez.com.py', telefono: '+595 541 42 810', ruc_ci: '4521876-3' },
  { nombre: 'Kuarahy Tech', email: 'equipo@kuarahy.tech', telefono: '+595 982 515 040', ruc_ci: '80098764-0' },
  { nombre: 'Verá Studio', email: 'vera@verastudio.com.py', telefono: null, ruc_ci: '3987456' },
];

// [cliente, nombre, descripción, estado, monto total, pagos [monto, método, fecha, nota, n.º de factura], días hasta la entrega]
// Todos con IVA 10 % incluido. Un pago sin número de factura es un pago que todavía no se facturó.
// Gastos, pendientes e historial de cada proyecto están más abajo
// La entrega se cuenta desde hoy, así el panel siempre muestra una atrasada, una cercana y una lejana
const PROYECTOS = [
  [0, 'Sitio web con menú digital', 'Landing, menú con fotos y botón de WhatsApp.', 'entregado', 3800000,
    [[1900000, 'transferencia', '2026-08-04', 'Seña 50%', '001-001-0000041'], [1900000, 'transferencia', '2026-09-12', 'Saldo final', '001-001-0000047']]],
  [1, 'Reservas en línea', 'Sistema de reservas de mesas con confirmación por WhatsApp.', 'en_curso', 6500000,
    [[2600000, 'transferencia', '2026-09-20', 'Seña 40%', '001-001-0000049'], [1300000, 'efectivo', '2026-10-18', 'Segunda cuota']], 4],
  [2, 'Turnos y recordatorios', 'Agenda web para pacientes y recordatorios automáticos.', 'en_curso', 4900000,
    [[1470000, 'transferencia', '2026-10-06', 'Seña 30%']], -2],
  [3, 'Identidad visual', 'Logo, paleta, tipografías y manual de marca.', 'entregado', 2500000,
    [[1250000, 'transferencia', '2026-07-15', 'Seña', '001-001-0000036'], [800000, 'otro', '2026-08-30', 'Pago con QR', '001-001-0000045']]],
  [3, 'Panel de métricas', 'Dashboard interno con indicadores de ventas.', 'presupuesto', 7200000, [], 32],
  [4, 'Portfolio fotográfico', 'Galería con filtros por serie y formulario de contacto.', 'presupuesto', 3100000, []],
  [0, 'Tienda de café en grano', 'Tienda online con envíos dentro de Villarrica.', 'cancelado', 5400000,
    [[500000, 'efectivo', '2026-06-10', 'Adelanto no reembolsable', '001-001-0000031']]],
];

// "2026-08-04" menos n días, como texto AAAA-MM-DD
function restarDias(f, n) {
  const d = new Date(`${f}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fecha de hoy + n días, como texto AAAA-MM-DD
function enDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Gastos por proyecto (índice en PROYECTOS): [concepto, categoría, monto, fecha]
const GASTOS = {
  0: [['Dominio cafekaa.com.py por 1 año', 'dominio', 250000, '2026-08-05'], ['Hosting por 1 año', 'hosting', 480000, '2026-08-05']],
  1: [['API de WhatsApp Business', 'software', 350000, '2026-09-22'], ['Servidor por 6 meses', 'hosting', 600000, '2026-09-22']],
  2: [['Servicio de SMS para recordatorios', 'software', 150000, '2026-10-08']],
  3: [['Licencia de tipografía', 'software', 420000, '2026-07-16'], ['Impresión del manual', 'otro', 180000, '2026-08-28']],
  6: [['Dominio de la tienda', 'dominio', 250000, '2026-06-11']],
};

// Lo que le falta a cada proyecto: [texto, ¿hecho?]
const TAREAS = {
  1: [['Diseño de la pantalla de reservas', true], ['Conectar la API de WhatsApp', true], ['Cargar las mesas y horarios del local', false],
    ['Probar con el personal del salón', false], ['Capacitación al encargado', false]],
  2: [['Pedir el listado de profesionales y horarios', true], ['Configurar los SMS de recordatorio', false], ['Probar turnos con 3 pacientes reales', false]],
  4: [['Reunión para definir los indicadores', false], ['Mandar el presupuesto revisado', false]],
  5: [['Esperar las fotos en alta de la serie "Ñandutí"', false]],
};

// Historial: [tipo, estado, texto, fecha y hora]. Los de tipo "estado" son cambios de estado
const NOTAS = {
  0: [['estado', 'en_curso', null, '2026-08-04 10:15:00'], ['nota', null, 'Pidieron sumar el menú en guaraní además de en castellano. Sin costo extra.', '2026-08-20 16:40:00'],
    ['estado', 'entregado', 'Entregado y publicado. Quedaron muy contentos con el botón de WhatsApp.', '2026-09-12 11:05:00']],
  1: [['estado', 'en_curso', 'Aceptaron el presupuesto y pagaron la seña.', '2026-09-20 09:30:00'],
    ['nota', null, 'El dueño quiere que las reservas de más de 8 personas pidan seña. Ver si entra en esta etapa.', '2026-10-22 18:10:00']],
  2: [['estado', 'en_curso', null, '2026-10-06 14:00:00'], ['nota', null, 'La doctora prefiere SMS antes que WhatsApp para los pacientes mayores.', '2026-10-15 10:20:00']],
  3: [['estado', 'entregado', 'Se entregó el manual impreso y en PDF.', '2026-08-30 15:45:00']],
  4: [['nota', null, 'Piden ver un ejemplo antes de aceptar. Mandar capturas del panel de Pyahu.', '2026-10-28 12:00:00']],
  6: [['estado', 'en_curso', null, '2026-06-10 10:00:00'],
    ['estado', 'cancelado', 'El cliente decidió vender solo en el local por ahora. El adelanto no se devuelve, como estaba acordado.', '2026-07-02 17:30:00']],
};

async function main() {
  const [usuarios] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [DEMO.email]);
  if (!usuarios.length) {
    const hash = await bcrypt.hash(DEMO.password, 10);
    await db.execute('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)', [DEMO.nombre, DEMO.email, hash]);
    console.log(`Usuario demo creado: ${DEMO.email} / ${DEMO.password}`);
  } else {
    console.log(`El usuario demo ya existía: ${DEMO.email}`);
  }

  const [[{ n }]] = await db.execute('SELECT COUNT(*) AS n FROM clientes');
  if (n > 0) {
    console.log(`Ya hay ${n} clientes cargados: no se agregan datos de ejemplo.`);
    return;
  }

  const ids = [];
  for (const c of CLIENTES) {
    const [r] = await db.execute('INSERT INTO clientes (nombre, email, telefono, ruc_ci) VALUES (?, ?, ?, ?)',
      [c.nombre, c.email, c.telefono, c.ruc_ci]);
    ids.push(r.insertId);
  }
  for (const [i, [cliente, nombre, descripcion, estado, monto, pagos, dias]] of PROYECTOS.entries()) {
    // Se "creó" unos días antes de su primer pago o nota, para que el historial tenga sentido
    const fechas = [...pagos.map((x) => x[2]), ...(NOTAS[i] || []).map((x) => x[3].slice(0, 10))].sort();
    const creado = fechas.length ? `${restarDias(fechas[0], 5)} 09:00:00` : `${enDias(-12)} 09:00:00`;
    const [r] = await db.execute(
      'INSERT INTO proyectos (cliente_id, nombre, descripcion, estado, monto_total, fecha_entrega, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ids[cliente], nombre, descripcion, estado, monto, dias === undefined ? null : enDias(dias), creado]);
    for (const [m, metodo, fecha, nota, factura] of pagos) {
      await db.execute('INSERT INTO pagos (proyecto_id, monto, metodo, fecha, nota, facturado, factura_numero) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [r.insertId, m, metodo, fecha, nota, Boolean(factura), factura || null]);
    }
    for (const [texto, hecha] of TAREAS[i] || []) {
      await db.execute('INSERT INTO tareas (proyecto_id, texto, hecha) VALUES (?, ?, ?)', [r.insertId, texto, hecha]);
    }
    for (const [tipo, estadoNuevo, texto, cuando] of NOTAS[i] || []) {
      await db.execute('INSERT INTO notas (proyecto_id, tipo, estado, texto, creada_en) VALUES (?, ?, ?, ?, ?)',
        [r.insertId, tipo, estadoNuevo, texto, cuando]);
    }
    for (const [concepto, categoria, m, fecha] of GASTOS[i] || []) {
      await db.execute('INSERT INTO gastos (proyecto_id, concepto, categoria, monto, fecha) VALUES (?, ?, ?, ?, ?)',
        [r.insertId, concepto, categoria, m, fecha]);
    }
  }
  console.log(`Listo: ${CLIENTES.length} clientes, ${PROYECTOS.length} proyectos con pagos, gastos, pendientes e historial.`);
}

main()
  .catch((e) => { console.error('No se pudieron cargar los datos:', e.message); process.exitCode = 1; })
  .finally(() => db.end());
