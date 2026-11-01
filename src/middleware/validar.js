// Validación de datos de entrada sin librerías externas.
// Cada ruta declara sus "reglas" (qué campos espera y de qué tipo) y este
// middleware las revisa antes de que el pedido llegue a la base de datos.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MONTO_MAX = 99999999999999; // el máximo que entra en DECIMAL(14,0)

// Devuelve un mensaje de error para el valor, o null si es válido
function revisar(valor, regla) {
  switch (regla.tipo) {
    case 'texto':
      if (typeof valor !== 'string') return 'debe ser texto';
      if (regla.min && valor.length < regla.min) return `debe tener al menos ${regla.min} caracteres`;
      if (regla.max && valor.length > regla.max) return `admite hasta ${regla.max} caracteres`;
      if (regla.patron && !regla.patron.test(valor)) return regla.mensaje || 'tiene un formato inválido';
      return null;
    case 'email':
      if (typeof valor !== 'string' || !EMAIL.test(valor)) return 'debe ser un email válido';
      if (valor.length > 150) return 'admite hasta 150 caracteres';
      return null;
    case 'entero':
      if (!Number.isSafeInteger(valor)) return 'debe ser un número entero (sin comillas)';
      if (regla.min !== undefined && valor < regla.min) return `debe ser mayor o igual a ${regla.min}`;
      if (regla.max !== undefined && valor > regla.max) return `debe ser menor o igual a ${regla.max}`;
      return null;
    case 'fecha': {
      if (typeof valor !== 'string' || !FECHA.test(valor)) return 'debe tener formato AAAA-MM-DD';
      // new Date acepta "2026-02-31" y lo corre a marzo: comparamos para detectarlo
      const d = new Date(`${valor}T00:00:00Z`);
      if (isNaN(d) || d.toISOString().slice(0, 10) !== valor) return 'no es una fecha real';
      return null;
    }
    case 'opcion':
      if (!regla.opciones.includes(valor)) return `debe ser: ${regla.opciones.join(', ')}`;
      return null;
    default:
      throw new Error(`Tipo de regla desconocido: ${regla.tipo}`);
  }
}

// Middleware: valida req.body con las reglas y deja los datos limpios en req.datos
function validarBody(reglas) {
  return (req, res, next) => {
    const body = req.body || {}; // en Express 5, req.body es undefined si no llega JSON
    const datos = {};
    const errores = [];

    for (const [campo, regla] of Object.entries(reglas)) {
      let valor = body[campo];
      if (typeof valor === 'string' && regla.recortar !== false) valor = valor.trim();

      if (valor === undefined || valor === null || valor === '') {
        if (regla.obligatorio) errores.push(`${campo} es obligatorio`);
        else datos[campo] = regla.porDefecto ?? null;
        continue;
      }

      const error = revisar(valor, regla);
      if (error) errores.push(`${campo} ${error}`);
      else datos[campo] = regla.tipo === 'email' ? valor.toLowerCase() : valor;
    }

    if (errores.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    req.datos = datos;
    next();
  };
}

// Para router.param('id', idValido): rechaza ids como "abc", "0" o "-3"
function idValido(req, res, next, id) {
  if (!/^[1-9]\d*$/.test(id)) return res.status(400).json({ error: 'id inválido' });
  next();
}

module.exports = { validarBody, idValido, MONTO_MAX };
