// Frena a quien prueba contraseñas a lo loco: después de MAX intentos fallidos
// desde la misma IP, el login responde 429 hasta que pase la ventana de tiempo.
// Se guarda en memoria: si el servidor se reinicia, los contadores vuelven a cero.

const MAX = 8;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos
const intentos = new Map(); // ip -> { fallidos, desde }

function limiteIntentos(req, res, next) {
  const ahora = Date.now();
  const registro = intentos.get(req.ip);
  if (registro && ahora - registro.desde > VENTANA_MS) intentos.delete(req.ip);

  const actual = intentos.get(req.ip);
  if (actual && actual.fallidos >= MAX) {
    const minutos = Math.ceil((actual.desde + VENTANA_MS - ahora) / 60000);
    return res.status(429).json({ error: `Demasiados intentos. Probá de nuevo en ${minutos} min.` });
  }

  // La ruta avisa cómo le fue: fallido suma, exitoso borra el contador
  res.locals.loginFallido = () => {
    const r = intentos.get(req.ip) || { fallidos: 0, desde: ahora };
    r.fallidos += 1;
    intentos.set(req.ip, r);
  };
  res.locals.loginExitoso = () => intentos.delete(req.ip);
  next();
}

// Para los tests: empezar cada caso con los contadores limpios
limiteIntentos.reiniciar = () => intentos.clear();

module.exports = limiteIntentos;
