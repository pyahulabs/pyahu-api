require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de conexiones reutilizables a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
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
});

module.exports = pool;
