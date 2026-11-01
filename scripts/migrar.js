// Aplica los cambios de la carpeta migraciones/ que todavía no corrieron: npm run migrar
//
// schema.sql crea la base desde cero. Pero cuando la base ya tiene datos, no se
// puede volver a crear: los cambios nuevos se escriben como migraciones numeradas
// (001_..., 002_...) y la tabla "migraciones" recuerda cuáles ya se aplicaron.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const CARPETA = path.join(__dirname, '..', 'migraciones');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pyahu',
    multipleStatements: true, // un archivo .sql puede tener varias sentencias
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined }
      : undefined,
  });

  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS migraciones (
      nombre VARCHAR(150) PRIMARY KEY,
      aplicada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    const [hechas] = await conn.query('SELECT nombre FROM migraciones');
    const aplicadas = new Set(hechas.map((m) => m.nombre));

    const pendientes = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.sql') && !aplicadas.has(f)).sort();
    if (!pendientes.length) return console.log('La base ya está al día.');

    for (const archivo of pendientes) {
      // En MySQL un ALTER TABLE no se puede deshacer con rollback: si una
      // migración falla a la mitad, hay que revisarla a mano
      await conn.query(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
      await conn.query('INSERT INTO migraciones (nombre) VALUES (?)', [archivo]);
      console.log(`Aplicada: ${archivo}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error('Falló la migración:', e.message); process.exitCode = 1; });
