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
});

module.exports = pool;
