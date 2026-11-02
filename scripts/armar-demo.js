// Arma la demo del panel que funciona sin servidor ni base de datos:
//   npm run armar-demo -- ../pyahu-labs/gestion
//
// Copia el panel de public/ y le suma demo/demo-api.js, que reemplaza a la
// API con datos de ejemplo guardados en el navegador de cada visitante.
// Es lo que se publica en pyahulabs.com/gestion/ como proyecto de muestra.
// No borra nada de la carpeta destino: solo crea o reemplaza estos archivos.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PUBLIC = path.join(RAIZ, 'public');
const DEMO = path.join(RAIZ, 'demo');
const WHATSAPP = '595993485179'; // el de Pyahu Labs, para "Quiero uno para mi negocio"

const destino = process.argv[2];
if (!destino) {
  console.error('Falta la carpeta destino. Ejemplo: npm run armar-demo -- ../pyahu-labs/gestion');
  process.exit(1);
}

// Reemplaza un pedazo exacto del HTML; si no lo encuentra, frena (así un cambio
// en public/index.html no deja la demo rota sin que nadie se entere)
function reemplazar(html, buscado, nuevo) {
  if (!html.includes(buscado)) throw new Error(`No encontré en index.html: ${buscado.slice(0, 60)}…`);
  return html.replace(buscado, nuevo);
}

function armarIndex() {
  const quieroUno = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola Nicolás, vi el panel de gestión en tu página y quiero uno para mi negocio.')}`;
  let html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  html = reemplazar(html, '<title>Pyahu Labs · Gestión</title>', '<title>Panel de gestión · Muestra de Pyahu Labs</title>');
  html = reemplazar(html, '<meta name="description" content="Panel de gestión de clientes, proyectos y cobros de Pyahu Labs.">',
    '<meta name="description" content="Proyecto de muestra: panel para llevar clientes, proyectos, cobros con factura, IVA, gastos y pendientes en un solo lugar.">');
  // Sin manifest ni service worker: la demo no se instala como app
  html = html.replace(/\s*<!-- Instalable en el celu[\s\S]*?<meta name="apple-mobile-web-app-title"[^>]*>/, '');
  html = reemplazar(html, '<script src="tema.js"></script>', '<script src="tema.js"></script>\n  <script src="demo-api.js"></script>');
  html = reemplazar(html, '<link rel="stylesheet" href="estilos.css">', '<link rel="stylesheet" href="estilos.css">\n  <link rel="stylesheet" href="demo.css">');
  html = reemplazar(html, '  <!-- ============ Acceso ============ -->', `  <!-- Franja de muestra, como en los otros demos de pyahulabs.com -->
  <div class="muestra">
    <span>Proyecto de muestra<span class="muestra-largo"> con datos de ejemplo · lo que cargues queda solo en tu navegador</span></span>
    <span class="muestra-punto" aria-hidden="true">·</span>
    <a href="../">Hecho por Pyahu Labs</a>
    <span class="muestra-punto" aria-hidden="true">·</span>
    <a class="muestra-wa" href="${quieroUno}" target="_blank" rel="noopener">Quiero uno para mi negocio</a>
  </div>

  <!-- ============ Acceso ============ -->`);
  html = reemplazar(html, '<button class="btn btn-terracota btn-ancho" type="submit"><span>Ingresar</span></button>',
    `<button class="btn btn-terracota btn-ancho" type="submit"><span>Ingresar</span></button>
          <p class="aviso-demo"><b>Demo con datos de ejemplo.</b> El email y la contraseña ya están cargados: tocá Ingresar.
            Lo que cambies queda solo en este navegador.<br><button type="button" data-accion="reiniciar-demo">Volver a los datos de ejemplo</button></p>`);
  html = reemplazar(html, '<script src="app.js"></script>', '<script src="app.js"></script>\n  <script src="demo-final.js"></script>');
  return html;
}

function copiar(origen, nombre = path.basename(origen)) {
  const hasta = path.join(destino, nombre);
  fs.mkdirSync(path.dirname(hasta), { recursive: true });
  fs.copyFileSync(origen, hasta);
}

fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'index.html'), armarIndex());
for (const archivo of ['app.js', 'estilos.css', 'tema.js', 'brote.svg', 'papel.png']) copiar(path.join(PUBLIC, archivo));
for (const fuente of fs.readdirSync(path.join(PUBLIC, 'fuentes'))) copiar(path.join(PUBLIC, 'fuentes', fuente), `fuentes/${fuente}`);
for (const archivo of ['demo-api.js', 'demo-final.js', 'demo.css']) copiar(path.join(DEMO, archivo));
console.log(`Demo lista en ${path.resolve(destino)}`);
