const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { validarBody } = require('../middleware/validar');
const limiteIntentos = require('../middleware/limiteIntentos');

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

// El registro está abierto solo si REGISTRO_ABIERTO=true o si todavía no hay
// ningún usuario (así podés crear el tuyo). Con la API en internet, eso evita
// que cualquiera se haga una cuenta y vea los datos del estudio.
async function registroAbierto() {
  if (process.env.REGISTRO_ABIERTO === 'true') return true;
  const [[{ n }]] = await db.execute('SELECT COUNT(*) AS n FROM usuarios');
  return n === 0;
}

router.get('/config', async (req, res, next) => {
  try {
    res.json({ registro_abierto: await registroAbierto() });
  } catch (e) { next(e); }
});

router.post('/registro', validarBody(REGISTRO), async (req, res, next) => {
  try {
    if (!(await registroAbierto()))
      return res.status(403).json({ error: 'El registro está cerrado. Pedile una cuenta a quien administra el estudio.' });
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

router.post('/login', limiteIntentos, validarBody(LOGIN), async (req, res, next) => {
  try {
    const { email, password } = req.datos;
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      res.locals.loginFallido();
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    res.locals.loginExitoso();
    const token = jwt.sign({ id: u.id, email: u.email, nombre: u.nombre }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) { next(e); }
});

module.exports = router;
