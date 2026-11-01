const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { validarBody } = require('../middleware/validar');

const REGISTRO = {
  nombre: { tipo: 'texto', max: 100, obligatorio: true },
  email: { tipo: 'email', obligatorio: true },
  // bcrypt solo usa los primeros 72 bytes; la contraseña no se recorta
  password: { tipo: 'texto', min: 8, max: 72, recortar: false, obligatorio: true },
};

// En el login no se revelan las reglas de la contraseña: solo que llegue algo
const LOGIN = {
  email: { tipo: 'texto', obligatorio: true },
  password: { tipo: 'texto', recortar: false, obligatorio: true },
};

router.post('/registro', validarBody(REGISTRO), async (req, res, next) => {
  try {
    const { nombre, email, password } = req.datos;
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.execute(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)', [nombre, email, hash]);
    res.status(201).json({ id: r.insertId, nombre, email });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese email ya está registrado' });
    next(e);
  }
});

router.post('/login', validarBody(LOGIN), async (req, res, next) => {
  try {
    const { email, password } = req.datos;
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash)))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) { next(e); }
});

module.exports = router;
