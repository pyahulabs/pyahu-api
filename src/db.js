require('dotenv').config({ quiet: true }); // quiet: sin el aviso de dotenv en consola
const mysql = require('mysql2/promise');

// Pool de conexiones reutilizables a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pyahu',
  waitForConnections: true,
  connectionLimit: 10,
  // Los montos son DECIMAL(14,0): entran sin pérdida en un número de JS,
  // así la API devuelve 1500000 y no el texto "1500000"
  decimalNumbers: true,
  // Las fechas DATE salen como "2026-11-01", sin pasar por la zona horaria
  dateStrings: true,
  // Las bases en la nube (Aiven, TiDB, Railway…) piden conexión cifrada.
  // DB_SSL_CA es el certificado del proveedor, pegado entero en una línea con \n
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined }
    : undefined,
});

module.exports = pool;
