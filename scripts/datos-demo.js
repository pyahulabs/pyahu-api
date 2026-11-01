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

// [cliente, nombre, descripción, estado, monto total, pagos [monto, método, fecha, nota], días hasta la entrega]
// La entrega se cuenta desde hoy, así el panel siempre muestra una atrasada, una cercana y una lejana
const PROYECTOS = [
  [0, 'Sitio web con menú digital', 'Landing, menú con fotos y botón de WhatsApp.', 'entregado', 3800000,
    [[1900000, 'transferencia', '2026-08-04', 'Seña 50%'], [1900000, 'transferencia', '2026-09-12', 'Saldo final']]],
  [1, 'Reservas en línea', 'Sistema de reservas de mesas con confirmación por WhatsApp.', 'en_curso', 6500000,
    [[2600000, 'transferencia', '2026-09-20', 'Seña 40%'], [1300000, 'efectivo', '2026-10-18', 'Segunda cuota']], 4],
  [2, 'Turnos y recordatorios', 'Agenda web para pacientes y recordatorios automáticos.', 'en_curso', 4900000,
    [[1470000, 'transferencia', '2026-10-06', 'Seña 30%']], -2],
  [3, 'Identidad visual', 'Logo, paleta, tipografías y manual de marca.', 'entregado', 2500000,
    [[1250000, 'transferencia', '2026-07-15', 'Seña'], [800000, 'otro', '2026-08-30', 'Pago con QR']]],
  [3, 'Panel de métricas', 'Dashboard interno con indicadores de ventas.', 'presupuesto', 7200000, [], 32],
  [4, 'Portfolio fotográfico', 'Galería con filtros por serie y formulario de contacto.', 'presupuesto', 3100000, []],
  [0, 'Tienda de café en grano', 'Tienda online con envíos dentro de Villarrica.', 'cancelado', 5400000,
    [[500000, 'efectivo', '2026-06-10', 'Adelanto no reembolsable']]],
];

// Fecha de hoy + n días, como texto AAAA-MM-DD
function enDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  for (const [cliente, nombre, descripcion, estado, monto, pagos, dias] of PROYECTOS) {
    const [r] = await db.execute(
      'INSERT INTO proyectos (cliente_id, nombre, descripcion, estado, monto_total, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?)',
      [ids[cliente], nombre, descripcion, estado, monto, dias === undefined ? null : enDias(dias)]);
    for (const [m, metodo, fecha, nota] of pagos) {
      await db.execute('INSERT INTO pagos (proyecto_id, monto, metodo, fecha, nota) VALUES (?, ?, ?, ?, ?)',
        [r.insertId, m, metodo, fecha, nota]);
    }
  }
  console.log(`Listo: ${CLIENTES.length} clientes, ${PROYECTOS.length} proyectos y sus pagos.`);
}

main()
  .catch((e) => { console.error('No se pudieron cargar los datos:', e.message); process.exitCode = 1; })
  .finally(() => db.end());
