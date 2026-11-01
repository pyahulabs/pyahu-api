const app = require('./app');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Pyahu Labs escuchando en http://localhost:${port}`));
