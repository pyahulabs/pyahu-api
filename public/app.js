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
const VISTAS = {
  resumen: { titulo: 'Cómo <em>vamos</em>', accion: null },
  clientes: { titulo: 'Tus <em>clientes</em>', accion: 'Nuevo cliente' },
  proyectos: { titulo: 'Los <em>proyectos</em>', accion: 'Nuevo proyecto' },
  pagos: { titulo: 'Lo <em>cobrado</em>', accion: 'Registrar pago' },
};
const COLORES = ['#C1502E', '#3E6259', '#2E6E8E', '#B9832F', '#7A4E6E', '#5B7A3A'];

const estado = {
  token: guardado('token'),
  vista: 'resumen',
  datos: { clientes: [], proyectos: [], pagos: [], resumen: null },
  buscar: '',
  filtroProyectos: 'todos',
  filtroPagos: '',
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
  $('#usuario-email').textContent = usuario.email;
  const av = $('#usuario-avatar');
  av.textContent = iniciales(usuario.email);
  av.style.setProperty('--c', colorDe(usuario.email));
  $('#vista-fecha').textContent = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' });
  estado.vista = vistaDelHash();
  $('#vista').innerHTML = '<div class="grilla kpis">' + '<div class="esqueleto"></div>'.repeat(3) + '</div>';
  pintarMenu();
  cargarTodo(true);
}

const vistaDelHash = () => (VISTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'resumen');

async function cargarTodo(animar = false) {
  try {
    const [clientes, proyectos, pagos, resumen] = await Promise.all(
      ['/clientes', '/proyectos', '/pagos', '/resumen'].map((r) => api(r)));
    estado.datos = { clientes, proyectos, pagos, resumen };
    pintar(animar);
  } catch (err) {
    if (estado.token) avisar(err.message, 'error');
  }
}

function pintarMenu() {
  const activo = $(`.menu a[data-vista="${estado.vista}"]`);
  $$('.menu a').forEach((a) => a.classList.toggle('activa', a === activo));
  const marca = $('.menu-marca');
  marca.style.cssText = `width:${activo.offsetWidth}px;height:${activo.offsetHeight}px;transform:translate(${activo.offsetLeft}px,${activo.offsetTop}px);opacity:1`;
}

function pintar(animar) {
  const v = VISTAS[estado.vista];
  $('#vista-titulo').innerHTML = v.titulo;
  document.title = `${$('#vista-titulo').textContent} · Pyahu Labs`;
  const accion = $('#accion-principal');
  accion.hidden = !v.accion;
  if (v.accion) accion.querySelector('span').textContent = v.accion;
  accion.setAttribute('aria-label', v.accion || '');

  const vista = $('#vista');
  vista.innerHTML = { resumen: vistaResumen, clientes: vistaClientes, proyectos: vistaProyectos, pagos: vistaPagos }[estado.vista]();
  vista.classList.toggle('quieta', !animar);
  if (animar) { vista.classList.remove('cambia'); void vista.offsetWidth; vista.classList.add('cambia'); }
  animarVista(vista, animar);
}

// Barras, anillo y números arrancan en cero y crecen al valor real
function animarVista(vista, animar) {
  const aplicar = () => {
    $$('[data-ancho]', vista).forEach((el) => { el.style.width = el.dataset.ancho; });
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
    <article class="tarjeta entra" style="--i:5;margin-top:18px">
      <h3>Últimos pagos</h3>
      <div class="lista">${ultimos || '<p class="suave" style="padding:16px 4px">Todavía no registraste pagos.</p>'}</div>
    </article>`;
}

function filaPago(p, i) {
  const proyecto = estado.datos.proyectos.find((x) => x.id === p.proyecto_id);
  const d = fecha(p.fecha);
  return `<div class="fila-pago entra" style="--i:${Math.min(i, 12)}">
    <div class="fecha-chip"><b>${d.getDate()}</b><span>${d.toLocaleDateString('es-PY', { month: 'short' }).replace('.', '')}</span></div>
    <div style="min-width:0">
      <p class="titulo">${esc(proyecto ? proyecto.nombre : 'Proyecto borrado')}</p>
      <p class="detalle">${esc(proyecto ? proyecto.cliente : '')} · ${METODOS[p.metodo]}${p.nota ? ` · ${esc(p.nota)}` : ''}</p>
    </div>
    <p class="monto">${gs(p.monto)}</p>
  </div>`;
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
    const n = estado.datos.proyectos.filter((p) => p.cliente_id === c.id).length;
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
    <div class="herramientas"><div class="filtros">${filtros}</div></div>
    <div class="grilla grilla-proyectos">
      ${lista.map(tarjetaProyecto).join('') || '<p class="suave">No hay proyectos en este estado.</p>'}
    </div>`;
}

function tarjetaProyecto(p, i) {
  const pct = p.monto_total ? Math.min(100, (p.pagado / p.monto_total) * 100) : 0;
  const saldado = p.monto_total > 0 && p.saldo <= 0;
  const opciones = Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${e.nombre}</option>`).join('');
  return `<article class="tarjeta proyecto entra ${saldado ? 'completo' : ''}" style="--i:${Math.min(i, 12)};--c:${ESTADOS[p.estado].color}">
    <div class="proyecto-cabeza">
      <div style="min-width:0"><h3>${esc(p.nombre)}</h3><p class="cliente-nombre">${esc(p.cliente)}</p></div>
      <select class="selector-estado" data-accion="estado" data-id="${p.id}" aria-label="Estado de ${esc(p.nombre)}">${opciones}</select>
    </div>
    ${p.descripcion ? `<p class="descripcion">${esc(p.descripcion)}</p>` : ''}
    <div class="progreso">
      <header><span><strong>${gs(p.pagado)}</strong> de ${gs(p.monto_total)}</span><span>${Math.round(pct)}%</span></header>
      <div class="barra"><i style="--i:${Math.min(i, 12)}" data-ancho="${pct}%"></i></div>
    </div>
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

// ---------- Vista: Pagos ----------
function vistaPagos() {
  const { pagos, proyectos } = estado.datos;
  if (!pagos.length) {
    return proyectos.length
      ? vacio('Ningún <em>pago</em> todavía', 'Cuando un cliente te pague, registralo acá y el saldo del proyecto se actualiza solo.', { accion: 'pagar', texto: 'Registrar pago' })
      : vacio('Ningún <em>pago</em> todavía', 'Para registrar pagos primero necesitás un proyecto.', { accion: 'nuevo-proyecto', texto: 'Crear proyecto' });
  }
  const lista = pagos.filter((p) => !estado.filtroPagos || p.proyecto_id === Number(estado.filtroPagos));
  const total = lista.reduce((t, p) => t + p.monto, 0);
  const opciones = proyectos.map((p) => `<option value="${p.id}" ${String(p.id) === estado.filtroPagos ? 'selected' : ''}>${esc(p.nombre)} · ${esc(p.cliente)}</option>`).join('');
  return `
    <div class="herramientas">
      <select class="selector" id="filtro-pagos" aria-label="Filtrar por proyecto"><option value="">Todos los proyectos</option>${opciones}</select>
      <p class="total-pagos"><span class="suave">${plural(lista.length, 'pago', 'pagos')} ·</span><strong>${gs(total)}</strong></p>
    </div>
    <article class="tarjeta"><div class="lista">${lista.map(filaPago).join('')}</div></article>`;
}

// ---------- Modal ----------
let alEnviarModal = null;

function abrirModal({ titulo, cuerpo, ok = 'Guardar', peligro = false, alEnviar, alAbrir }) {
  const modal = $('#modal');
  $('#modal-titulo').innerHTML = titulo;
  $('#modal-cuerpo').innerHTML = cuerpo;
  $('#modal-form .error-form').textContent = '';
  const boton = $('#modal-ok');
  boton.innerHTML = `<span>${ok}</span>`;
  boton.classList.toggle('btn-peligro', peligro);
  alEnviarModal = alEnviar;
  modal.classList.remove('cerrando');
  modal.showModal();
  if (alAbrir) alAbrir(modal);
  const primero = $('#modal-cuerpo input, #modal-cuerpo select');
  if (primero) primero.focus();
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
  abrirModal({
    titulo: p.id ? 'Editar <em>proyecto</em>' : 'Nuevo <em>proyecto</em>',
    cuerpo: campo('Cliente', `<select name="cliente_id" required>${p.id ? '' : '<option value="">Elegí un cliente</option>'}${opcionesCli}</select>`)
      + campo('Nombre del proyecto', `<input name="nombre" required maxlength="150" value="${esc(p.nombre)}" placeholder="Sitio web, identidad, tienda…">`)
      + campo('Descripción', `<textarea name="descripcion" maxlength="2000">${esc(p.descripcion)}</textarea>`)
      + `<div class="campos-2">${campo('Estado', `<select name="estado">${opcionesEst}</select>`)}
         ${campo('Monto total (₲)', `<input name="monto_total" type="number" min="0" step="1" inputmode="numeric" required value="${p.monto_total ?? ''}">`)}</div>`
      + (p.id && p.pagado ? `<p class="aviso-saldo">Ya se cobraron ${gs(p.pagado)}: el monto total no puede ser menor.</p>` : ''),
    ok: p.id ? 'Guardar cambios' : 'Crear proyecto',
    alEnviar: async (fd) => {
      const datos = leerForm(fd, ['cliente_id', 'monto_total']);
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
      + campo('Nota', '<input name="nota" maxlength="255" placeholder="Seña, segunda cuota…">'),
    ok: 'Registrar pago',
    alAbrir: () => {
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
      const datos = leerForm(fd, ['proyecto_id', 'monto']);
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

function confirmarBorrado(tipo, item) {
  const esCliente = tipo === 'cliente';
  const n = esCliente ? estado.datos.proyectos.filter((p) => p.cliente_id === item.id).length : 0;
  const texto = esCliente
    ? (n ? `Se van a borrar también sus ${plural(n, 'proyecto', 'proyectos')} y todos sus pagos.` : 'Este cliente no tiene proyectos.')
    : (item.pagado ? `Se van a borrar también sus pagos (${gs(item.pagado)}).` : 'Este proyecto no tiene pagos.');
  abrirModal({
    titulo: `¿Borrar <em>${esc(item.nombre)}</em>?`,
    cuerpo: `<p class="confirmar">${texto} No se puede deshacer.</p>`,
    ok: 'Sí, borrar',
    peligro: true,
    alEnviar: async () => {
      await api(`/${esCliente ? 'clientes' : 'proyectos'}/${item.id}`, 'DELETE');
      return esCliente ? 'Cliente borrado' : 'Proyecto borrado';
    },
  });
}

// ---------- Eventos ----------
function acciones(e) {
  const el = e.target.closest('[data-accion]');
  if (!el || el.tagName === 'SELECT') return;
  const id = Number(el.dataset.id);
  const { clientes, proyectos } = estado.datos;
  switch (el.dataset.accion) {
    case 'nuevo-cliente': return formCliente();
    case 'editar-cliente': return formCliente(clientes.find((c) => c.id === id));
    case 'borrar-cliente': return confirmarBorrado('cliente', clientes.find((c) => c.id === id));
    case 'nuevo-proyecto': return formProyecto();
    case 'editar-proyecto': return formProyecto(proyectos.find((p) => p.id === id));
    case 'borrar-proyecto': return confirmarBorrado('proyecto', proyectos.find((p) => p.id === id));
    case 'pagar': return formPago(id);
    case 'filtrar-proyectos': estado.filtroProyectos = el.dataset.estado; return pintar(true);
  }
}

async function cambiarEstado(select) {
  try {
    await api(`/proyectos/${select.dataset.id}/estado`, 'PATCH', { estado: select.value });
    avisar(`Ahora está ${ESTADOS[select.value].nombre.toLowerCase()}`);
    await cargarTodo(false);
  } catch (err) {
    avisar(err.message, 'error');
    await cargarTodo(false);
  }
}

function iniciar() {
  prepararAcceso();
  document.addEventListener('click', acciones);
  $('#vista').addEventListener('change', (e) => {
    if (e.target.dataset.accion === 'estado') cambiarEstado(e.target);
    if (e.target.id === 'filtro-pagos') { estado.filtroPagos = e.target.value; pintar(false); }
  });
  $('#vista').addEventListener('input', (e) => {
    if (e.target.id !== 'buscar') return;
    estado.buscar = e.target.value;
    $('#lista-clientes').innerHTML = tarjetasClientes();
  });
  $('#accion-principal').addEventListener('click', () => {
    ({ clientes: formCliente, proyectos: formProyecto, pagos: formPago })[estado.vista]?.();
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
}

iniciar();
