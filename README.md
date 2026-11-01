# API Pyahu Labs

API REST para gestionar los clientes, proyectos y pagos de Pyahu Labs, con un panel web para usarla desde el navegador. Hecha con Node.js, Express y MySQL, con autenticación JWT.

![Panel de Pyahu Labs: resumen de cobros](docs/capturas/resumen.jpg)

## Qué hace

- **Usuarios:** registro e inicio de sesión. Las contraseñas se guardan con bcrypt y el login devuelve un token JWT que dura 8 horas.
- **Clientes:** CRUD completo, con RUC/CI y datos de contacto.
- **Proyectos:** estado (presupuesto, en curso, entregado, cancelado), edición completa y saldo pendiente calculado.
- **Pagos:** registro con transacción y bloqueo de fila, para no cobrar más que el saldo del proyecto.
- **Resumen:** total cobrado, total pendiente y lo que queda en presupuestos.
- **Validación:** cada campo se revisa antes de llegar a la base (tipos, formatos, largos y fechas reales).
- **Panel web:** HTML, CSS y JavaScript sin librerías, con la identidad visual de Pyahu Labs y animaciones.

## Tecnologías

| Pieza | Para qué |
|---|---|
| [Express 5](https://expressjs.com/) | servidor HTTP y rutas |
| [mysql2](https://github.com/sidorares/node-mysql2) | conexión a MySQL con consultas parametrizadas |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | crear y verificar tokens JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | encriptar contraseñas |
| [dotenv](https://github.com/motdotla/dotenv) | leer la configuración del archivo `.env` |
| [cors](https://github.com/expressjs/cors) | permitir pedidos desde otros dominios |

## Estructura

```
pyahu-api/
├── schema.sql              # crea la base y las 4 tablas
├── .env.example            # plantilla de configuración
├── public/                 # panel web (lo sirve Express en /)
│   ├── index.html
│   ├── estilos.css
│   └── app.js
├── scripts/
│   ├── datos-demo.js       # npm run demo: usuario y datos de ejemplo
│   └── probar-api.ps1      # prueba todos los endpoints desde PowerShell
└── src/
    ├── server.js           # arranca el servidor
    ├── app.js              # middlewares, rutas y manejo de errores
    ├── db.js               # pool de conexiones a MySQL
    ├── middleware/
    │   ├── auth.js         # exige un token válido
    │   └── validar.js      # reglas de validación por campo
    └── routes/
        ├── auth.js         # /auth/registro, /auth/login
        ├── clientes.js
        ├── proyectos.js
        ├── pagos.js
        └── resumen.js
```

## Cómo correrla (Windows)

Hace falta [Node.js](https://nodejs.org/) 20 o más nuevo y MySQL 8.

```powershell
# 1. Dependencias
npm install

# 2. Base de datos. En PowerShell no existe "<", por eso se usa "source":
mysql -u root -p -e "source schema.sql"

# 3. Configuración: copiar la plantilla y completar usuario y contraseña de MySQL
Copy-Item .env.example .env
notepad .env

# 4. (Opcional) datos de ejemplo y usuario demo
npm run demo

# 5. Arrancar (con --watch se reinicia solo al guardar cambios)
npm run dev
```

Abrí **http://localhost:3000** para usar el panel. Con `npm run demo` podés entrar con `demo@pyahulabs.com` / `pyahu-demo-2026` (es una cuenta solo para pruebas locales).

Para generar un `JWT_SECRET` largo y aleatorio:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Endpoints

Todas las rutas, salvo `/auth` y `/estado`, requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/estado` | Chequeo de que la API responde |
| POST | `/auth/registro` | Crear usuario (`nombre`, `email`, `password` de 8 a 72 caracteres) |
| POST | `/auth/login` | Devuelve `{ token }` |
| GET | `/clientes` | Listar clientes |
| POST | `/clientes` | Crear (`nombre`; opcionales `email`, `telefono`, `ruc_ci`) |
| GET, PUT, DELETE | `/clientes/:id` | Ver, editar o borrar. Borrar un cliente borra sus proyectos y pagos |
| GET | `/proyectos` | Listar, con `cliente`, `pagado` y `saldo` |
| POST | `/proyectos` | Crear (`cliente_id`, `nombre`; opcionales `descripcion`, `estado`, `monto_total`) |
| PUT | `/proyectos/:id` | Editar todo el proyecto (`estado` y `monto_total` obligatorios) |
| PATCH | `/proyectos/:id/estado` | Cambiar solo el estado |
| DELETE | `/proyectos/:id` | Borrar el proyecto y sus pagos |
| GET | `/pagos` | Listar (filtro opcional `?proyecto_id=`) |
| POST | `/pagos` | Registrar (`proyecto_id`, `monto`, `fecha` AAAA-MM-DD; opcionales `metodo`, `nota`) |
| GET | `/resumen` | Totales cobrado, pendiente y presupuestado, y detalle por estado |

### Respuestas de error

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos: `{ "error": "Datos inválidos", "detalles": ["monto debe ser un número entero (sin comillas)"] }` |
| 401 | Falta el token, está vencido o las credenciales son incorrectas |
| 404 | El recurso o la ruta no existen |
| 409 | El email ya está registrado |
| 500 | Error inesperado del servidor (se registra en la consola) |

## Probar la API

Con el servidor andando, este script recorre todos los endpoints, incluidos los casos de error, y muestra cada respuesta:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\probar-api.ps1
```

O de a uno, con `Invoke-RestMethod`:

```powershell
$api = 'http://localhost:3000'
$json = 'application/json; charset=utf-8'   # el charset hace que las tildes viajen bien

$login = @{ email = 'demo@pyahulabs.com'; password = 'pyahu-demo-2026' } | ConvertTo-Json
$token = (Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType $json -Body $login).token
$auth = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Uri "$api/resumen" -Headers $auth
```

> En PowerShell 5.1, `curl` es un alias de `Invoke-WebRequest`. Para usar el curl de verdad, escribí `curl.exe`.

## Más capturas

| Proyectos | Registrar un pago | Celular |
|---|---|---|
| ![Proyectos](docs/capturas/proyectos.jpg) | ![Registrar pago](docs/capturas/modal-pago.jpg) | ![Celular](docs/capturas/movil.jpg) |

## Licencia

MIT. Las fuentes del panel (Instrument Serif, Figtree y JetBrains Mono) tienen licencia SIL Open Font License.
