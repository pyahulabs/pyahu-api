// Pyahu Labs · Panel de gestión
// JavaScript sin librerías: habla con la API con fetch y dibuja cada vista.
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ESTADOS = {
  presupuesto: { nombre: 'Presupuesto', color: 'var(--dorado)' },
  en_curso: { nombre: 'En curso', color: 'var(--azul)' },
  entregado: { nombre: 'Entregado', color: 'var(--verde)' },
  cancelado: { nombre: 'Cancelado', color: 'var(--tinta-suave)' },
};
const METODOS = { transferencia: 'Transferencia', efectivo: 'Efectivo', otro: 'Otro' };
const CATEGORIAS = {
  dominio: { nombre: 'Dominio', color: 'var(--azul)' },
  hosting: { nombre: 'Hosting', color: 'var(--verde)' },
  software: { nombre: 'Software y licencias', color: 'var(--dorado)' },
  tercerizado: { nombre: 'Trabajo tercerizado', color: 'var(--terracota)' },
  otro: { nombre: 'Otro', color: 'var(--tinta-suave)' },
};
// En Paraguay los precios se dan con IVA incluido: 10 % para servicios
const TASAS_IVA = [[10, 'IVA 10 % incluido'], [5, 'IVA 5 % incluido'], [0, 'Sin IVA']];
const ivaIncluido = (monto, tasa) => Math.round((monto * tasa) / (100 + tasa));
const VISTAS = {
  resumen: { titulo: 'Cómo <em>vamos</em>', accion: null },
  clientes: { titulo: 'Tus <em>clientes</em>', accion: 'Nuevo cliente' },
  proyectos: { titulo: 'Los <em>proyectos</em>', accion: 'Nuevo proyecto' },
  pagos: { titulo: 'Lo <em>cobrado</em>', accion: 'Registrar pago' },
  // La ficha de un proyecto (#proyecto-12): el título es el nombre del proyecto
  proyecto: { titulo: '', accion: 'Registrar pago' },
};
const COLORES = ['#C1502E', '#3E6259', '#2E6E8E', '#B9832F', '#7A4E6E', '#5B7A3A'];

const estado = {
  token: guardado('token'),
  vista: 'resumen',
  proyectoId: null, // el de la ficha abierta
  datos: { clientes: [], proyectos: [], pagos: [], gastos: [], tareas: [], notas: [], resumen: null },
  buscar: '',
  filtroProyectos: 'todos',
  filtroPagos: '',
  soloSinFactura: false,
  enfocar: null, // selector a enfocar después de redibujar (para cargar pendientes seguidos)
};

// ---------- Utilidades ----------
function guardado(clave, valor) {
  try {
    if (valor === undefined) return localStorage.getItem(clave);
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch { return null; }
}
const numero = (n) => Math.round(n || 0).toLocaleString('es-PY');
const gs = (n) => `₲ ${numero(n)}`;
// Todo texto que viene de la base pasa por esc() antes de ir al HTML (evita XSS)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const iniciales = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const colorDe = (s) => COLORES[[...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORES.length];
const fecha = (f) => new Date(`${f.slice(0, 10)}T12:00:00`);
const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const ICONOS = {
  editar: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  borrar: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  email: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  telefono: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  ruc: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M15 10h3M15 14h3"/></svg>',
  buscar: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  tilde: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c.3 2 2.2 4.2 4.6 4.9l1.3-1.2 1.8.8-.4 1.6c-3.4.4-7.4-3.3-7.3-6.9l1.6-.4.8 1.8z"/></svg>',
  nota: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h5"/></svg>',
  estado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  pago: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  gasto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  creado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
  mas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ---------- API ----------
class ErrorApi extends Error {
  constructor(datos, status) {
    super(datos.detalles ? datos.detalles.join('. ') : datos.error || 'Algo salió mal');
    this.status = status;
  }
}

async function api(ruta, metodo = 'GET', datos) {
  const headers = { 'Content-Type': 'application/json' };
  if (estado.token) headers.Authorization = `Bearer ${estado.token}`;
  let r;
  try {
    r = await fetch(ruta, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
  } catch {
    throw new ErrorApi({ error: 'No se pudo conectar con el servidor' }, 0);
  }
  if (r.status === 204) return null;
  const json = await r.json().catch(() => ({}));
  if (r.status === 401 && estado.token) cerrarSesion('Tu sesión venció. Ingresá de nuevo.');
  if (!r.ok) throw new ErrorApi(json, r.status);
  return json;
}

// El token JWT trae el email y el vencimiento en su parte del medio (base64)
function leerToken(t) {
  try {
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.exp * 1000 > Date.now() ? p : null;
  } catch { return null; }
}

// ---------- Avisos ----------
function avisar(texto, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.textContent = texto;
  $('#avisos').append(el);
  setTimeout(() => { el.classList.add('sale'); el.addEventListener('animationend', () => el.remove()); }, 3200);
}

function confeti(x, y) {
  if (quieto) return;
  const colores = ['#C1502E', '#E7A64B', '#3E6259', '#6E9A8C', '#E07A52'];
  for (let i = 0; i < 34; i++) {
    const c = document.createElement('i');
    c.className = 'confeti';
    const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
    c.style.cssText = `left:${x}px;top:${y}px;background:${colores[i % colores.length]};--x:${Math.cos(ang) * dist}px;--y:${Math.sin(ang) * dist - 60}px;--g:${Math.random() * 720 - 360}deg`;
    document.body.append(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

// ---------- Acceso ----------
let modoAcceso = 'login';

function prepararAcceso() {
  const polen = $('#polen');
  if (!polen.children.length && !quieto) {
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;--t:${3 + Math.random() * 7}px;--d:${9 + Math.random() * 12}s;--r:${-Math.random() * 20}s;--x:${Math.random() * 120 - 60}px`;
      polen.append(p);
    }
  }
  $$('.pestana').forEach((b) => b.addEventListener('click', () => cambiarModo(b.dataset.modo)));
  $('#form-acceso').addEventListener('submit', enviarAcceso);
}

function cambiarModo(modo) {
  modoAcceso = modo;
  const registro = modo === 'registro';
  $('.pestanas').dataset.modo = modo;
  $$('.pestana').forEach((b) => { b.classList.toggle('activa', b.dataset.modo === modo); b.setAttribute('aria-selected', b.dataset.modo === modo); });
  $$('.solo-registro').forEach((el) => { el.hidden = !registro; });
  $('#acceso-titulo').textContent = registro ? 'Creá tu cuenta' : 'Hola de nuevo';
  $('#acceso-sub').textContent = registro ? 'Tarda menos de un minuto.' : 'Ingresá con tu email y contraseña.';
  $('#form-acceso [type=submit] span').textContent = registro ? 'Crear cuenta' : 'Ingresar';
  $('#form-acceso [name=password]').autocomplete = registro ? 'new-password' : 'current-password';
  $('#form-acceso .error-form').textContent = '';
}

async function enviarAcceso(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const boton = form.querySelector('[type=submit]');
  const error = form.querySelector('.error-form');
  const datos = Object.fromEntries(new FormData(form));
  error.textContent = '';
  boton.classList.add('cargando');
  try {
    if (modoAcceso === 'registro') await api('/auth/registro', 'POST', datos);
    const { token } = await api('/auth/login', 'POST', { email: datos.email, password: datos.password });
    estado.token = token;
    guardado('token', token);
    form.reset();
    entrar();
    if (modoAcceso === 'registro') avisar('¡Cuenta creada! Bienvenido.');
  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.classList.remove('cargando');
  }
}

function cerrarSesion(mensaje) {
  estado.token = null;
  guardado('token', null);
  $('#app').hidden = true;
  $('#acceso').hidden = false;
  if (mensaje) avisar(mensaje, 'error');
}

// ---------- Panel ----------
function entrar() {
  const usuario = leerToken(estado.token);
  if (!usuario) return cerrarSesion();
  $('#acceso').hidden = true;
  $('#app').hidden = false;
  $('#usuario-email').textContent = usuario.nombre || usuario.email;
  $('#usuario-email').title = usuario.email;
  const av = $('#usuario-avatar');
  av.textContent = iniciales(usuario.nombre || usuario.email);
  av.style.setProperty('--c', colorDe(usuario.email));
  estado.vista = vistaDelHash();
  $('#vista').innerHTML = '<div class="grilla kpis">' + '<div class="esqueleto"></div>'.repeat(3) + '</div>';
  pintarMenu();
  cargarTodo(true);
}

function vistaDelHash() {
  const hash = location.hash.slice(1);
  const ficha = /^proyecto-(\d+)$/.exec(hash);
  if (ficha) { estado.proyectoId = Number(ficha[1]); return 'proyecto'; }
  return VISTAS[hash] && hash !== 'proyecto' ? hash : 'resumen';
}

const proyectoActual = () => estado.datos.proyectos.find((p) => p.id === estado.proyectoId);
// Se le puede registrar un pago si no está cancelado y le falta cobrar
const abierto = (p) => p && p.estado !== 'cancelado' && p.saldo > 0;

async function cargarTodo(animar = false) {
  try {
    const [clientes, proyectos, pagos, gastos, tareas, notas, resumen, mensual] = await Promise.all(
      ['/clientes', '/proyectos', '/pagos', '/gastos', '/tareas', '/notas', '/resumen', '/resumen/mensual?meses=12'].map((r) => api(r)));
    estado.datos = { clientes, proyectos, pagos, gastos, tareas, notas, resumen, mensual };
    pintar(animar);
  } catch (err) {
    if (estado.token) avisar(err.message, 'error');
  }
}

function pintarMenu() {
  // En la ficha de un proyecto, el menú marca "Proyectos"
  const activo = $(`.menu a[data-vista="${estado.vista === 'proyecto' ? 'proyectos' : estado.vista}"]`);
  $$('.menu a').forEach((a) => a.classList.toggle('activa', a === activo));
  const marca = $('.menu-marca');
  marca.style.cssText = `width:${activo.offsetWidth}px;height:${activo.offsetHeight}px;transform:translate(${activo.offsetLeft}px,${activo.offsetTop}px);opacity:1`;
}

function pintar(animar) {
  const v = VISTAS[estado.vista];
  let { titulo, accion: textoAccion } = v;
  const sobre = $('#vista-fecha');
  if (estado.vista === 'proyecto') {
    // Ficha: el título es el proyecto y arriba va el camino de vuelta
    const p = proyectoActual();
    titulo = p ? esc(p.nombre) : 'Proyecto';
    if (!abierto(p)) textoAccion = null;
    sobre.innerHTML = '<a class="volver" href="#proyectos">← Proyectos</a>';
  } else {
    sobre.textContent = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  $('#vista-titulo').innerHTML = titulo;
  document.title = `${$('#vista-titulo').textContent} · Pyahu Labs`;
  const accion = $('#accion-principal');
  accion.hidden = !textoAccion;
  if (textoAccion) accion.querySelector('span').textContent = textoAccion;
  accion.setAttribute('aria-label', textoAccion || '');

  const vista = $('#vista');
  vista.innerHTML = { resumen: vistaResumen, clientes: vistaClientes, proyectos: vistaProyectos, pagos: vistaPagos, proyecto: vistaProyecto }[estado.vista]();
  vista.classList.toggle('quieta', !animar);
  if (animar) { vista.classList.remove('cambia'); void vista.offsetWidth; vista.classList.add('cambia'); }
  animarVista(vista, animar);
  if (estado.enfocar) { $(estado.enfocar)?.focus(); estado.enfocar = null; }
}

// Barras, anillo y números arrancan en cero y crecen al valor real
function animarVista(vista, animar) {
  const aplicar = () => {
    $$('[data-ancho]', vista).forEach((el) => { el.style.width = el.dataset.ancho; });
    $$('[data-alto]', vista).forEach((el) => { el.style.height = el.dataset.alto; });
    $$('[data-anillo]', vista).forEach((el) => { el.style.strokeDashoffset = 1 - Number(el.dataset.anillo); });
    $$('[data-contar]', vista).forEach((el) => contar(el, animar));
  };
  if (animar) requestAnimationFrame(() => requestAnimationFrame(aplicar));
  else aplicar();
}

function contar(el, animar) {
  const fin = Number(el.dataset.contar);
  const formato = el.dataset.formato === 'pct' ? (n) => Math.round(n) : numero;
  if (!animar || quieto) { el.textContent = formato(fin); return; }
  const t0 = performance.now(), dur = 1400;
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = formato(fin * (1 - Math.pow(1 - k, 4)));
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function vacio(titulo, texto, boton) {
  return `<div class="vacio entra">
    <svg class="brote-anim"><use href="#brote"/></svg>
    <h3>${titulo}</h3><p>${texto}</p>
    ${boton ? `<button class="btn btn-terracota" data-accion="${boton.accion}"><span>${boton.texto}</span></button>` : ''}
  </div>`;
}

// ---------- Vista: Resumen ----------
function vistaResumen() {
  const { resumen: r, proyectos, pagos } = estado.datos;
  if (!proyectos.length) {
    return vacio('Todo listo para <em>empezar</em>', 'Cargá tu primer cliente y su proyecto, y acá vas a ver cuánto cobraste y cuánto falta.',
      { accion: 'nuevo-cliente', texto: 'Crear el primer cliente' });
  }
  const pe = r.por_estado;
  const activos = pe.en_curso.proyectos + pe.entregado.proyectos;
  const comprometido = pe.en_curso.monto_total + pe.entregado.monto_total;
  const cobradoActivos = pe.en_curso.cobrado + pe.entregado.cobrado;
  const pct = comprometido ? cobradoActivos / comprometido : 0;
  const maximo = Math.max(1, ...Object.values(pe).map((e) => e.monto_total));

  const kpi = (i, color, titulo, monto, detalle) => `
    <article class="tarjeta kpi entra" style="--i:${Math.min(i, 12)};--c:${color}">
      <p class="mono">${titulo}</p>
      <p class="kpi-numero"><small>₲</small><span data-contar="${monto}">0</span></p>
      <p class="suave">${detalle}</p>
    </article>`;

  const filas = Object.entries(pe).filter(([, e]) => e.proyectos).map(([clave, e], i) => `
    <div class="estado-fila">
      <header><span><b>${ESTADOS[clave].nombre}</b> · ${plural(e.proyectos, 'proyecto', 'proyectos')}</span>
        <span class="suave">${gs(e.cobrado)} de ${gs(e.monto_total)}</span></header>
      <div class="barra" style="--i:${Math.min(i, 12)}">
        <i class="cobrado" data-ancho="${(e.cobrado / maximo) * 100}%"></i>
        <i class="pendiente ${clave === 'presupuesto' ? 'presupuestado' : ''}" data-ancho="${(e.pendiente / maximo) * 100}%"></i>
      </div>
    </div>`).join('');

  const ultimos = pagos.slice(0, 5).map((p, i) => filaPago(p, i)).join('');

  return `
    <div class="grilla kpis">
      ${kpi(0, 'var(--verde)', 'Cobrado', r.total_cobrado, `en ${plural(pagos.length, 'pago', 'pagos')}`)}
      ${kpi(1, 'var(--terracota)', 'Pendiente de cobro', r.total_pendiente, `de ${plural(activos, 'proyecto activo', 'proyectos activos')}`)}
      ${kpi(2, 'var(--dorado)', 'En presupuestos', r.total_presupuestado, `${plural(pe.presupuesto.proyectos, 'presupuesto', 'presupuestos')} sin aceptar`)}
    </div>
    ${tarjetaNeto(r)}
    <div class="grilla resumen-medio">
      <article class="tarjeta anillo-caja entra" style="--i:3">
        <div class="anillo">
          <svg viewBox="0 0 200 200">
            <defs><linearGradient id="grad-anillo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#6E9A8C"/><stop offset="1" stop-color="#3E6259"/></linearGradient></defs>
            <circle class="fondo" cx="100" cy="100" r="84"/>
            <circle class="valor" cx="100" cy="100" r="84" pathLength="1" data-anillo="${pct}"/>
          </svg>
          <div class="anillo-centro"><strong><span data-contar="${pct * 100}" data-formato="pct">0</span>%</strong><span>cobrado</span></div>
        </div>
        <p class="suave">De ${gs(comprometido)} en proyectos en curso y entregados.</p>
      </article>
      <article class="tarjeta entra" style="--i:4">
        <h3>Por estado</h3>
        <div class="estados">${filas}</div>
        <div class="leyenda"><span style="--c:var(--verde)">Cobrado</span><span style="--c:var(--terracota)">Pendiente</span><span style="--c:var(--dorado)">Presupuestado</span></div>
      </article>
    </div>
    <div class="grilla resumen-medio resumen-bajo">
      <article class="tarjeta entra" style="--i:5">
        <h3>Cobrado por mes</h3>
        ${graficoMeses()}
      </article>
      <article class="tarjeta entra" style="--i:6">
        <h3>Próximas entregas</h3>
        ${proximasEntregas()}
      </article>
    </div>
    <div class="grilla resumen-medio resumen-final">
      <article class="tarjeta entra" style="--i:7">
        <h3>Para hacer</h3>
        ${paraHacer()}
      </article>
      <article class="tarjeta entra" style="--i:8">
        <h3>Últimos pagos</h3>
        <div class="lista">${ultimos || '<p class="suave" style="padding:16px 4px">Todavía no registraste pagos.</p>'}</div>
      </article>
    </div>`;
}

// Lo que conviene resolver: pagos sin factura y pendientes de los proyectos activos
function paraHacer() {
  const { pagos, proyectos, tareas } = estado.datos;
  const sinFactura = pagos.filter((p) => !p.facturado);
  const activos = new Map(proyectos.filter((p) => p.estado === 'en_curso' || p.estado === 'presupuesto').map((p) => [p.id, p]));
  const pendientes = tareas.filter((t) => !t.hecha && activos.has(t.proyecto_id));
  const filas = [];
  if (sinFactura.length) {
    filas.push(`<a class="hacer hacer-factura" href="#pagos" data-accion="ver-sin-factura">
      <span class="hacer-icono">${ICONOS.pago}</span>
      <span><b>Facturar ${plural(sinFactura.length, 'pago', 'pagos')}</b><small>${gs(sinFactura.reduce((t, p) => t + p.monto, 0))} cobrados sin factura</small></span>
      ${ICONOS.flecha}</a>`);
  }
  // Agrupados por proyecto, hasta 6 pendientes en total
  for (const t of pendientes.slice(0, 6)) {
    const p = activos.get(t.proyecto_id);
    filas.push(`<a class="hacer" href="#proyecto-${p.id}">
      <span class="hacer-check" aria-hidden="true"></span>
      <span><b>${esc(t.texto)}</b><small>${esc(p.nombre)} · ${esc(p.cliente)}</small></span>
      ${ICONOS.flecha}</a>`);
  }
  if (pendientes.length > 6) filas.push(`<p class="suave hacer-mas">Y ${plural(pendientes.length - 6, 'pendiente más', 'pendientes más')} en las fichas de los proyectos.</p>`);
  if (!filas.length) return '<p class="suave" style="margin-top:12px">Todo al día: no hay pendientes ni pagos sin factura.</p>';
  return `<div class="lista">${filas.join('')}</div>`;
}

// Lo que le queda al estudio de lo cobrado: una barra partida en neto, IVA y gastos
function tarjetaNeto(r) {
  const base = Math.max(1, r.total_cobrado, r.iva_cobrado + r.total_gastos);
  const ancho = (n) => `${(Math.max(0, n) / base) * 100}%`;
  return `<article class="tarjeta neto entra" style="--i:3">
    <div class="neto-cabeza">
      <div>
        <p class="mono">Te queda de lo cobrado</p>
        <p class="kpi-numero ${r.neto_cobrado < 0 ? 'negativo' : ''}"><small>₲</small><span data-contar="${r.neto_cobrado}">0</span></p>
      </div>
      <p class="suave">Lo cobrado menos el IVA que viene incluido y los gastos de los proyectos.
        Los proyectos en curso y entregados, cobrados completos, dejan <b>${gs(r.neto_proyectado)}</b> netos.</p>
    </div>
    <div class="barra barra-neto" role="img" aria-label="De ${gs(r.total_cobrado)} cobrados: ${gs(r.neto_cobrado)} netos, ${gs(r.iva_cobrado)} de IVA y ${gs(r.total_gastos)} de gastos">
      <i class="parte-neto" data-ancho="${ancho(r.neto_cobrado)}"></i>
      <i class="parte-iva" data-ancho="${ancho(r.iva_cobrado)}"></i>
      <i class="parte-gastos" data-ancho="${ancho(r.total_gastos)}"></i>
    </div>
    <div class="neto-partes">
      <span style="--c:var(--verde)"><small>Neto</small><b>${gs(r.neto_cobrado)}</b></span>
      <span style="--c:var(--dorado)"><small>IVA incluido</small><b>${gs(r.iva_cobrado)}</b></span>
      <span style="--c:var(--terracota)"><small>Gastos</small><b>${gs(r.total_gastos)}</b></span>
      <span style="--c:var(--linea)"><small>Cobrado</small><b>${gs(r.total_cobrado)}</b></span>
    </div>
  </article>`;
}

// Barras de los últimos 12 meses; la del mes actual va en terracota
function graficoMeses() {
  const meses = estado.datos.mensual;
  const maximo = Math.max(1, ...meses.map((m) => m.cobrado));
  const total = meses.reduce((t, m) => t + m.cobrado, 0);
  const barras = meses.map((m, i) => {
    const nombre = new Date(`${m.mes}-15T12:00:00`).toLocaleDateString('es-PY', { month: 'short' }).replace('.', '');
    return `<div class="mes ${i === meses.length - 1 ? 'actual' : ''}" style="--i:${i}" title="${nombre}: ${gs(m.cobrado)} en ${plural(m.pagos, 'pago', 'pagos')}">
      <b>${m.cobrado ? numeroCorto(m.cobrado) : ''}</b>
      <i data-alto="${Math.max(m.cobrado ? 4 : 0, (m.cobrado / maximo) * 100)}%"></i>
      <span>${nombre}</span>
    </div>`;
  }).join('');
  return `<p class="suave">${gs(total)} en los últimos 12 meses</p><div class="meses">${barras}</div>`;
}

// 1.500.000 → "1,5 M"; 850.000 → "850 mil"
const numeroCorto = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('es-PY', { maximumFractionDigits: 1 })} M` : `${Math.round(n / 1e3)} mil`);

const diasHasta = (f) => { const hoy = new Date(); hoy.setHours(12, 0, 0, 0); return Math.round((fecha(f) - hoy) / 864e5); };

function chipEntrega(p) {
  if (!p.fecha_entrega || p.estado === 'entregado' || p.estado === 'cancelado') return '';
  const d = diasHasta(p.fecha_entrega);
  const [texto, tipo] = d < 0 ? [`Atrasado ${plural(-d, 'día', 'días')}`, 'atrasado']
    : d === 0 ? ['Se entrega hoy', 'pronto']
    : d <= 7 ? [`Entrega en ${plural(d, 'día', 'días')}`, 'pronto']
    : [`Entrega ${fecha(p.fecha_entrega).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })}`, ''];
  return `<span class="chip entrega ${tipo}">${texto}</span>`;
}

function proximasEntregas() {
  const lista = estado.datos.proyectos
    .filter((p) => p.fecha_entrega && (p.estado === 'en_curso' || p.estado === 'presupuesto'))
    .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
    .slice(0, 5);
  if (!lista.length) return '<p class="suave" style="margin-top:12px">Ningún proyecto activo tiene fecha de entrega. Agregala al editar un proyecto.</p>';
  return `<div class="lista">${lista.map((p, i) => `
    <div class="fila-entrega entra" style="--i:${i}">
      <div style="min-width:0"><p class="titulo">${esc(p.nombre)}</p><p class="detalle">${esc(p.cliente)}</p></div>
      ${chipEntrega(p)}
    </div>`).join('')}</div>`;
}

// modo: sin nada (resumen), 'acciones' (lista de pagos: factura, editar y
// borrar) o 'ficha' (dentro de un proyecto: no repite el nombre del proyecto)
function filaPago(p, i, modo) {
  const proyecto = estado.datos.proyectos.find((x) => x.id === p.proyecto_id);
  const d = fecha(p.fecha);
  const conAcciones = Boolean(modo);
  const [titulo, detalle] = modo === 'ficha'
    ? [p.nota || 'Pago', METODOS[p.metodo]]
    : [proyecto ? proyecto.nombre : 'Proyecto borrado', `${proyecto ? proyecto.cliente : ''} · ${METODOS[p.metodo]}${p.nota ? ` · ${p.nota}` : ''}`];
  return `<div class="fila-pago entra ${conAcciones ? 'con-acciones' : ''}" style="--i:${Math.min(i, 12)}">
    <div class="fecha-chip"><b>${d.getDate()}</b><span>${d.toLocaleDateString('es-PY', { month: 'short' }).replace('.', '')}</span></div>
    <div style="min-width:0">
      <p class="titulo">${esc(titulo)}</p>
      <p class="detalle">${esc(detalle)}</p>
      ${conAcciones ? `<p class="factura-linea">${chipFactura(p)}</p>` : ''}
    </div>
    <p class="monto">${gs(p.monto)}</p>
    ${conAcciones ? `<div class="acciones">
      <button class="icono" data-accion="editar-pago" data-id="${p.id}" aria-label="Editar pago de ${gs(p.monto)}">${ICONOS.editar}</button>
      <button class="icono peligro" data-accion="borrar-pago" data-id="${p.id}" aria-label="Borrar pago de ${gs(p.monto)}">${ICONOS.borrar}</button>
    </div>` : ''}
  </div>`;
}

// Facturado (con el número si lo hay) o un botón para marcarlo
function chipFactura(p) {
  if (p.facturado) return `<span class="chip factura si">${p.factura_numero ? `Factura ${esc(p.factura_numero)}` : 'Facturado'}</span>`;
  return `<button type="button" class="chip factura no" data-accion="facturar" data-id="${p.id}">Sin factura · marcar</button>`;
}

// ---------- Exportar a CSV (se abre en Excel) ----------
function descargarCSV(nombre, encabezados, filas) {
  const celda = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Punto y coma y BOM: así Excel en español separa bien las columnas y respeta las tildes
  const csv = '﻿' + [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${nombre}-${hoyISO()}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avisar(`Descargado ${a.download}`);
}

function exportar(que) {
  const { proyectos, pagos } = estado.datos;
  if (que === 'proyectos') {
    descargarCSV('proyectos', ['ID', 'Proyecto', 'Cliente', 'Estado', 'Monto total', 'IVA %', 'IVA', 'Gastos', 'Neto', 'Cobrado', 'Saldo', 'Entrega'],
      proyectos.map((p) => [p.id, p.nombre, p.cliente, ESTADOS[p.estado].nombre, p.monto_total, p.tasa_iva, p.iva, p.gastos, p.neto,
        p.pagado, p.saldo, p.fecha_entrega || '']));
  } else {
    descargarCSV('pagos', ['ID', 'Fecha', 'Proyecto', 'Cliente', 'Monto', 'Método', 'Nota', 'Facturado', 'N.º de factura'],
      pagosFiltrados().map((p) => {
        const pr = proyectos.find((x) => x.id === p.proyecto_id) || {};
        return [p.id, p.fecha, pr.nombre, pr.cliente, p.monto, METODOS[p.metodo], p.nota || '', p.facturado ? 'Sí' : 'No', p.factura_numero || ''];
      }));
  }
}

// ---------- Vista: Clientes ----------
function vistaClientes() {
  if (!estado.datos.clientes.length) {
    return vacio('Tu primer <em>cliente</em>', 'Guardá nombre, contacto y RUC de cada cliente para asociarle proyectos.',
      { accion: 'nuevo-cliente', texto: 'Crear cliente' });
  }
  return `
    <div class="herramientas">
      <label class="buscar">${ICONOS.buscar}<span class="sr">Buscar cliente</span>
        <input id="buscar" type="search" placeholder="Buscar por nombre, email o RUC" value="${esc(estado.buscar)}"></label>
    </div>
    <div class="grilla grilla-clientes" id="lista-clientes">${tarjetasClientes()}</div>`;
}

function tarjetasClientes() {
  const q = estado.buscar.toLowerCase();
  const lista = estado.datos.clientes.filter((c) =>
    [c.nombre, c.email, c.ruc_ci, c.telefono].some((v) => v && v.toLowerCase().includes(q)));
  if (!lista.length) return `<p class="suave">Ningún cliente coincide con “${esc(estado.buscar)}”.</p>`;
  return lista.map((c, i) => {
    const suyos = estado.datos.proyectos.filter((p) => p.cliente_id === c.id);
    const n = suyos.length;
    const cobrado = suyos.reduce((t, p) => t + p.pagado, 0);
    // Lo que debe: saldo de proyectos en curso o entregados (no presupuestos ni cancelados)
    const debe = suyos.filter((p) => p.estado === 'en_curso' || p.estado === 'entregado').reduce((t, p) => t + p.saldo, 0);
    return `<article class="tarjeta cliente entra" style="--i:${Math.min(i, 12)}">
      <div class="cliente-cabeza">
        <span class="avatar" style="--c:${colorDe(c.nombre)}">${esc(iniciales(c.nombre))}</span>
        <h3>${esc(c.nombre)}</h3>
      </div>
      <div class="datos">
        ${c.email ? `<span>${ICONOS.email}${esc(c.email)}</span>` : ''}
        ${c.telefono ? `<span>${ICONOS.telefono}${esc(c.telefono)}</span>` : ''}
        ${c.ruc_ci ? `<span>${ICONOS.ruc}RUC/CI ${esc(c.ruc_ci)}</span>` : ''}
        ${!c.email && !c.telefono && !c.ruc_ci ? '<span>Sin datos de contacto</span>' : ''}
      </div>
      ${n ? `<div class="cliente-cuentas">
        <span><small>Te pagó</small><b>${gs(cobrado)}</b></span>
        <span><small>Te debe</small><b class="${debe ? 'debe' : ''}">${debe ? gs(debe) : 'Nada'}</b></span>
      </div>` : ''}
      <div class="cliente-pie">
        <span class="chip" style="--c:var(--azul)">${plural(n, 'proyecto', 'proyectos')}</span>
        <div class="acciones">
          <button class="icono" data-accion="editar-cliente" data-id="${c.id}" aria-label="Editar ${esc(c.nombre)}">${ICONOS.editar}</button>
          <button class="icono peligro" data-accion="borrar-cliente" data-id="${c.id}" aria-label="Borrar ${esc(c.nombre)}">${ICONOS.borrar}</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

// ---------- Vista: Proyectos ----------
function vistaProyectos() {
  const { proyectos, clientes } = estado.datos;
  if (!proyectos.length) {
    return clientes.length
      ? vacio('Tu primer <em>proyecto</em>', 'Cada proyecto tiene un monto total; con los pagos vas viendo el saldo.', { accion: 'nuevo-proyecto', texto: 'Crear proyecto' })
      : vacio('Primero, un <em>cliente</em>', 'Los proyectos pertenecen a un cliente. Creá uno y volvé acá.', { accion: 'nuevo-cliente', texto: 'Crear cliente' });
  }
  const cuenta = (e) => proyectos.filter((p) => e === 'todos' || p.estado === e).length;
  const filtros = ['todos', ...Object.keys(ESTADOS)].map((e) => `
    <button class="filtro ${estado.filtroProyectos === e ? 'activo' : ''}" data-accion="filtrar-proyectos" data-estado="${e}">
      ${e === 'todos' ? 'Todos' : ESTADOS[e].nombre}<b>${cuenta(e)}</b></button>`).join('');
  const lista = proyectos.filter((p) => estado.filtroProyectos === 'todos' || p.estado === estado.filtroProyectos);
  return `
    <div class="herramientas"><div class="filtros">${filtros}</div>${BOTON_CSV('proyectos')}</div>
    <div class="grilla grilla-proyectos">
      ${lista.map(tarjetaProyecto).join('') || '<p class="suave">No hay proyectos en este estado.</p>'}
    </div>`;
}

const gastosDe = (id) => estado.datos.gastos.filter((g) => g.proyecto_id === id);

function tarjetaProyecto(p, i) {
  const pct = p.monto_total ? Math.min(100, (p.pagado / p.monto_total) * 100) : 0;
  const saldado = p.monto_total > 0 && p.saldo <= 0;
  const opciones = Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${e.nombre}</option>`).join('');
  return `<article class="tarjeta proyecto entra ${saldado ? 'completo' : ''}" style="--i:${Math.min(i, 12)};--c:${ESTADOS[p.estado].color}">
    <div class="proyecto-cabeza">
      <div style="min-width:0"><h3><a href="#proyecto-${p.id}">${esc(p.nombre)}</a></h3><p class="cliente-nombre">${esc(p.cliente)}</p></div>
      <select class="selector-estado" data-accion="estado" data-id="${p.id}" aria-label="Estado de ${esc(p.nombre)}">${opciones}</select>
    </div>
    ${p.descripcion ? `<p class="descripcion">${esc(p.descripcion)}</p>` : ''}
    ${chipsSeguimiento(p)}
    <div class="progreso">
      <header><span><strong>${gs(p.pagado)}</strong> de ${gs(p.monto_total)}</span><span>${Math.round(pct)}%</span></header>
      <div class="barra"><i style="--i:${Math.min(i, 12)}" data-ancho="${pct}%"></i></div>
    </div>
    <a class="cuentas" href="#proyecto-${p.id}" aria-label="Abrir la ficha de ${esc(p.nombre)}: neto ${gs(p.neto)}">
      <span class="cuentas-neto"><small>Neto</small><b class="${p.neto < 0 ? 'negativo' : ''}">${gs(p.neto)}</b></span>
      <span class="cuentas-detalle">${p.tasa_iva ? `IVA ${gs(p.iva)}` : 'Sin IVA'} · ${gastosDe(p.id).length ? `${plural(gastosDe(p.id).length, 'gasto', 'gastos')} ${gs(p.gastos)}` : 'Sin gastos'}</span>
      <span class="cuentas-ver">Ficha ${ICONOS.flecha}</span>
    </a>
    <div class="proyecto-pie">
      ${saldado
        ? `<span class="sello">${ICONOS.tilde}Saldado</span>`
        : p.estado === 'cancelado'
          ? '<span class="suave" style="font-size:13.5px">Cancelado</span>'
          : `<button class="btn btn-chico btn-pago" data-accion="pagar" data-id="${p.id}"><span>Registrar pago</span></button>`}
      <div class="acciones">
        <button class="icono" data-accion="editar-proyecto" data-id="${p.id}" aria-label="Editar ${esc(p.nombre)}">${ICONOS.editar}</button>
        <button class="icono peligro" data-accion="borrar-proyecto" data-id="${p.id}" aria-label="Borrar ${esc(p.nombre)}">${ICONOS.borrar}</button>
      </div>
    </div>
  </article>`;
}

// Entrega, factura y pendientes, en chips debajo de la descripción
function chipsSeguimiento(p) {
  const chips = [chipEntrega(p)];
  if (p.sin_facturar) chips.push(`<span class="chip alerta">Sin factura ${gs(p.sin_facturar)}</span>`);
  const faltan = p.tareas - p.tareas_hechas;
  if (faltan) chips.push(`<span class="chip" style="--c:var(--azul)">${plural(faltan, 'pendiente', 'pendientes')}</span>`);
  else if (p.tareas) chips.push('<span class="chip" style="--c:var(--verde)">Pendientes al día</span>');
  const html = chips.filter(Boolean).join('');
  return html ? `<div class="chips">${html}</div>` : '';
}

// ---------- Vista: Ficha de un proyecto ----------
function vistaProyecto() {
  const p = proyectoActual();
  if (!p) return vacio('Ese proyecto <em>no está</em>', 'Puede que lo hayas borrado. Volvé a la lista para ver los que tenés.', { accion: 'ir-proyectos', texto: 'Ver proyectos' });
  const pagos = estado.datos.pagos.filter((x) => x.proyecto_id === p.id);
  const gastos = gastosDe(p.id);
  // Primero lo que falta, después lo hecho
  const tareas = estado.datos.tareas.filter((t) => t.proyecto_id === p.id).sort((a, b) => a.hecha - b.hecha || a.id - b.id);
  const hechas = tareas.filter((t) => t.hecha).length;
  const pct = p.monto_total ? Math.min(100, (p.pagado / p.monto_total) * 100) : 0;
  const opciones = Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${e.nombre}</option>`).join('');
  // Botón para pedir el saldo por WhatsApp, si hay saldo y el cliente tiene teléfono
  const whatsapp = abierto(p) && p.cliente_telefono
    ? `<a class="btn btn-linea btn-chico btn-wa" href="${linkWhatsapp(p)}" target="_blank" rel="noopener">${ICONOS.whatsapp}<span>Pedir el saldo por WhatsApp</span></a>` : '';
  const pie = chipsSeguimiento(p) + whatsapp;
  const entrega = p.fecha_entrega ? fecha(p.fecha_entrega).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';

  const ficha = `<article class="tarjeta ficha entra" style="--i:0;--c:${ESTADOS[p.estado].color}">
    <div class="ficha-cabeza">
      <div class="ficha-cliente">
        <span class="avatar" style="--c:${colorDe(p.cliente)}">${esc(iniciales(p.cliente))}</span>
        <div style="min-width:0"><p class="mono suave">Cliente</p><p class="ficha-cliente-nombre">${esc(p.cliente)}</p></div>
      </div>
      <div class="ficha-acciones">
        <select class="selector-estado" data-accion="estado" data-id="${p.id}" aria-label="Estado del proyecto">${opciones}</select>
        <button class="icono" data-accion="editar-proyecto" data-id="${p.id}" aria-label="Editar el proyecto">${ICONOS.editar}</button>
        <button class="icono peligro" data-accion="borrar-proyecto" data-id="${p.id}" aria-label="Borrar el proyecto">${ICONOS.borrar}</button>
      </div>
    </div>
    ${p.descripcion ? `<p class="ficha-descripcion">${esc(p.descripcion)}</p>` : ''}
    <div class="ficha-datos">
      <div><small>Monto total</small><b>${gs(p.monto_total)}</b></div>
      <div><small>Cobrado · ${Math.round(pct)}%</small><b>${gs(p.pagado)}</b></div>
      <div><small>Falta cobrar</small><b>${p.estado === 'cancelado' ? '—' : gs(p.saldo)}</b></div>
      <div><small>Entrega</small><b>${entrega}</b></div>
    </div>
    <div class="barra ficha-barra"><i data-ancho="${pct}%"></i></div>
    ${pie ? `<div class="ficha-pie">${pie}</div>` : ''}
  </article>`;

  const cuentas = `<article class="tarjeta entra" style="--i:1">
    <h3>Cuentas</h3>
    <dl class="desglose">
      ${p.estado === 'cancelado'
        ? `<div><dt>Cobrado antes de cancelar</dt><dd>${gs(p.pagado)}</dd></div>`
        : `<div><dt>Monto total</dt><dd>${gs(p.monto_total)}</dd></div>`}
      <div><dt>${p.tasa_iva ? `IVA ${p.tasa_iva} % incluido` : 'Sin IVA'}</dt><dd>${p.tasa_iva ? `− ${gs(p.iva)}` : '—'}</dd></div>
      <div><dt>Gastos</dt><dd>${p.gastos ? `− ${gs(p.gastos)}` : '—'}</dd></div>
      <div class="total"><dt>Neto</dt><dd class="${p.neto < 0 ? 'negativo' : ''}">${gs(p.neto)}</dd></div>
    </dl>
    <p class="estado-factura ${p.sin_facturar ? 'falta' : 'listo'}">${p.sin_facturar ? `Falta facturar ${gs(p.sin_facturar)} cobrados`
      : pagos.length ? `${ICONOS.tilde}Todo lo cobrado está facturado` : 'Cuando registres pagos, acá ves si falta facturar alguno.'}</p>
  </article>`;

  const tarjetaPagos = `<article class="tarjeta entra" style="--i:3">
    <header class="tarjeta-cabeza"><h3>Pagos</h3>
      ${abierto(p) ? `<button class="btn btn-chico btn-pago" data-accion="pagar" data-id="${p.id}">${ICONOS.mas}<span>Registrar</span></button>` : ''}</header>
    <div class="lista">${pagos.map((x, i) => filaPago(x, i, 'ficha')).join('') || '<p class="suave vacio-chico">Todavía no hay pagos.</p>'}</div>
  </article>`;

  const tarjetaGastos = `<article class="tarjeta entra" style="--i:4">
    <header class="tarjeta-cabeza"><h3>Gastos</h3>
      <button class="btn btn-linea btn-chico" data-accion="nuevo-gasto" data-id="${p.id}">${ICONOS.mas}<span>Agregar</span></button></header>
    <ul class="gastos">${gastos.map((g) => `<li class="gasto">
        <div style="min-width:0">
          <p class="titulo">${esc(g.concepto)}</p>
          <p class="detalle"><span class="chip" style="--c:${CATEGORIAS[g.categoria].color}">${CATEGORIAS[g.categoria].nombre}</span>
            ${fecha(g.fecha).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <b class="monto">${gs(g.monto)}</b>
        <div class="acciones">
          <button class="icono" data-accion="editar-gasto" data-id="${g.id}" aria-label="Editar ${esc(g.concepto)}">${ICONOS.editar}</button>
          <button class="icono peligro" data-accion="borrar-gasto" data-id="${g.id}" aria-label="Borrar ${esc(g.concepto)}">${ICONOS.borrar}</button>
        </div>
      </li>`).join('') || '<li class="suave vacio-chico">Dominio, hosting, licencias: lo que pagaste para este proyecto.</li>'}</ul>
  </article>`;

  const tarjetaPendientes = `<article class="tarjeta entra pendientes" style="--i:2">
    <header class="tarjeta-cabeza"><h3>Pendientes</h3>${tareas.length ? `<span class="suave">${hechas} de ${tareas.length} hechos</span>` : ''}</header>
    ${tareas.length ? `<div class="barra barra-tareas"><i data-ancho="${(hechas / tareas.length) * 100}%"></i></div>` : ''}
    <ul class="tareas">${tareas.map((t) => `<li class="tarea ${t.hecha ? 'hecha' : ''}">
        <label><input type="checkbox" data-tarea="${t.id}" ${t.hecha ? 'checked' : ''}>
          <span class="tilde" aria-hidden="true">${ICONOS.tilde}</span><span class="texto">${esc(t.texto)}</span></label>
        <button class="icono peligro" type="button" data-accion="borrar-tarea" data-id="${t.id}" aria-label="Borrar ${esc(t.texto)}">${ICONOS.cerrar}</button>
      </li>`).join('')}</ul>
    <form id="nueva-tarea" class="nueva-tarea" autocomplete="off">
      <input name="texto" maxlength="255" placeholder="${tareas.length ? 'Agregar otro pendiente…' : 'Lo que le falta: pedir fotos, configurar el dominio…'}" aria-label="Nuevo pendiente">
      <button class="icono" aria-label="Agregar pendiente">${ICONOS.mas}</button>
    </form>
  </article>`;

  const tarjetaHistorial = `<article class="tarjeta entra historial" style="--i:5">
    <h3>Historial</h3>
    <form id="nueva-nota" class="nueva-nota">
      <textarea name="texto" maxlength="2000" rows="2" placeholder="Anotá lo que pasó: qué pidió el cliente, qué se acordó, un cambio de planes…" aria-label="Nueva nota"></textarea>
      <button class="btn btn-terracota btn-chico"><span>Guardar nota</span></button>
    </form>
    <ol class="linea-tiempo">${historialDe(p, pagos, gastos).map(eventoHistorial).join('')}</ol>
  </article>`;

  return `<div class="ficha-grilla">
    ${ficha}
    <div class="ficha-col">${cuentas}${tarjetaPagos}${tarjetaGastos}</div>
    <div class="ficha-col">${tarjetaPendientes}${tarjetaHistorial}</div>
  </div>`;
}

// Todo lo que pasó en el proyecto, lo más nuevo primero: notas, cambios de
// estado, cobros, gastos y el día que se creó
function historialDe(p, pagos, gastos) {
  return [
    ...estado.datos.notas.filter((n) => n.proyecto_id === p.id).map((n) => ({ tipo: n.tipo, cuando: new Date(n.creada_en), conHora: true, n })),
    ...pagos.map((x) => ({ tipo: 'pago', cuando: fecha(x.fecha), x })),
    ...gastos.map((g) => ({ tipo: 'gasto', cuando: fecha(g.fecha), g })),
    ...(p.creado_en ? [{ tipo: 'creado', cuando: new Date(`${p.creado_en}T00:00:00`) }] : []),
  ].sort((a, b) => b.cuando - a.cuando);
}

function eventoHistorial(e) {
  const dia = e.cuando.toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' });
  const hora = e.conHora ? ` · ${e.cuando.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}` : '';
  const ev = {
    nota: () => ({ icono: ICONOS.nota, color: 'var(--dorado)', titulo: 'Nota', texto: e.n.texto }),
    estado: () => ({ icono: ICONOS.estado, color: ESTADOS[e.n.estado].color, titulo: `Pasó a <b>${ESTADOS[e.n.estado].nombre}</b>`, texto: e.n.texto }),
    pago: () => ({ icono: ICONOS.pago, color: 'var(--verde)', titulo: `Cobro de <b>${gs(e.x.monto)}</b>`,
      texto: [METODOS[e.x.metodo], e.x.nota, e.x.facturado ? `Factura ${e.x.factura_numero || 'entregada'}` : 'Sin factura'].filter(Boolean).join(' · ') }),
    gasto: () => ({ icono: ICONOS.gasto, color: 'var(--terracota)', titulo: `Gasto de <b>${gs(e.g.monto)}</b>`, texto: e.g.concepto }),
    creado: () => ({ icono: ICONOS.creado, color: 'var(--tinta-suave)', titulo: 'Proyecto creado' }),
  }[e.tipo]();
  const borrable = e.tipo === 'nota' || e.tipo === 'estado';
  return `<li class="evento evento-${e.tipo}" style="--c:${ev.color}">
    <span class="evento-icono">${ev.icono}</span>
    <div class="evento-cuerpo">
      <p class="evento-titulo"><span>${ev.titulo}</span><time>${dia}${hora}</time></p>
      ${ev.texto ? `<p class="evento-texto">${esc(ev.texto)}</p>` : ''}
    </div>
    ${borrable ? `<button class="icono peligro" data-accion="borrar-nota" data-id="${e.n.id}" aria-label="Borrar del historial">${ICONOS.borrar}</button>` : '<span class="evento-hueco"></span>'}
  </li>`;
}

// Link de WhatsApp con el mensaje escrito. Acepta teléfonos como
// "+595 981 123 456", "0981 123456" o "981123456" (se asume Paraguay)
function linkWhatsapp(p) {
  let n = String(p.cliente_telefono).replace(/\D/g, '');
  if (n.startsWith('0')) n = `595${n.slice(1)}`;
  else if (n.length <= 9) n = `595${n}`;
  const texto = `¡Hola! Te escribo de Pyahu Labs por "${p.nombre}". Queda un saldo de ${gs(p.saldo)}. `
    + '¿Te paso los datos para la transferencia? ¡Gracias!';
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// ---------- Vista: Pagos ----------
function vistaPagos() {
  const { pagos, proyectos } = estado.datos;
  if (!pagos.length) {
    return proyectos.length
      ? vacio('Ningún <em>pago</em> todavía', 'Cuando un cliente te pague, registralo acá y el saldo del proyecto se actualiza solo.', { accion: 'pagar', texto: 'Registrar pago' })
      : vacio('Ningún <em>pago</em> todavía', 'Para registrar pagos primero necesitás un proyecto.', { accion: 'nuevo-proyecto', texto: 'Crear proyecto' });
  }
  const lista = pagosFiltrados();
  const total = lista.reduce((t, p) => t + p.monto, 0);
  const sinFactura = pagos.filter((p) => !p.facturado).length;
  const opciones = proyectos.map((p) => `<option value="${p.id}" ${String(p.id) === estado.filtroPagos ? 'selected' : ''}>${esc(p.nombre)} · ${esc(p.cliente)}</option>`).join('');
  return `
    <div class="herramientas">
      <select class="selector" id="filtro-pagos" aria-label="Filtrar por proyecto"><option value="">Todos los proyectos</option>${opciones}</select>
      <button class="filtro ${estado.soloSinFactura ? 'activo' : ''}" data-accion="solo-sin-factura" aria-pressed="${estado.soloSinFactura}">Sin factura<b>${sinFactura}</b></button>
      <p class="total-pagos"><span class="suave">${plural(lista.length, 'pago', 'pagos')} ·</span><strong>${gs(total)}</strong></p>
      ${BOTON_CSV('pagos')}
    </div>
    <article class="tarjeta"><div class="lista">${lista.map((p, i) => filaPago(p, i, 'acciones')).join('')
      || '<p class="suave" style="padding:16px 4px">Ningún pago coincide con el filtro.</p>'}</div></article>`;
}

const pagosFiltrados = () => estado.datos.pagos.filter((p) =>
  (!estado.filtroPagos || p.proyecto_id === Number(estado.filtroPagos)) && (!estado.soloSinFactura || !p.facturado));

const BOTON_CSV = (que) => `<button class="btn btn-linea btn-chico" data-accion="exportar" data-que="${que}">
  <svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span>Exportar CSV</span></button>`;

// ---------- Modal ----------
let alEnviarModal = null;

// En celulares y tablets no se enfoca ningún campo al abrir un formulario: si no,
// aparece el teclado de entrada, tapa medio formulario y no se puede deslizar
const tactil = matchMedia('(hover: none), (pointer: coarse)').matches;

// cancelar: el texto del botón que cierra sin guardar.
// enfocar: false en los formularios de editar, que se abren para ver qué se puede
// cambiar (en la compu, los de "nuevo" sí arrancan en el primer campo)
function abrirModal({ titulo, cuerpo, ok = 'Guardar', cancelar = 'Cancelar', peligro = false, enfocar = true, alEnviar, alAbrir }) {
  const modal = $('#modal');
  $('#modal-titulo').innerHTML = titulo;
  $('#modal-cuerpo').innerHTML = cuerpo;
  $('#modal-form .error-form').textContent = '';
  $('#modal .modal-pie .btn-linea').textContent = cancelar;
  const boton = $('#modal-ok');
  boton.innerHTML = `<span>${ok}</span>`;
  boton.classList.toggle('btn-peligro', peligro);
  alEnviarModal = alEnviar;
  modal.classList.remove('cerrando');
  modal.showModal();
  modal.scrollTop = 0;
  if (alAbrir) alAbrir(modal);
  const primero = $('#modal-cuerpo input, #modal-cuerpo select');
  // Sin campo enfocado, el foco va al título: los lectores de pantalla lo leen y no sale el teclado
  if (primero && enfocar && !tactil) primero.focus();
  else $('#modal-titulo').focus({ preventScroll: true });
}

function cerrarModal() {
  const modal = $('#modal');
  if (!modal.open || modal.classList.contains('cerrando')) return;
  if (quieto) return modal.close();
  modal.classList.add('cerrando');
  modal.addEventListener('animationend', () => { modal.classList.remove('cerrando'); modal.close(); }, { once: true });
}

async function enviarModal(e) {
  e.preventDefault();
  if (e.submitter && e.submitter.value === 'cancelar') return cerrarModal();
  const boton = $('#modal-ok');
  const error = $('#modal-form .error-form');
  error.textContent = '';
  boton.classList.add('cargando');
  try {
    const mensaje = await alEnviarModal(new FormData(e.target));
    cerrarModal();
    if (mensaje) avisar(mensaje);
    await cargarTodo(false);
  } catch (err) {
    error.textContent = err.message;
  } finally {
    boton.classList.remove('cargando');
  }
}

// Convierte el formulario en el JSON que espera la API (números como números)
function leerForm(fd, numericos = []) {
  const datos = {};
  for (const [k, v] of fd) {
    const texto = String(v).trim();
    datos[k] = numericos.includes(k) ? (texto === '' ? undefined : Number(texto)) : texto;
  }
  return datos;
}

const campo = (etiqueta, html, extra = '') => `<label class="campo"><span>${etiqueta}</span>${html}${extra}</label>`;

function formCliente(c = {}) {
  abrirModal({
    titulo: c.id ? 'Editar <em>cliente</em>' : 'Nuevo <em>cliente</em>',
    enfocar: !c.id,
    cuerpo: campo('Nombre', `<input name="nombre" required maxlength="150" value="${esc(c.nombre)}">`)
      + campo('Email', `<input name="email" type="email" maxlength="150" value="${esc(c.email)}">`)
      + `<div class="campos-2">${campo('Teléfono', `<input name="telefono" inputmode="tel" placeholder="+595 981 123456" value="${esc(c.telefono)}">`)}
         ${campo('RUC o CI', `<input name="ruc_ci" placeholder="1234567-8" value="${esc(c.ruc_ci)}">`)}</div>`,
    ok: c.id ? 'Guardar cambios' : 'Crear cliente',
    alEnviar: async (fd) => {
      const datos = leerForm(fd);
      if (c.id) { await api(`/clientes/${c.id}`, 'PUT', datos); return 'Cliente actualizado'; }
      await api('/clientes', 'POST', datos);
      return 'Cliente creado';
    },
  });
}

function formProyecto(p = {}) {
  const { clientes } = estado.datos;
  const opcionesCli = clientes.map((c) => `<option value="${c.id}" ${c.id === p.cliente_id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
  const opcionesEst = Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}" ${k === (p.estado || 'presupuesto') ? 'selected' : ''}>${e.nombre}</option>`).join('');
  const opcionesIva = TASAS_IVA.map(([t, nombre]) => `<option value="${t}" ${t === (p.tasa_iva ?? 10) ? 'selected' : ''}>${nombre}</option>`).join('');
  abrirModal({
    titulo: p.id ? 'Editar <em>proyecto</em>' : 'Nuevo <em>proyecto</em>',
    enfocar: !p.id,
    cuerpo: campo('Cliente', `<select name="cliente_id" required>${p.id ? '' : '<option value="">Elegí un cliente</option>'}${opcionesCli}</select>`)
      + campo('Nombre del proyecto', `<input name="nombre" required maxlength="150" value="${esc(p.nombre)}" placeholder="Sitio web, identidad, tienda…">`)
      + campo('Descripción', `<textarea name="descripcion" maxlength="2000">${esc(p.descripcion)}</textarea>`)
      + `<div class="campos-2">${campo('Estado', `<select name="estado">${opcionesEst}</select>`)}
         ${campo('Entrega <span class="opcional">(opcional)</span>', `<input name="fecha_entrega" type="date" value="${esc(p.fecha_entrega)}">`)}</div>`
      + `<div class="campos-2">${campo('Monto total (₲)', `<input name="monto_total" id="proyecto-monto" type="number" min="0" step="1" inputmode="numeric" required value="${p.monto_total ?? ''}">`)}
         ${campo('IVA', `<select name="tasa_iva" id="proyecto-iva">${opcionesIva}</select>`)}</div>`
      + '<p class="aviso-saldo" id="proyecto-iva-detalle"></p>'
      + (p.id && p.pagado ? `<p class="aviso-saldo">Ya se cobraron ${gs(p.pagado)}: el monto total no puede ser menor.</p>` : ''),
    ok: p.id ? 'Guardar cambios' : 'Crear proyecto',
    // Debajo del monto se ve en vivo cuánto es IVA y cuánto queda sin IVA
    alAbrir: () => {
      const mostrar = () => {
        const monto = Number($('#proyecto-monto').value) || 0;
        const tasa = Number($('#proyecto-iva').value);
        $('#proyecto-iva-detalle').textContent = !monto ? 'El monto es lo que paga el cliente, con el IVA incluido.'
          : tasa ? `Incluye ${gs(ivaIncluido(monto, tasa))} de IVA. Sin IVA: ${gs(monto - ivaIncluido(monto, tasa))}.`
          : `Sin IVA: los ${gs(monto)} quedan completos, antes de gastos.`;
      };
      $('#proyecto-monto').addEventListener('input', mostrar);
      $('#proyecto-iva').addEventListener('change', mostrar);
      mostrar();
    },
    alEnviar: async (fd) => {
      const datos = leerForm(fd, ['cliente_id', 'monto_total', 'tasa_iva']);
      if (p.id) { await api(`/proyectos/${p.id}`, 'PUT', datos); return 'Proyecto actualizado'; }
      await api('/proyectos', 'POST', datos);
      return 'Proyecto creado';
    },
  });
}

function formPago(proyectoId) {
  const abiertos = estado.datos.proyectos.filter((p) => p.estado !== 'cancelado' && p.saldo > 0);
  if (!abiertos.length) return avisar('No hay proyectos con saldo pendiente', 'error');
  const elegido = abiertos.some((p) => p.id === proyectoId) ? proyectoId : abiertos[0].id;
  const opciones = abiertos.map((p) => `<option value="${p.id}" ${p.id === elegido ? 'selected' : ''}>${esc(p.nombre)} · ${esc(p.cliente)}</option>`).join('');
  const metodos = Object.entries(METODOS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  let saldoElegido = 0;
  abrirModal({
    titulo: 'Registrar <em>pago</em>',
    cuerpo: campo('Proyecto', `<select name="proyecto_id" id="pago-proyecto">${opciones}</select>`, '<p class="aviso-saldo" id="pago-saldo"></p>')
      + `<div class="campos-2">${campo('Monto (₲)', `<input name="monto" id="pago-monto" type="number" min="1" step="1" inputmode="numeric" required>`)}
         ${campo('Fecha', `<input name="fecha" type="date" required value="${hoyISO()}">`)}</div>`
      + campo('Método', `<select name="metodo">${metodos}</select>`)
      + campo('Nota', '<input name="nota" maxlength="255" placeholder="Seña, segunda cuota…">')
      + camposFactura(),
    ok: 'Registrar pago',
    alAbrir: () => {
      prepararFactura();
      const select = $('#pago-proyecto');
      const mostrar = () => {
        const p = abiertos.find((x) => x.id === Number(select.value));
        saldoElegido = p.saldo;
        $('#pago-saldo').innerHTML = `Saldo pendiente: <b>${gs(p.saldo)}</b> · <a href="#" id="pago-todo">cobrar todo</a>`;
        $('#pago-monto').max = p.saldo;
      };
      select.addEventListener('change', mostrar);
      $('#pago-saldo').addEventListener('click', (e) => {
        if (e.target.id === 'pago-todo') { e.preventDefault(); $('#pago-monto').value = saldoElegido; }
      });
      mostrar();
    },
    alEnviar: async (fd) => {
      const datos = leerPago(fd, ['proyecto_id', 'monto']);
      await api('/pagos', 'POST', datos);
      if (datos.monto === saldoElegido) {
        const b = $('#modal-ok').getBoundingClientRect();
        confeti(b.left + b.width / 2, b.top);
        return '¡Proyecto saldado!';
      }
      return 'Pago registrado';
    },
  });
}

function formEditarPago(pago) {
  const proyecto = estado.datos.proyectos.find((p) => p.id === pago.proyecto_id);
  const maximo = proyecto.saldo + pago.monto; // lo que queda libre si este pago no existiera
  const metodos = Object.entries(METODOS).map(([k, n]) => `<option value="${k}" ${k === pago.metodo ? 'selected' : ''}>${n}</option>`).join('');
  abrirModal({
    titulo: 'Editar <em>pago</em>',
    enfocar: false,
    cuerpo: `<p class="aviso-saldo">${esc(proyecto.nombre)} · ${esc(proyecto.cliente)} · hasta <b>${gs(maximo)}</b></p>`
      + `<div class="campos-2">${campo('Monto (₲)', `<input name="monto" type="number" min="1" max="${maximo}" step="1" inputmode="numeric" required value="${pago.monto}">`)}
         ${campo('Fecha', `<input name="fecha" type="date" required value="${esc(pago.fecha)}">`)}</div>`
      + campo('Método', `<select name="metodo">${metodos}</select>`)
      + campo('Nota', `<input name="nota" maxlength="255" value="${esc(pago.nota)}">`)
      + camposFactura(pago),
    ok: 'Guardar cambios',
    alAbrir: prepararFactura,
    alEnviar: async (fd) => {
      await api(`/pagos/${pago.id}`, 'PUT', leerPago(fd, ['monto']));
      return 'Pago actualizado';
    },
  });
}

// ---------- Facturas ----------
// Casilla "Le di factura" y el número, que aparece solo si está tildada
const camposFactura = (pago = {}) => `<div class="factura-campos">
  <label class="casilla"><input type="checkbox" name="facturado" id="pago-facturado" ${pago.facturado ? 'checked' : ''}>
    <span>Le di factura</span></label>
  ${campo('N.º de factura <span class="opcional">(opcional)</span>',
    `<input name="factura_numero" id="pago-factura" maxlength="30" placeholder="001-001-0000123" value="${esc(pago.factura_numero)}">`)}
</div>`;

function prepararFactura() {
  const casilla = $('#pago-facturado');
  const mostrar = () => { $('#pago-factura').closest('.campo').hidden = !casilla.checked; };
  casilla.addEventListener('change', () => { mostrar(); if (casilla.checked) $('#pago-factura').focus(); });
  mostrar();
}

// Como leerForm, pero la casilla de factura se vuelve true o false
function leerPago(fd, numericos) {
  const datos = leerForm(fd, numericos);
  datos.facturado = fd.has('facturado');
  if (!datos.facturado) datos.factura_numero = '';
  return datos;
}

function formFactura(pago) {
  const proyecto = estado.datos.proyectos.find((p) => p.id === pago.proyecto_id);
  abrirModal({
    titulo: 'Marcar <em>facturado</em>',
    cuerpo: `<p class="aviso-saldo">${gs(pago.monto)} del ${fecha(pago.fecha).toLocaleDateString('es-PY', { day: 'numeric', month: 'long' })}
        · ${esc(proyecto ? proyecto.nombre : '')}</p>`
      + campo('N.º de factura <span class="opcional">(opcional)</span>', '<input name="factura_numero" maxlength="30" placeholder="001-001-0000123">'),
    ok: 'Marcar facturado',
    alEnviar: async (fd) => {
      await api(`/pagos/${pago.id}/factura`, 'PATCH', { facturado: true, factura_numero: leerForm(fd).factura_numero });
      return 'Pago facturado';
    },
  });
}

// ---------- Gastos ----------
function formGasto(proyectoId, g = {}) {
  const categorias = Object.entries(CATEGORIAS).map(([k, c]) => `<option value="${k}" ${k === (g.categoria || 'dominio') ? 'selected' : ''}>${c.nombre}</option>`).join('');
  const p = estado.datos.proyectos.find((x) => x.id === proyectoId);
  abrirModal({
    titulo: g.id ? 'Editar <em>gasto</em>' : 'Nuevo <em>gasto</em>',
    enfocar: !g.id,
    cuerpo: `<p class="aviso-saldo">${esc(p.nombre)} · ${esc(p.cliente)}</p>`
      + campo('Concepto', `<input name="concepto" maxlength="150" required placeholder="Dominio .com.py por 1 año" value="${esc(g.concepto)}">`)
      + `<div class="campos-2">${campo('Categoría', `<select name="categoria">${categorias}</select>`)}
         ${campo('Monto (₲)', `<input name="monto" type="number" min="1" step="1" inputmode="numeric" required value="${g.monto ?? ''}">`)}</div>`
      + campo('Fecha', `<input name="fecha" type="date" required value="${esc(g.fecha || hoyISO())}">`),
    ok: g.id ? 'Guardar cambios' : 'Agregar gasto',
    alEnviar: async (fd) => {
      const datos = leerForm(fd, ['monto']);
      if (g.id) { await api(`/gastos/${g.id}`, 'PUT', datos); return 'Gasto actualizado'; }
      await api('/gastos', 'POST', { ...datos, proyecto_id: proyectoId });
      return 'Gasto agregado';
    },
  });
}

// Borrar sin abrir otro modal: el primer toque pide confirmación en el mismo
// botón ("¿Borrar?") y el segundo borra. Si no tocás de nuevo, vuelve solo
async function borrarEnLinea(boton, ruta, aviso) {
  if (!boton.classList.contains('confirmar')) {
    const antes = boton.innerHTML;
    boton.classList.add('confirmar');
    boton.innerHTML = '<span>¿Borrar?</span>';
    setTimeout(() => {
      if (boton.isConnected && boton.classList.contains('confirmar')) { boton.classList.remove('confirmar'); boton.innerHTML = antes; }
    }, 3000);
    return;
  }
  try {
    await api(ruta, 'DELETE');
    avisar(aviso);
    await cargarTodo(false);
  } catch (err) {
    avisar(err.message, 'error');
  }
}

// ---------- Cambio de estado ----------
// Al cancelar, se pregunta qué pasó: queda en el historial del proyecto
function formCancelar(p) {
  abrirModal({
    titulo: `¿Cancelar <em>${esc(p.nombre)}</em>?`,
    enfocar: false,
    cuerpo: `<p class="aviso-saldo">${p.pagado ? `Ya se cobraron ${gs(p.pagado)}: esos pagos quedan registrados.` : 'No tiene pagos registrados.'}</p>`
      + campo('¿Qué pasó? <span class="opcional">(opcional, queda en el historial)</span>',
        '<textarea name="nota" maxlength="2000" placeholder="El cliente frenó el proyecto por presupuesto, queda la seña…"></textarea>'),
    ok: 'Cancelar proyecto',
    cancelar: 'Volver',
    peligro: true,
    alEnviar: async (fd) => {
      await api(`/proyectos/${p.id}/estado`, 'PATCH', { estado: 'cancelado', nota: leerForm(fd).nota });
      return 'Proyecto cancelado';
    },
  });
}

function confirmarBorrado(tipo, item) {
  const rutas = { cliente: 'clientes', proyecto: 'proyectos', pago: 'pagos' };
  let titulo = `¿Borrar <em>${esc(item.nombre)}</em>?`;
  let texto;
  if (tipo === 'cliente') {
    const n = estado.datos.proyectos.filter((p) => p.cliente_id === item.id).length;
    texto = n ? `Se van a borrar también sus ${plural(n, 'proyecto', 'proyectos')} y todos sus pagos.` : 'Este cliente no tiene proyectos.';
  } else if (tipo === 'proyecto') {
    texto = item.pagado ? `Se van a borrar también sus pagos (${gs(item.pagado)}).` : 'Este proyecto no tiene pagos.';
  } else {
    titulo = `¿Borrar el pago de <em>${gs(item.monto)}</em>?`;
    texto = 'El saldo del proyecto vuelve a subir.';
  }
  abrirModal({
    titulo,
    cuerpo: `<p class="confirmar">${texto} No se puede deshacer.</p>`,
    ok: 'Sí, borrar',
    peligro: true,
    alEnviar: async () => {
      await api(`/${rutas[tipo]}/${item.id}`, 'DELETE');
      // Si estabas en la ficha del proyecto borrado, volvés a la lista
      if (tipo === 'proyecto' && estado.vista === 'proyecto') location.hash = 'proyectos';
      return { cliente: 'Cliente borrado', proyecto: 'Proyecto borrado', pago: 'Pago borrado' }[tipo];
    },
  });
}

// ---------- Eventos ----------
function acciones(e) {
  const el = e.target.closest('[data-accion]');
  if (!el || el.tagName === 'SELECT') return;
  const id = Number(el.dataset.id);
  const { clientes, proyectos, pagos } = estado.datos;
  switch (el.dataset.accion) {
    case 'editar-pago': return formEditarPago(pagos.find((p) => p.id === id));
    case 'borrar-pago': return confirmarBorrado('pago', pagos.find((p) => p.id === id));
    case 'exportar': return exportar(el.dataset.que);
    case 'facturar': return formFactura(pagos.find((p) => p.id === id));
    case 'nuevo-gasto': return formGasto(id);
    case 'editar-gasto': { const g = estado.datos.gastos.find((x) => x.id === id); return formGasto(g.proyecto_id, g); }
    case 'borrar-gasto': return borrarEnLinea(el, `/gastos/${id}`, 'Gasto borrado');
    case 'borrar-tarea': return borrarEnLinea(el, `/tareas/${id}`, 'Pendiente borrado');
    case 'borrar-nota': return borrarEnLinea(el, `/notas/${id}`, 'Nota borrada');
    case 'solo-sin-factura': estado.soloSinFactura = !estado.soloSinFactura; return pintar(false);
    // Desde "Para hacer" del resumen: abre Pagos con el filtro puesto
    case 'ver-sin-factura': estado.soloSinFactura = true; estado.filtroPagos = ''; return;
    case 'tema': return cambiarTema(el);
    case 'nuevo-cliente': return formCliente();
    case 'editar-cliente': return formCliente(clientes.find((c) => c.id === id));
    case 'borrar-cliente': return confirmarBorrado('cliente', clientes.find((c) => c.id === id));
    case 'nuevo-proyecto': return formProyecto();
    case 'editar-proyecto': return formProyecto(proyectos.find((p) => p.id === id));
    case 'borrar-proyecto': return confirmarBorrado('proyecto', proyectos.find((p) => p.id === id));
    case 'pagar': return formPago(id);
    case 'ir-proyectos': location.hash = 'proyectos'; return;
    case 'filtrar-proyectos': estado.filtroProyectos = el.dataset.estado; return pintar(true);
  }
}

async function cambiarEstado(select) {
  const p = estado.datos.proyectos.find((x) => x.id === Number(select.dataset.id));
  // Cancelar pide el motivo en un modal: mientras tanto el selector vuelve al
  // estado real, y si cerrás el modal sin confirmar no cambia nada
  if (select.value === 'cancelado') { select.value = p.estado; return formCancelar(p); }
  try {
    await api(`/proyectos/${select.dataset.id}/estado`, 'PATCH', { estado: select.value });
    avisar(`Ahora está ${ESTADOS[select.value].nombre.toLowerCase()}`);
    await cargarTodo(false);
  } catch (err) {
    avisar(err.message, 'error');
    await cargarTodo(false);
  }
}

// ---------- Pendientes y notas (en la ficha) ----------
async function tildarTarea(casilla) {
  const t = estado.datos.tareas.find((x) => x.id === Number(casilla.dataset.tarea));
  casilla.disabled = true;
  try {
    await api(`/tareas/${t.id}`, 'PUT', { texto: t.texto, hecha: casilla.checked });
    if (casilla.checked) avisar('Pendiente hecho');
  } catch (err) {
    avisar(err.message, 'error');
  }
  await cargarTodo(false);
}

async function agregarTarea(e) {
  e.preventDefault();
  const input = e.target.texto;
  if (!input.value.trim()) return input.focus();
  try {
    await api('/tareas', 'POST', { proyecto_id: estado.proyectoId, texto: input.value });
    estado.enfocar = '#nueva-tarea input'; // así podés cargar varios seguidos
    await cargarTodo(false);
  } catch (err) {
    avisar(err.message, 'error');
  }
}

async function agregarNota(e) {
  e.preventDefault();
  const texto = e.target.texto;
  if (!texto.value.trim()) return texto.focus();
  const boton = e.target.querySelector('button');
  boton.classList.add('cargando');
  try {
    await api('/notas', 'POST', { proyecto_id: estado.proyectoId, texto: texto.value });
    avisar('Nota guardada');
    await cargarTodo(false);
  } catch (err) {
    avisar(err.message, 'error');
    boton.classList.remove('cargando');
  }
}

function iniciar() {
  prepararAcceso();
  document.addEventListener('click', acciones);
  $('#vista').addEventListener('change', (e) => {
    if (e.target.dataset.accion === 'estado') cambiarEstado(e.target);
    if (e.target.id === 'filtro-pagos') { estado.filtroPagos = e.target.value; pintar(false); }
    if (e.target.dataset.tarea) tildarTarea(e.target);
  });
  // Formularios de la ficha: agregar un pendiente o escribir una nota
  $('#vista').addEventListener('submit', (e) => {
    if (e.target.id === 'nueva-tarea') agregarTarea(e);
    if (e.target.id === 'nueva-nota') agregarNota(e);
  });
  $('#vista').addEventListener('input', (e) => {
    if (e.target.id !== 'buscar') return;
    estado.buscar = e.target.value;
    $('#lista-clientes').innerHTML = tarjetasClientes();
  });
  $('#accion-principal').addEventListener('click', () => {
    ({ clientes: formCliente, proyectos: formProyecto, pagos: formPago, proyecto: () => formPago(estado.proyectoId) })[estado.vista]?.();
  });
  $('#salir').addEventListener('click', () => cerrarSesion());
  $('#modal-form').addEventListener('submit', enviarModal);
  $('#modal').addEventListener('cancel', (e) => { e.preventDefault(); cerrarModal(); });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  addEventListener('hashchange', () => {
    if ($('#app').hidden) return;
    estado.vista = vistaDelHash();
    pintarMenu();
    pintar(true);
    scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
  });
  addEventListener('resize', () => { if (!$('#app').hidden) pintarMenu(); });

  if (estado.token && leerToken(estado.token)) entrar();
  else { guardado('token', null); estado.token = null; $('#acceso').hidden = false; }
  configurarRegistro();
  pintarBotonTema();

  // Service worker: guarda el panel para que abra rápido y se pueda instalar
  // como app. Solo funciona en https o en localhost (no por la IP de la Wi-Fi)
  if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Si el registro está cerrado, la pantalla de acceso muestra solo "Ingresar"
async function configurarRegistro() {
  try {
    const { registro_abierto: abierto } = await api('/auth/config');
    $('.pestanas').hidden = !abierto;
    if (!abierto && modoAcceso === 'registro') cambiarModo('login');
  } catch { /* sin conexión: queda como está */ }
}

// ---------- Modo oscuro ----------
// tema.js (en el <head>) ya aplicó la elección guardada antes de pintar la página
const temaActual = () => document.documentElement.dataset.tema
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');

function pintarBotonTema() {
  const oscuro = temaActual() === 'oscuro';
  $$('[data-accion="tema"]').forEach((b) => {
    b.setAttribute('aria-label', oscuro ? 'Pasar a modo claro' : 'Pasar a modo oscuro');
    b.classList.toggle('es-oscuro', oscuro);
  });
}

function cambiarTema(boton) {
  const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
  const aplicar = () => {
    document.documentElement.dataset.tema = nuevo;
    guardado('tema', nuevo);
    pintarBotonTema();
  };
  // Con View Transitions, el tema nuevo se abre en un círculo desde el botón
  if (!document.startViewTransition || quieto) return aplicar();
  const r = boton.getBoundingClientRect();
  document.documentElement.style.setProperty('--tx', `${r.left + r.width / 2}px`);
  document.documentElement.style.setProperty('--ty', `${r.top + r.height / 2}px`);
  document.startViewTransition(aplicar);
}

iniciar();
