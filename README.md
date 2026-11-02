# API Pyahu Labs

API REST para gestionar los clientes, proyectos y pagos de Pyahu Labs, con un panel web para usarla desde el navegador. Hecha con Node.js, Express y MySQL, con autenticación JWT.

![Panel de Pyahu Labs: resumen de cobros](docs/capturas/resumen.jpg)

## Qué hace

- **Usuarios:** registro e inicio de sesión. Las contraseñas se guardan con bcrypt y el login devuelve un token JWT que dura 8 horas. El registro está **cerrado**: solo se puede crear el primer usuario (ver [Registro cerrado](#registro-cerrado)).
- **Clientes:** CRUD completo, con RUC/CI y datos de contacto.
- **Proyectos:** estado (presupuesto, en curso, entregado, cancelado), fecha de entrega opcional, edición completa y saldo pendiente calculado.
- **IVA, gastos y neto:** cada proyecto tiene su tasa de IVA (10 %, 5 % o sin IVA, incluida en el monto, como se cotiza en Paraguay) y sus gastos (dominios, hosting, licencias, trabajo tercerizado). La API calcula el neto: lo que le queda al estudio.
- **Pagos:** registrar, editar y borrar, con transacción y bloqueo de fila, para no cobrar nunca más que el saldo del proyecto. Cada pago marca si ya se le dio factura al cliente, con el número.
- **Pendientes e historial:** una lista de lo que le falta a cada proyecto, para tildar, y un historial con notas escritas a mano. Los cambios de estado se anotan solos, con el motivo (por ejemplo, por qué se canceló).
- **Resumen:** total cobrado, total pendiente, lo que queda en presupuestos, el neto de lo cobrado (sin IVA ni gastos), lo cobrado sin factura y lo cobrado mes por mes.
- **Seguridad:** límite de intentos de login (429 después de 8 fallidos en 15 minutos) y headers de seguridad con helmet.
- **Validación:** cada campo se revisa antes de llegar a la base (tipos, formatos, largos y fechas reales).
- **Panel web:** HTML, CSS y JavaScript sin librerías, con la identidad visual de Pyahu Labs y animaciones. Cada proyecto tiene su **ficha** con cuentas, pagos, gastos, pendientes e historial, y un botón para pedir el saldo por WhatsApp. Incluye un gráfico de cobros por mes, las próximas entregas, "Para hacer", cuánto debe cada cliente, exportar a CSV (se abre en Excel), modo oscuro y se puede instalar como app en el celu.
- **Tests:** 18 tests automáticos con `npm test`, sobre una base aparte.

![Ficha de un proyecto: cuentas, pagos con factura, gastos, pendientes e historial](docs/capturas/ficha.jpg)

## Tecnologías

| Pieza | Para qué |
|---|---|
| [Express 5](https://expressjs.com/) | servidor HTTP y rutas |
| [mysql2](https://github.com/sidorares/node-mysql2) | conexión a MySQL con consultas parametrizadas |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | crear y verificar tokens JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | encriptar contraseñas |
| [dotenv](https://github.com/motdotla/dotenv) | leer la configuración del archivo `.env` |
| [cors](https://github.com/expressjs/cors) | permitir pedidos desde otros dominios |
| [helmet](https://helmetjs.github.io/) | headers de seguridad (CSP, HSTS…) |

## Estructura

```
pyahu-api/
├── schema.sql              # crea la base y las 4 tablas
├── migraciones/            # cambios a la base después de schema.sql (npm run migrar)
├── .env.example            # plantilla de configuración
├── render.yaml             # configuración para publicarla en Render
├── docs/
│   ├── PUBLICAR.md         # guía para publicarla gratis en internet
│   └── capturas/
├── public/                 # panel web (lo sirve Express en /)
│   ├── index.html
│   ├── estilos.css
│   ├── app.js
│   ├── tema.js             # aplica el modo oscuro antes de pintar
│   ├── sw.js               # service worker: instalar como app
│   └── manifest.webmanifest
├── scripts/
│   ├── migrar.js           # npm run migrar
│   ├── datos-demo.js       # npm run demo: usuario y datos de ejemplo
│   └── probar-api.ps1      # prueba todos los endpoints desde PowerShell
├── test/                   # npm test
└── src/
    ├── server.js           # arranca el servidor
    ├── app.js              # middlewares, rutas y manejo de errores
    ├── db.js               # pool de conexiones a MySQL
    ├── cuentas.js          # IVA incluido y neto de cada proyecto
    ├── middleware/
    │   ├── auth.js         # exige un token válido
    │   ├── limiteIntentos.js  # frena a quien prueba contraseñas
    │   └── validar.js      # reglas de validación por campo
    └── routes/
        ├── auth.js         # /auth/config, /auth/registro, /auth/login
        ├── clientes.js
        ├── proyectos.js
        ├── pagos.js
        ├── gastos.js
        ├── tareas.js       # pendientes de cada proyecto
        ├── notas.js        # historial de cada proyecto
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

# 4. Aplicar las migraciones (agrega lo que vino después de schema.sql)
npm run migrar

# 5. (Opcional) datos de ejemplo y usuario demo
npm run demo

# 6. Arrancar (con --watch se reinicia solo al guardar cambios)
npm run dev
```

> **¿Ya tenías la base creada de antes?** No hace falta borrarla: `npm run migrar` aplica solo los cambios que le faltan (por ejemplo, la columna `fecha_entrega`) y anota cuáles corrió en la tabla `migraciones`. Se puede correr las veces que quieras.

Abrí **http://localhost:3000** para usar el panel. Con `npm run demo` podés entrar con `demo@pyahulabs.com` / `pyahu-demo-2026` (es una cuenta solo para pruebas locales).

Para generar un `JWT_SECRET` largo y aleatorio:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Registro cerrado

Para que nadie de afuera pueda crearse una cuenta en tu panel, **solo se puede registrar el primer usuario** (cuando la base no tiene ninguno). Después, la pestaña "Crear cuenta" desaparece y `POST /auth/registro` responde 403.

Si querés dejar que cualquiera se registre (por ejemplo, para probar), poné `REGISTRO_ABIERTO=true` en el `.env` y reiniciá el servidor.

### Verlo desde el celu

Con el servidor andando en la PC y el celu conectado **a la misma Wi-Fi**:

1. En la PC, buscá tu IP local con `ipconfig` (la línea "Dirección IPv4", algo como `192.168.0.15`).
2. En el navegador del celu, abrí `http://192.168.0.15:3000` (con tu IP).
3. Si no carga, Windows está bloqueando el puerto: la primera vez que corrés `npm run dev` suele preguntar si permitir Node.js en redes privadas; decí que sí.

El panel se usa igual que en la PC. Lo que **no** vas a poder hacer así es instalarlo como app: los navegadores solo dejan instalar páginas servidas por **https** (o desde `localhost`). Cuando la publiques en internet ([docs/PUBLICAR.md](docs/PUBLICAR.md)) vas a tener https y ahí sí aparece "Instalar app" (Android) o "Agregar a inicio" (iPhone, desde Compartir).

## Tests

```powershell
npm test
```

Corre 18 tests (validaciones, login, registro cerrado, clientes, proyectos, pagos, IVA y gastos, facturas, pendientes, historial y resumen) contra una base **aparte**, `pyahu_test`, que se borra y se vuelve a crear en cada corrida. Tus datos de la base `pyahu` no se tocan. Usa el mismo usuario de MySQL del `.env`.

### IVA y neto

En Paraguay los precios se dan con el IVA **incluido**, así que `monto_total` es lo que paga el cliente. Con IVA 10 %, el IVA es el total dividido 11: de ₲ 1.100.000, ₲ 100.000 son IVA. El neto de un proyecto es:

```
neto = monto_total − IVA incluido − gastos
```

Si el proyecto se cancela, ya no se va a cobrar el total, así que el neto se calcula sobre lo que efectivamente se cobró. En el resumen, `neto_cobrado` es lo cobrado menos su IVA y menos todos los gastos: la plata que de verdad le queda al estudio.

> Es una cuenta para tener una idea clara de cuánto ganás. Para la liquidación del IVA ante la DNIT, seguí lo que te indique tu contador.

## Endpoints

Todas las rutas, salvo `/auth` y `/estado`, requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/estado` | Chequeo de que la API responde |
| GET | `/auth/config` | `{ registro_abierto }`: si se puede crear una cuenta |
| POST | `/auth/registro` | Crear usuario (`nombre`, `email`, `password` de 8 a 72 caracteres). 403 si el registro está cerrado |
| POST | `/auth/login` | Devuelve `{ token }`. 429 después de 8 intentos fallidos |
| GET | `/clientes` | Listar clientes |
| POST | `/clientes` | Crear (`nombre`; opcionales `email`, `telefono`, `ruc_ci`) |
| GET, PUT, DELETE | `/clientes/:id` | Ver, editar o borrar. Borrar un cliente borra sus proyectos y todo lo de ellos |
| GET | `/proyectos` | Listar, con `cliente`, `cliente_telefono`, `pagado`, `saldo`, `iva`, `gastos`, `neto`, `sin_facturar`, `tareas` y `tareas_hechas` |
| POST | `/proyectos` | Crear (`cliente_id`, `nombre`; opcionales `descripcion`, `estado`, `monto_total`, `tasa_iva` 10/5/0, `fecha_entrega`) |
| PUT | `/proyectos/:id` | Editar todo el proyecto (`estado`, `monto_total` y `tasa_iva` obligatorios). El monto total no puede quedar por debajo de lo ya cobrado. Si cambia el estado, queda en el historial |
| PATCH | `/proyectos/:id/estado` | Cambiar solo el estado (`estado`; opcional `nota` con el motivo, que queda en el historial) |
| DELETE | `/proyectos/:id` | Borrar el proyecto con sus pagos, gastos, pendientes e historial |
| GET | `/pagos` | Listar (filtro opcional `?proyecto_id=`) |
| POST | `/pagos` | Registrar (`proyecto_id`, `monto`, `fecha` AAAA-MM-DD; opcionales `metodo`, `nota`, `facturado` true/false, `factura_numero`) |
| PUT | `/pagos/:id` | Editar (`monto`, `fecha`, `metodo`, `facturado`; opcionales `nota`, `factura_numero`). El proyecto no cambia y el total cobrado no puede pasar el monto del proyecto |
| PATCH | `/pagos/:id/factura` | Marcar o desmarcar la factura (`facturado`; opcional `factura_numero`) |
| DELETE | `/pagos/:id` | Borrar un pago: el saldo del proyecto vuelve a subir |
| GET | `/gastos` | Listar (filtro opcional `?proyecto_id=`) |
| POST | `/gastos` | Cargar (`proyecto_id`, `concepto`, `monto`, `fecha`; opcional `categoria`: dominio, hosting, software, tercerizado u otro) |
| PUT, DELETE | `/gastos/:id` | Editar (`concepto`, `categoria`, `monto`, `fecha`) o borrar |
| GET | `/tareas` | Pendientes (filtro opcional `?proyecto_id=`) |
| POST | `/tareas` | Agregar un pendiente (`proyecto_id`, `texto`) |
| PUT, DELETE | `/tareas/:id` | Editar o tildar (`texto`, `hecha` true/false) o borrar |
| GET | `/notas` | Historial, lo más nuevo primero (filtro opcional `?proyecto_id=`). `tipo` es `nota` o `estado` y `creada_en` viene en hora UTC (ISO) |
| POST | `/notas` | Escribir una nota (`proyecto_id`, `texto` de hasta 2000 caracteres) |
| PUT, DELETE | `/notas/:id` | Editar el texto o borrar |
| GET | `/resumen` | Totales cobrado, pendiente y presupuestado, IVA de lo cobrado, gastos, neto, lo cobrado sin factura y detalle por estado |
| GET | `/resumen/mensual` | Cobrado por mes (`?meses=` de 1 a 36, 12 por defecto). Los meses sin pagos vienen con 0 |

### Respuestas de error

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos: `{ "error": "Datos inválidos", "detalles": ["monto debe ser un número entero (sin comillas)"] }` |
| 400 | El pago supera el saldo del proyecto, o el monto total quedaría por debajo de lo ya cobrado |
| 401 | Falta el token, está vencido o las credenciales son incorrectas |
| 403 | El registro está cerrado |
| 404 | El recurso o la ruta no existen |
| 409 | El email ya está registrado |
| 429 | Demasiados intentos de login fallidos: esperá 15 minutos |
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

## Demo sin servidor

`npm run armar-demo -- ../pyahu-labs/gestion` arma una copia del panel que funciona sin servidor ni base de datos: `demo/demo-api.js` atiende los mismos pedidos que la API, con datos de ejemplo guardados en el navegador. Es la que se publica en [pyahulabs.com/gestion](https://pyahulabs.com/gestion/) como proyecto de muestra.

## Publicarla en internet

En [docs/PUBLICAR.md](docs/PUBLICAR.md) hay una guía paso a paso para subirla gratis a **Render** (la API y el panel) con la base en **Aiven** (MySQL).

## Más capturas

| Proyectos | Pagos | Registrar un pago con factura |
|---|---|---|
| ![Proyectos](docs/capturas/proyectos.jpg) | ![Pagos](docs/capturas/pagos.jpg) | ![Registrar pago](docs/capturas/modal-pago.jpg) |

| Modo oscuro | Clientes | Acceso |
|---|---|---|
| ![Modo oscuro](docs/capturas/oscuro.jpg) | ![Clientes](docs/capturas/clientes.jpg) | ![Acceso](docs/capturas/acceso.jpg) |

| Celular | Ficha en el celular | Celular, modo oscuro |
|---|---|---|
| ![Celular](docs/capturas/movil.jpg) | ![Ficha en el celular](docs/capturas/movil-ficha.jpg) | ![Celular en modo oscuro](docs/capturas/movil-oscuro.jpg) |

Las capturas se sacan con [Playwright](https://playwright.dev/) manejando Chrome, con los datos de `npm run demo`.

## Licencia

MIT. Las fuentes del panel (Instrument Serif, Figtree y JetBrains Mono) tienen licencia SIL Open Font License.
