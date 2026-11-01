// Service worker del panel: guarda los archivos del panel (HTML, CSS, JS,
// fuentes) para que abra al instante y se pueda instalar como app en el celu.
// Los datos de la API NUNCA se guardan: siempre se piden al servidor.
const VERSION = 'pyahu-v1';
const ARCHIVOS = [
  '/', '/index.html', '/estilos.css', '/app.js', '/tema.js', '/brote.svg', '/papel.png',
  '/manifest.webmanifest', '/iconos/icono-192.png',
  '/fuentes/instrument-serif-latin-400-normal.woff2', '/fuentes/instrument-serif-latin-400-italic.woff2',
  '/fuentes/figtree-latin-400-normal.woff2', '/fuentes/figtree-latin-600-normal.woff2',
  '/fuentes/figtree-latin-700-normal.woff2', '/fuentes/jetbrains-mono-latin-400-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

// Al activarse una versión nueva, borra las cachés viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const esArchivo = e.request.method === 'GET' && url.origin === location.origin && ARCHIVOS.includes(url.pathname);
  if (!esArchivo) return; // API y todo lo demás: directo a la red

  // Primero la red (para ver siempre la última versión); si no hay conexión, la copia guardada
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request)),
  );
});
