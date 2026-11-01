# API Pyahu Labs

API REST para gestionar clientes, proyectos y pagos de Pyahu Labs. Hecha con Node.js, Express y MySQL, con autenticación JWT.

## Funciones
- Registro e inicio de sesión (contraseñas con bcrypt, token JWT).
- CRUD de clientes.
- Proyectos con estado (presupuesto, en curso, entregado, cancelado) y saldo pendiente calculado.
- Pagos con transacción: no permite pagar más que el saldo del proyecto.

## Cómo correrla
1. Instalar dependencias: `npm install`
2. Crear la base: `mysql -u root -p < schema.sql`
3. Copiar `.env.example` a `.env` y completar los datos.
4. Iniciar: `npm start`

## Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/registro | Crear usuario |
| POST | /auth/login | Devuelve el token |
| GET, POST | /clientes | Listar / crear |
| GET, PUT, DELETE | /clientes/:id | Ver / editar / borrar |
| GET, POST | /proyectos | Listar (con pagado y saldo) / crear |
| PATCH | /proyectos/:id/estado | Cambiar estado |
| GET, POST | /pagos | Listar (`?proyecto_id=`) / registrar |

Todas las rutas, salvo `/auth`, requieren `Authorization: Bearer <token>`.
