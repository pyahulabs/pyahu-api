const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/registro', async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password || password.length < 8)
      return res.status(400).json({ error: 'nombre, email y password (mín. 8 caracteres) son obligatorios' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.execute(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)', [nombre, email, hash]);
    res.status(201).json({ id: r.insertId, nombre, email });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese email ya está registrado' });
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) { next(e); }
});

module.exports = router;
