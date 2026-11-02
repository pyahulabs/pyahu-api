# Publicar la API gratis en internet

Esta guía sube la API y el panel a **Render** y la base de datos a **Aiven** (MySQL), los dos con planes gratis. Cuando termines vas a tener una dirección como `https://pyahu-api.onrender.com` para usar el panel desde cualquier lado e instalarlo como app en el celu.

```
 Celu / PC  ──https──▶  Render (Node + Express + panel)  ──SSL──▶  Aiven (MySQL)
```

Las cuentas las creás vos. Las contraseñas solo van en las pantallas de Render y Aiven, **nunca** en un archivo del repo.

> Los planes gratis y las pantallas de estos servicios cambian seguido. Si algo de acá no coincide con lo que ves, buscá la opción con un nombre parecido o fijate en la documentación de [Render](https://render.com/docs) o de [Aiven](https://aiven.io/docs).

## Lo que conviene saber antes

- **Render gratis se duerme.** Si nadie entra durante unos 15 minutos, el servidor se apaga. La próxima visita lo despierta, pero tarda alrededor de un minuto en cargar. Después anda normal.
- **Aiven gratis es una base chica**, de sobra para un estudio con decenas de clientes y cientos de pagos.
- **No corras `npm run demo` en la base de la nube.** Crea un usuario con una contraseña que está escrita en el README, o sea, pública.

## 1. Subir los últimos cambios a GitHub

Render saca el código de tu repo, así que primero tiene que estar todo en GitHub:

```powershell
git push origin main
```

## 2. Crear la base en Aiven

1. Entrá a [aiven.io](https://aiven.io) y creá una cuenta (podés entrar con GitHub o Google).
2. **Create service → MySQL**, elegí el plan **Free** y una región (si hay una en Estados Unidos, conviene que coincida con la de Render).
3. Esperá a que el estado diga **Running** (unos minutos).
4. En la pestaña **Overview** del servicio, en **Connection information**, vas a ver:
   - **Host**: algo como `mysql-pyahu-tunombre.e.aivencloud.com`
   - **Port**: un número como `12345` (no es 3306)
   - **User**: `avnadmin`
   - **Password**: tocá el ojito para verla
   - **CA certificate**: tocá **Download** y guardá el archivo `ca.pem` en la carpeta del proyecto.

`ca.pem` es el certificado que le permite a la API comprobar que está hablando con tu base de verdad. El `.gitignore` ya ignora los `.pem`, así que no se sube por accidente.

## 3. Crear las tablas en Aiven (desde tu PC)

Abrí PowerShell en la carpeta del proyecto. Primero, `schema.sql` crea la base `pyahu` y las tablas. Reemplazá `HOST` y `PUERTO` por los de Aiven; la contraseña te la pide:

```powershell
mysql -h HOST -P PUERTO -u avnadmin -p --ssl-mode=VERIFY_CA --ssl-ca=ca.pem -e "source schema.sql"
```

Después, las migraciones. `npm run migrar` lee el `.env` de tu PC, que apunta a tu MySQL local. Para apuntarlo a Aiven sin tocar el `.env`, cargá los datos como variables **de esta ventana de PowerShell** nomás (dotenv no pisa variables que ya existen):

```powershell
$env:DB_HOST = 'HOST'
$env:DB_PORT = 'PUERTO'
$env:DB_USER = 'avnadmin'
$env:DB_PASSWORD = 'LA-CONTRASEÑA-DE-AIVEN'
$env:DB_SSL = 'true'
$env:DB_SSL_CA = (Get-Content ca.pem) -join '\n'
npm run migrar
```

Tiene que decir `Aplicada:` con cada archivo de la carpeta `migraciones/` (`001_fecha_entrega.sql`, `002_iva_y_gastos.sql` y `003_facturas_pendientes_y_notas.sql`). **Cerrá esa ventana de PowerShell** al terminar: así esas variables se olvidan y tu PC vuelve a usar el MySQL local.

## 4. Preparar el certificado en una línea

Las variables de entorno de Render son de una sola línea, pero el certificado tiene muchas. Por eso se pega con los saltos de línea escritos como `\n` (la API los vuelve a convertir en saltos de línea; está en `src/db.js`). Este comando lo deja así y lo copia al portapapeles:

```powershell
(Get-Content ca.pem) -join '\n' | Set-Clipboard
```

Tiene que quedar algo como `-----BEGIN CERTIFICATE-----\nMIIEQTCC...\n-----END CERTIFICATE-----`.

## 5. Crear el servicio en Render

1. Entrá a [render.com](https://render.com) y creá una cuenta **con GitHub**.
2. Como el repo es privado, Render te va a pedir permiso para verlo: dale acceso a `pyahulabs/pyahu-api`.

Hay dos caminos. El primero es más corto.

### Opción A: con `render.yaml` (Blueprint)

El repo ya trae un `render.yaml` con toda la configuración.

1. **New → Blueprint** y elegí el repo `pyahu-api`.
2. Render lee el archivo y te pide los valores que faltan:

   | Variable | Qué poner |
   |---|---|
   | `DB_HOST` | el Host de Aiven |
   | `DB_PORT` | el Port de Aiven |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | la contraseña de Aiven |
   | `DB_SSL_CA` | el certificado en una línea (lo copiaste en el paso 4) |

3. **Apply**. `JWT_SECRET` lo inventa Render solo, largo y al azar.

### Opción B: a mano

1. **New → Web Service** y elegí el repo `pyahu-api`.
2. Completá:
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. En **Environment Variables** cargá:

   | Variable | Valor |
   |---|---|
   | `DB_HOST` | el Host de Aiven |
   | `DB_PORT` | el Port de Aiven |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | la contraseña de Aiven |
   | `DB_NAME` | `pyahu` |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA` | el certificado en una línea (paso 4) |
   | `JWT_SECRET` | uno nuevo; generalo con el comando de abajo |
   | `TRUST_PROXY` | `1` |
   | `REGISTRO_ABIERTO` | `false` |

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Usá un `JWT_SECRET` distinto del de tu PC: si alguna vez se filtra uno, el otro sigue a salvo.

4. **Create Web Service**.

`PORT` no hace falta: Render lo pone solo y `src/server.js` ya lo lee.

### Por qué `TRUST_PROXY=1`

En Render, los pedidos llegan primero a un proxy de Render y de ahí a tu app. Sin esta variable, Express cree que todos los pedidos vienen de la misma IP (la del proxy), y el límite de intentos de login bloquearía a **todos** cuando alguien se equivoca 8 veces. Con `TRUST_PROXY=1`, Express lee la IP real del visitante.

## 6. Primer ingreso: creá tu usuario enseguida

1. Cuando el deploy diga **Live**, abrí la dirección que te da Render (arriba a la izquierda, algo como `https://pyahu-api.onrender.com`).
2. Como la base está vacía, vas a ver la pestaña **Crear cuenta**. Creá tu usuario **ahora**.
3. Listo: con el primer usuario creado, el registro se cierra solo y nadie más puede crearse una cuenta.

Para chequear que la API responde: `https://TU-DIRECCION.onrender.com/estado` tiene que mostrar `{"api":"Pyahu Labs","estado":"ok"}`.

## 7. Instalarla en el celu

Ahora que hay https, se puede instalar como app:

- **Android (Chrome):** abrí la dirección, menú ⋮ → **Instalar app** (o "Agregar a la pantalla principal").
- **iPhone (Safari):** abrí la dirección, botón **Compartir** → **Agregar a inicio**.

Queda con el ícono del brote y abre sin la barra del navegador.

## Cómo se actualiza

- **Cambios de código:** cada `git push origin main` hace que Render la vuelva a publicar sola en un par de minutos.
- **Cambios en la base:** si algún día agregás una migración nueva en `migraciones/`, corré `npm run migrar` contra Aiven como en el paso 3 **antes** de hacer push, así el código nuevo ya encuentra la base actualizada.

## Si algo falla

Mirá los **Logs** del servicio en Render. Los errores más comunes:

| Mensaje en los logs | Qué pasa |
|---|---|
| `Falta JWT_SECRET en el .env (o tiene menos de 32 caracteres)` | Falta la variable `JWT_SECRET` o es muy corta |
| `self-signed certificate in certificate chain` | `DB_SSL_CA` está vacío o mal pegado. Volvé a copiarlo con el comando del paso 4 |
| `ETIMEDOUT` o `ECONNREFUSED` | `DB_HOST` o `DB_PORT` están mal, o el servicio de Aiven está apagado |
| `Access denied for user` | `DB_USER` o `DB_PASSWORD` están mal |
| `Unknown database 'pyahu'` | Falta correr `schema.sql` (paso 3) |
| `Unknown column 'fecha_entrega'` | Falta correr `npm run migrar` contra Aiven (paso 3) |

Si la página tarda en abrir la primera vez, no es un error: Render la estaba despertando.
