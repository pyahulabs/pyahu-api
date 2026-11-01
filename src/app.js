require('dotenv').config({ quiet: true }); // quiet: sin el aviso de dotenv en consola
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const auth = require('./middleware/auth');

const app = express();

// En un hosting (Render, Railway…) la app está detrás de un proxy: así req.ip
// es la IP real del visitante y el límite de intentos de login funciona bien
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

// Headers de seguridad. La política de contenido deja cargar solo archivos
// propios; los estilos inline (style="...") del panel están permitidos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:'],
      // Sin esto, el celu entrando por la Wi-Fi (http://192.168...) pediría
      // los CSS y JS por https y el panel se vería roto
      'upgrade-insecure-requests': null,
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Panel web (HTML, CSS y JS de la carpeta public) en http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/estado', (req, res) => res.json({ api: 'Pyahu Labs', estado: 'ok' }));
app.use('/auth', require('./routes/auth'));
app.use('/clientes', auth, require('./routes/clientes'));
app.use('/proyectos', auth, require('./routes/proyectos'));
app.use('/pagos', auth, require('./routes/pagos'));
app.use('/resumen', auth, require('./routes/resumen'));

// Manejo centralizado de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  // JSON mal escrito en el cuerpo del pedido: es culpa del cliente, no del servidor
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es un JSON válido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El cuerpo del pedido es demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
