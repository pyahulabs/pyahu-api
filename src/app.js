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

// Manejo centralizado de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
