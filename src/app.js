require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ api: 'Pyahu Labs', estado: 'ok' }));
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
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
