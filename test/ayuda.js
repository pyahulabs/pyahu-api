// Preparación común de los tests: usan una base aparte (pyahu_test) que se
// borra y se vuelve a crear con schema.sql + migraciones en cada corrida.
// Tiene que requerirse ANTES que la app, para que db.js tome DB_NAME de acá.
process.env.DB_NAME = 'pyahu_test';
process.env.REGISTRO_ABIERTO = 'false';
require('dotenv').config({ quiet: true }); // no pisa las variables de arriba
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-tests-'.repeat(2);

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const RAIZ = path.join(__dirname, '..');

async function prepararBase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  await conn.query('DROP DATABASE IF EXISTS pyahu_test');
  await conn.query(fs.readFileSync(path.join(RAIZ, 'schema.sql'), 'utf8').replace(/\bpyahu\b/g, 'pyahu_test'));
  for (const archivo of fs.readdirSync(path.join(RAIZ, 'migraciones')).sort()) {
    await conn.query(fs.readFileSync(path.join(RAIZ, 'migraciones', archivo), 'utf8'));
  }
  await conn.end();
}

// Levanta la app en un puerto libre y devuelve una función para hacer pedidos
async function levantarApp() {
  const app = require('../src/app');
  const servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}`;

  async function pedir(metodo, ruta, { cuerpo, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(base + ruta, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const texto = await r.text();
    return { status: r.status, datos: texto ? JSON.parse(texto) : null };
  }

  async function cerrar() {
    await new Promise((ok) => servidor.close(ok));
    await require('../src/db').end();
  }

  return { pedir, cerrar, base };
}

module.exports = { prepararBase, levantarApp };
