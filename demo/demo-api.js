// Demo del panel de Pyahu Labs sin servidor: este archivo reemplaza a la API.
// Intercepta los fetch() que hace app.js y contesta como la API de verdad
// (mismas rutas, mismas cuentas y las validaciones principales), con datos
// de ejemplo que se guardan solo en este navegador.
'use strict';
(() => {
  const CLAVE = 'pyahu-demo-datos-v2';
  const DEMO = { email: 'demo@pyahulabs.com', password: 'pyahu-demo-2026', nombre: 'Demo Pyahu' };

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  // Fechas relativas a hoy: "hace m meses, día d"
  const haceMeses = (m, dia) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); d.setDate(dia); return iso(d); };
  // Fecha y hora en ISO (como devuelve la API para las notas)
  const momento = (fecha, hora) => new Date(`${fecha}T${hora}:00`).toISOString();

  function semilla() {
    const clientes = [
      { id: 1, nombre: "Café Ka'a", email: 'hola@cafekaa.com.py', telefono: '+595 981 204 118', ruc_ci: '80045123-1' },
      { id: 2, nombre: 'Mesa Guairá', email: 'reservas@mesaguaira.com.py', telefono: '+595 971 330 902', ruc_ci: '80112907-4' },
      { id: 3, nombre: 'Odontología Benítez', email: 'turnos@odontobenitez.com.py', telefono: '+595 541 42 810', ruc_ci: '4521876-3' },
      { id: 4, nombre: 'Kuarahy Tech', email: 'equipo@kuarahy.tech', telefono: '+595 982 515 040', ruc_ci: '80098764-0' },
      { id: 5, nombre: 'Verá Studio', email: 'vera@verastudio.com.py', telefono: null, ruc_ci: '3987456' },
    ];
    const P = (id, cliente_id, nombre, descripcion, estado, monto_total, fecha_entrega, creado_en) =>
      ({ id, cliente_id, nombre, descripcion, estado, monto_total, tasa_iva: 10, fecha_entrega, creado_en });
    const proyectos = [
      P(1, 1, 'Sitio web con menú digital', 'Landing, menú con fotos y botón de WhatsApp.', 'entregado', 3800000, null, haceMeses(3, 1)),
      P(2, 2, 'Reservas en línea', 'Sistema de reservas de mesas con confirmación por WhatsApp.', 'en_curso', 6500000, enDias(4), haceMeses(2, 15)),
      P(3, 3, 'Turnos y recordatorios', 'Agenda web para pacientes y recordatorios automáticos.', 'en_curso', 4900000, enDias(-2), haceMeses(1, 1)),
      P(4, 4, 'Identidad visual', 'Logo, paleta, tipografías y manual de marca.', 'entregado', 2500000, null, haceMeses(4, 10)),
      P(5, 4, 'Panel de métricas', 'Dashboard interno con indicadores de ventas.', 'presupuesto', 7200000, enDias(32), haceMeses(0, 1)),
      P(6, 5, 'Portfolio fotográfico', 'Galería con filtros por serie y formulario de contacto.', 'presupuesto', 3100000, null, enDias(-12)),
      P(7, 1, 'Tienda de café en grano', 'Tienda online con envíos dentro de Villarrica.', 'cancelado', 5400000, null, haceMeses(5, 5)),
    ];
    let id = 0;
    const pagos = [
      [1, 1900000, 'transferencia', haceMeses(3, 4), 'Seña 50%', '001-001-0000041'],
      [1, 1900000, 'transferencia', haceMeses(2, 12), 'Saldo final', '001-001-0000047'],
      [2, 2600000, 'transferencia', haceMeses(2, 20), 'Seña 40%', '001-001-0000049'],
      [2, 1300000, 'efectivo', haceMeses(1, 18), 'Segunda cuota', null],
      [3, 1470000, 'transferencia', haceMeses(1, 6), 'Seña 30%', null],
      [4, 1250000, 'transferencia', haceMeses(4, 15), 'Seña', '001-001-0000036'],
      [4, 800000, 'otro', haceMeses(3, 28), 'Pago con QR', '001-001-0000045'],
      [7, 500000, 'efectivo', haceMeses(5, 10), 'Adelanto no reembolsable', '001-001-0000031'],
    ].map(([proyecto_id, monto, metodo, fecha, nota, factura]) =>
      ({ id: ++id, proyecto_id, monto, metodo, fecha, nota, facturado: Boolean(factura), factura_numero: factura }));
    const gastos = [
      [1, 'Dominio cafekaa.com.py por 1 año', 'dominio', 250000, haceMeses(3, 5)],
      [1, 'Hosting por 1 año', 'hosting', 480000, haceMeses(3, 5)],
      [2, 'API de WhatsApp Business', 'software', 350000, haceMeses(2, 22)],
      [2, 'Servidor por 6 meses', 'hosting', 600000, haceMeses(2, 22)],
      [3, 'Servicio de SMS para recordatorios', 'software', 150000, haceMeses(1, 8)],
      [4, 'Licencia de tipografía', 'software', 420000, haceMeses(4, 16)],
      [4, 'Impresión del manual', 'otro', 180000, haceMeses(3, 28)],
      [7, 'Dominio de la tienda', 'dominio', 250000, haceMeses(5, 11)],
    ].map(([proyecto_id, concepto, categoria, monto, fecha]) => ({ id: ++id, proyecto_id, concepto, categoria, monto, fecha }));
    const tareas = [
      [2, 'Diseño de la pantalla de reservas', true], [2, 'Conectar la API de WhatsApp', true],
      [2, 'Cargar las mesas y horarios del local', false], [2, 'Probar con el personal del salón', false], [2, 'Capacitación al encargado', false],
      [3, 'Pedir el listado de profesionales y horarios', true], [3, 'Configurar los SMS de recordatorio', false], [3, 'Probar turnos con 3 pacientes reales', false],
      [5, 'Reunión para definir los indicadores', false], [5, 'Mandar el presupuesto revisado', false],
      [6, 'Esperar las fotos en alta de la serie "Ñandutí"', false],
    ].map(([proyecto_id, texto, hecha]) => ({ id: ++id, proyecto_id, texto, hecha }));
    const notas = [
      [1, 'estado', 'en_curso', null, haceMeses(3, 4), '10:15'],
      [1, 'nota', null, 'Pidieron sumar el menú en guaraní además de en castellano. Sin costo extra.', haceMeses(3, 20), '16:40'],
      [1, 'estado', 'entregado', 'Entregado y publicado. Quedaron muy contentos con el botón de WhatsApp.', haceMeses(2, 12), '11:05'],
      [2, 'estado', 'en_curso', 'Aceptaron el presupuesto y pagaron la seña.', haceMeses(2, 20), '09:30'],
      [2, 'nota', null, 'El dueño quiere que las reservas de más de 8 personas pidan seña. Ver si entra en esta etapa.', haceMeses(1, 22), '18:10'],
      [3, 'estado', 'en_curso', null, haceMeses(1, 6), '14:00'],
      [3, 'nota', null, 'La doctora prefiere SMS antes que WhatsApp para los pacientes mayores.', haceMeses(1, 15), '10:20'],
      [4, 'estado', 'entregado', 'Se entregó el manual impreso y en PDF.', haceMeses(3, 28), '15:45'],
      [5, 'nota', null, 'Piden ver un ejemplo antes de aceptar. Mandar capturas del panel de Pyahu.', enDias(-3), '12:00'],
      [7, 'estado', 'en_curso', null, haceMeses(5, 10), '10:00'],
      [7, 'estado', 'cancelado', 'El cliente decidió vender solo en el local por ahora. El adelanto no se devuelve, como estaba acordado.', haceMeses(4, 2), '17:30'],
    ].map(([proyecto_id, tipo, estado, texto, fecha, hora]) => ({ id: ++id, proyecto_id, tipo, estado, texto, creada_en: momento(fecha, hora) }));
    return { clientes, proyectos, pagos, gastos, tareas, notas, sig: 1000 };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(CLAVE)); } catch { db = null; }
  if (!db || !Array.isArray(db.notas)) db = semilla();
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(db)); } catch { /* sin almacenamiento: vive en memoria */ } };

  // ---------- Ayudas ----------
  class Fallo extends Error { constructor(status, cuerpo) { super(cuerpo.error); this.status = status; this.cuerpo = cuerpo; } }
  const invalido = (...detalles) => { throw new Fallo(400, { error: 'Datos inválidos', detalles }); };
  const noEncontrado = (que) => { throw new Fallo(404, { error: `${que} no encontrado` }); };
  const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
  const entero = (v) => Number.isInteger(v);
  const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || '') && iso(new Date(`${f}T12:00:00`)) === f;
  const ESTADOS = ['presupuesto', 'en_curso', 'entregado', 'cancelado'];
  const METODOS = ['transferencia', 'efectivo', 'otro'];
  const CATEGORIAS = ['dominio', 'hosting', 'software', 'tercerizado', 'otro'];
  const TASAS_IVA = [10, 5, 0];
  const ivaIncluido = (monto, tasa) => Math.round((monto * tasa) / (100 + tasa));
  const suma = (lista, campo = 'monto') => lista.reduce((t, x) => t + x[campo], 0);
  const filtrar = (lista, query) => {
    const pid = query.get('proyecto_id');
    return pid ? lista.filter((x) => x.proyecto_id === Number(pid)) : lista;
  };

  const pagadoDe = (id, sinPago) => suma(db.pagos.filter((p) => p.proyecto_id === id && p.id !== sinPago));
  function proyectoCompleto(p) {
    const c = db.clientes.find((x) => x.id === p.cliente_id) || {};
    const pagos = db.pagos.filter((x) => x.proyecto_id === p.id);
    const tareas = db.tareas.filter((x) => x.proyecto_id === p.id);
    const pagado = suma(pagos);
    const gastos = suma(db.gastos.filter((x) => x.proyecto_id === p.id));
    // Igual que la API: un cancelado calcula el neto sobre lo cobrado
    const base = p.estado === 'cancelado' ? pagado : p.monto_total;
    const iva = ivaIncluido(base, p.tasa_iva);
    return {
      ...p, cliente: c.nombre || '', cliente_telefono: c.telefono || null,
      pagado, sin_facturar: suma(pagos.filter((x) => !x.facturado)), gastos,
      tareas: tareas.length, tareas_hechas: tareas.filter((x) => x.hecha).length,
      saldo: p.monto_total - pagado, iva, neto: base - iva - gastos,
    };
  }
  const anotarEstado = (proyecto_id, estado, textoNota = null) =>
    db.notas.push({ id: ++db.sig, proyecto_id, tipo: 'estado', estado, texto: textoNota, creada_en: new Date().toISOString() });

  function datosCliente(b) {
    const nombre = texto(b.nombre);
    if (!nombre) invalido('nombre es obligatorio');
    const email = texto(b.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalido('email debe ser un email válido');
    return { nombre, email, telefono: texto(b.telefono), ruc_ci: texto(b.ruc_ci) };
  }

  function datosProyecto(b) {
    const errores = [];
    if (!db.clientes.some((c) => c.id === b.cliente_id)) throw new Fallo(400, { error: 'El cliente no existe' });
    const nombre = texto(b.nombre);
    if (!nombre) errores.push('nombre es obligatorio');
    const estado = b.estado || 'presupuesto';
    if (!ESTADOS.includes(estado)) errores.push('estado no es válido');
    const monto = b.monto_total === undefined ? 0 : b.monto_total;
    if (!entero(monto) || monto < 0) errores.push('monto_total debe ser un número entero (sin comillas)');
    const tasa = b.tasa_iva === undefined ? 10 : b.tasa_iva;
    if (!TASAS_IVA.includes(tasa)) errores.push('tasa_iva debe ser: 10, 5, 0');
    const fecha_entrega = texto(b.fecha_entrega);
    if (fecha_entrega && !fechaValida(fecha_entrega)) errores.push('fecha_entrega no es una fecha real');
    if (errores.length) invalido(...errores);
    return { cliente_id: b.cliente_id, nombre, descripcion: texto(b.descripcion), estado, monto_total: monto, tasa_iva: tasa, fecha_entrega };
  }

  function datosPago(b) {
    const errores = [];
    if (!entero(b.monto) || b.monto < 1) errores.push('monto debe ser un número entero mayor a 0');
    if (!fechaValida(b.fecha)) errores.push('fecha debe ser una fecha real (AAAA-MM-DD)');
    const metodo = b.metodo || 'transferencia';
    if (!METODOS.includes(metodo)) errores.push('metodo no es válido');
    if (errores.length) invalido(...errores);
    const facturado = b.facturado === true;
    return { monto: b.monto, fecha: b.fecha, metodo, nota: texto(b.nota), facturado, factura_numero: facturado ? texto(b.factura_numero) : null };
  }

  function datosGasto(b) {
    const errores = [];
    const concepto = texto(b.concepto);
    if (!concepto) errores.push('concepto es obligatorio');
    const categoria = b.categoria || 'otro';
    if (!CATEGORIAS.includes(categoria)) errores.push(`categoria debe ser: ${CATEGORIAS.join(', ')}`);
    if (!entero(b.monto) || b.monto < 1) errores.push('monto debe ser un número entero (sin comillas)');
    if (!fechaValida(b.fecha)) errores.push('fecha debe ser una fecha real (AAAA-MM-DD)');
    if (errores.length) invalido(...errores);
    return { concepto, categoria, monto: b.monto, fecha: b.fecha };
  }

  const textoObligatorio = (b, max) => {
    const t = texto(b.texto);
    if (!t) invalido('texto es obligatorio');
    if (t.length > max) invalido(`texto admite hasta ${max} caracteres`);
    return t;
  };
  const proyectoExiste = (id) => db.proyectos.find((x) => x.id === id) || noEncontrado('Proyecto');

  function resumen() {
    const todos = db.proyectos.map(proyectoCompleto);
    const por_estado = {};
    for (const e of ESTADOS) {
      const lista = todos.filter((p) => p.estado === e);
      const monto_total = suma(lista, 'monto_total');
      const cobrado = suma(lista, 'pagado');
      por_estado[e] = { proyectos: lista.length, monto_total, cobrado, pendiente: e === 'cancelado' ? 0 : monto_total - cobrado, gastos: suma(lista, 'gastos') };
    }
    const total = (campo, estados) => estados.reduce((t, e) => t + por_estado[e][campo], 0);
    const total_cobrado = total('cobrado', ESTADOS);
    const iva_cobrado = todos.reduce((t, p) => t + ivaIncluido(p.pagado, p.tasa_iva), 0);
    const total_gastos = total('gastos', ESTADOS);
    return {
      total_cobrado,
      total_pendiente: total('pendiente', ['en_curso', 'entregado']),
      total_presupuestado: por_estado.presupuesto.pendiente,
      iva_cobrado,
      total_gastos,
      neto_cobrado: total_cobrado - iva_cobrado - total_gastos,
      neto_proyectado: todos.filter((p) => p.estado === 'en_curso' || p.estado === 'entregado')
        .reduce((t, p) => t + p.monto_total - ivaIncluido(p.monto_total, p.tasa_iva) - p.gastos, 0),
      sin_facturar: suma(todos, 'sin_facturar'),
      por_estado,
    };
  }

  function mensual(meses) {
    const lista = [];
    const hoy = new Date();
    for (let i = meses - 1; i >= 0; i--) {
      const mes = iso(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)).slice(0, 7);
      const delMes = db.pagos.filter((p) => p.fecha.slice(0, 7) === mes);
      lista.push({ mes, cobrado: suma(delMes), pagos: delMes.length });
    }
    return lista;
  }

  // Token con la misma forma que un JWT, para que app.js lea email y vencimiento
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const token = () => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: 1, email: DEMO.email, nombre: DEMO.nombre, exp: Math.floor(Date.now() / 1000) + 8 * 3600 })}.demo`;

  // CRUD genérico de las tablas "hijas" de un proyecto (gastos, tareas, notas)
  function crudHijo(tabla, nombre, metodo, id, query, b, { crear, editar, orden }) {
    if (id === null && metodo === 'GET') return [200, filtrar(db[tabla], query).slice().sort(orden)];
    if (id === null && metodo === 'POST') {
      proyectoExiste(b.proyecto_id);
      const fila = { id: ++db.sig, proyecto_id: b.proyecto_id, ...crear(b) };
      db[tabla].push(fila);
      return [201, fila];
    }
    const fila = db[tabla].find((x) => x.id === id) || noEncontrado(nombre);
    if (metodo === 'PUT') { Object.assign(fila, editar(b, fila)); return [200, fila]; }
    if (metodo === 'DELETE') { db[tabla] = db[tabla].filter((x) => x.id !== id); return [204, null]; }
    return [404, { error: 'Ruta no encontrada' }];
  }

  // ---------- Rutas ----------
  function atender(metodo, ruta, query, b, auth) {
    if (ruta === '/estado') return [200, { api: 'Pyahu Labs (demo)', estado: 'ok' }];
    if (ruta === '/auth/config') return [200, { registro_abierto: false }];
    if (ruta === '/auth/registro') return [403, { error: 'El registro está cerrado. Pedile una cuenta a quien administra el estudio.' }];
    if (ruta === '/auth/login' && metodo === 'POST') {
      if (String(b.email || '').toLowerCase() !== DEMO.email || b.password !== DEMO.password) return [401, { error: 'Email o contraseña incorrectos' }];
      return [200, { token: token() }];
    }
    if (!auth) return [401, { error: 'Falta el token' }];

    const [, recurso, idTexto, extra] = ruta.split('/');
    const id = idTexto === undefined ? null : Number(idTexto);
    if (idTexto !== undefined && !(Number.isInteger(id) && id > 0) && recurso !== 'resumen') return [400, { error: 'id inválido' }];

    if (recurso === 'resumen') {
      if (idTexto === 'mensual') {
        const meses = query.get('meses') === null ? 12 : Number(query.get('meses'));
        if (!Number.isInteger(meses) || meses < 1 || meses > 36) return [400, { error: 'meses debe ser un entero entre 1 y 36' }];
        return [200, mensual(meses)];
      }
      return [200, resumen()];
    }

    if (recurso === 'clientes') {
      if (id === null && metodo === 'GET') return [200, [...db.clientes].sort((a, z) => a.nombre.localeCompare(z.nombre))];
      if (id === null && metodo === 'POST') { const c = { id: ++db.sig, ...datosCliente(b) }; db.clientes.push(c); return [201, c]; }
      const c = db.clientes.find((x) => x.id === id) || noEncontrado('Cliente');
      if (metodo === 'GET') return [200, c];
      if (metodo === 'PUT') { Object.assign(c, datosCliente(b)); return [200, c]; }
      if (metodo === 'DELETE') {
        db.proyectos.filter((p) => p.cliente_id === id).forEach((p) => borrarProyecto(p.id));
        db.clientes = db.clientes.filter((x) => x.id !== id);
        return [204, null];
      }
    }

    if (recurso === 'proyectos') {
      if (id === null && metodo === 'GET') return [200, [...db.proyectos].sort((a, z) => z.id - a.id).map(proyectoCompleto)];
      if (id === null && metodo === 'POST') {
        const p = { id: ++db.sig, ...datosProyecto(b), creado_en: iso(new Date()) };
        db.proyectos.push(p);
        return [201, proyectoCompleto(p)];
      }
      const p = db.proyectos.find((x) => x.id === id) || noEncontrado('Proyecto');
      if (extra === 'estado' && metodo === 'PATCH') {
        if (!ESTADOS.includes(b.estado)) invalido('estado debe ser: presupuesto, en_curso, entregado, cancelado');
        const nota = texto(b.nota);
        if (p.estado !== b.estado) { p.estado = b.estado; anotarEstado(p.id, b.estado, nota); }
        else if (nota) db.notas.push({ id: ++db.sig, proyecto_id: p.id, tipo: 'nota', estado: null, texto: nota, creada_en: new Date().toISOString() });
        return [200, { id: p.id, estado: p.estado }];
      }
      if (metodo === 'GET') return [200, proyectoCompleto(p)];
      if (metodo === 'PUT') {
        const nuevo = datosProyecto(b);
        const pagado = pagadoDe(id);
        if (nuevo.monto_total < pagado) return [400, { error: 'monto_total no puede ser menor a lo ya cobrado', pagado }];
        const antes = p.estado;
        Object.assign(p, nuevo);
        if (antes !== p.estado) anotarEstado(p.id, p.estado);
        return [200, proyectoCompleto(p)];
      }
      if (metodo === 'DELETE') { borrarProyecto(id); return [204, null]; }
    }

    if (recurso === 'pagos') {
      if (id === null && metodo === 'GET') return [200, filtrar(db.pagos, query).slice().sort((a, z) => z.fecha.localeCompare(a.fecha) || z.id - a.id)];
      if (id === null && metodo === 'POST') {
        const pr = proyectoExiste(b.proyecto_id);
        const datos = datosPago(b);
        const saldo = pr.monto_total - pagadoDe(pr.id);
        if (datos.monto > saldo) return [400, { error: 'El pago supera el saldo del proyecto', saldo }];
        const pago = { id: ++db.sig, proyecto_id: pr.id, ...datos };
        db.pagos.push(pago);
        return [201, pago];
      }
      const pago = db.pagos.find((x) => x.id === id) || noEncontrado('Pago');
      if (extra === 'factura' && metodo === 'PATCH') {
        if (typeof b.facturado !== 'boolean') invalido('facturado debe ser true o false (sin comillas)');
        pago.facturado = b.facturado;
        pago.factura_numero = b.facturado ? texto(b.factura_numero) : null;
        return [200, { id: pago.id, facturado: pago.facturado, factura_numero: pago.factura_numero }];
      }
      if (metodo === 'GET') return [200, pago];
      if (metodo === 'PUT') {
        const datos = datosPago(b);
        const pr = db.proyectos.find((x) => x.id === pago.proyecto_id);
        const saldo = pr.monto_total - pagadoDe(pr.id, pago.id);
        if (datos.monto > saldo) return [400, { error: 'El pago supera el saldo del proyecto', saldo }];
        Object.assign(pago, datos);
        return [200, pago];
      }
      if (metodo === 'DELETE') { db.pagos = db.pagos.filter((x) => x.id !== id); return [204, null]; }
    }

    if (recurso === 'gastos') {
      return crudHijo('gastos', 'Gasto', metodo, id, query, b, {
        crear: datosGasto, editar: datosGasto, orden: (a, z) => z.fecha.localeCompare(a.fecha) || z.id - a.id,
      });
    }
    if (recurso === 'tareas') {
      return crudHijo('tareas', 'Pendiente', metodo, id, query, b, {
        crear: (x) => ({ texto: textoObligatorio(x, 255), hecha: false }),
        editar: (x) => {
          if (typeof x.hecha !== 'boolean') invalido('hecha debe ser true o false (sin comillas)');
          return { texto: textoObligatorio(x, 255), hecha: x.hecha };
        },
        orden: (a, z) => a.id - z.id,
      });
    }
    if (recurso === 'notas') {
      return crudHijo('notas', 'Nota', metodo, id, query, b, {
        crear: (x) => ({ tipo: 'nota', estado: null, texto: textoObligatorio(x, 2000), creada_en: new Date().toISOString() }),
        editar: (x) => ({ texto: textoObligatorio(x, 2000) }),
        orden: (a, z) => z.creada_en.localeCompare(a.creada_en) || z.id - a.id,
      });
    }
    return [404, { error: 'Ruta no encontrada' }];
  }

  // Borra el proyecto y todo lo suyo, como el ON DELETE CASCADE de MySQL
  function borrarProyecto(id) {
    for (const tabla of ['pagos', 'gastos', 'tareas', 'notas']) db[tabla] = db[tabla].filter((x) => x.proyecto_id !== id);
    db.proyectos = db.proyectos.filter((x) => x.id !== id);
  }

  const RECURSOS = /^\/(estado|auth|clientes|proyectos|pagos|gastos|tareas|notas|resumen)(\/|$)/;
  const respuesta = (status, datos) => (status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } }));
  const fetchReal = window.fetch.bind(window);
  window.fetch = async (entrada, opciones = {}) => {
    const crudo = typeof entrada === 'string' ? entrada : '';
    const url = new URL(crudo || entrada.url, location.href);
    if (!crudo.startsWith('/') || !RECURSOS.test(url.pathname)) return fetchReal(entrada, opciones);
    const metodo = (opciones.method || 'GET').toUpperCase();
    const auth = /^Bearer .+/.test((opciones.headers && opciones.headers.Authorization) || '');
    let cuerpo = {};
    try { cuerpo = opciones.body ? JSON.parse(opciones.body) : {}; } catch { return respuesta(400, { error: 'El cuerpo no es un JSON válido' }); }
    await new Promise((r) => setTimeout(r, 120)); // un poquito de "red" para ver los estados de carga
    try {
      const [status, datos] = atender(metodo, url.pathname, url.searchParams, cuerpo, auth);
      if (metodo !== 'GET' && status < 300) guardar();
      return respuesta(status, datos);
    } catch (e) {
      if (e instanceof Fallo) return respuesta(e.status, e.cuerpo);
      console.error(e);
      return respuesta(500, { error: 'Error inesperado en la demo' });
    }
  };

  // Sin service worker en la demo (el visor no los permite)
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true }); } catch { /* sigue igual */ }

  // Si el visor eligió claro u oscuro a mano y vos no tocaste el botón, se respeta
  const visor = document.documentElement.dataset.theme;
  if (!document.documentElement.dataset.tema && (visor === 'dark' || visor === 'light')) {
    document.documentElement.dataset.tema = visor === 'dark' ? 'oscuro' : 'claro';
  }

  window.pyahuDemo = {
    reiniciar() { db = semilla(); guardar(); location.hash = 'resumen'; location.reload(); },
    DEMO,
  };
})();
