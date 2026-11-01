const app = require('./app');

// Sin secreto no se pueden firmar tokens: mejor avisar al arrancar que fallar en el primer login
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Falta JWT_SECRET en el .env (o tiene menos de 32 caracteres).');
  process.exit(1);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Pyahu Labs escuchando en http://localhost:${port}`));
