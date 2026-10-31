# Andrómeda — Backend

API para registrar y compartir gastos familiares. Construida con **Cloudflare Workers + Hono + TypeScript + D1** y arquitectura hexagonal (puertos y adaptadores).

## Requisitos

- Node.js 20+
- pnpm 9+

## Instalación

```bash
pnpm install
```

## Base de datos local

```bash
pnpm db:migrate:local
```

Crea las tablas en la D1 local (`.wrangler/state`). No requiere cuenta de Cloudflare.

## Desarrollo

```bash
pnpm dev
```

- API: `http://localhost:8787`
- Health: `http://localhost:8787/health`

### Desde el emulador Android

El emulador no ve `localhost` del PC. Usa:

```
http://10.0.2.2:8787
```

### Desde un celular físico en la misma red

Usa la IP LAN del PC:

```
http://192.168.x.x:8787
```

## Pruebas

```bash
pnpm test        # pruebas unitarias del dominio
pnpm typecheck   # verificación de tipos
node scripts/smoke.mjs  # flujo E2E contra el servidor local (debe estar corriendo)
```

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Estado del servicio |
| `POST` | `/auth/register` | — | Crear usuario |
| `POST` | `/auth/login` | — | Obtener tokens |
| `POST` | `/auth/refresh` | — | Renovar access token |
| `POST` | `/households` | JWT | Crear hogar (creador = admin) |
| `GET` | `/households` | JWT | Listar los hogares del usuario |
| `POST` | `/households/join` | JWT | Unirse con código de invitación |
| `GET` | `/households/:hid` | JWT | Datos del hogar |
| `POST` | `/households/:hid/admin-password` | JWT | Configurar contraseña de admin |
| `GET` | `/households/:hid/members` | JWT | Listar miembros |
| `DELETE` | `/households/:hid/members/:mid` | JWT | Eliminar miembro (admin) |
| `GET` | `/households/:hid/expenses?updatedAfter=` | JWT | Listar gastos (polling) |
| `POST` | `/households/:hid/expenses` | JWT | Registrar gasto |
| `PATCH` | `/households/:hid/expenses/:eid` | JWT + `X-Admin-Password` | Actualizar gasto (admin) |
| `DELETE` | `/households/:hid/expenses/:eid` | JWT + `X-Admin-Password` | Eliminar gasto (admin) |
| `GET` | `/households/:hid/export.csv` | JWT | Exportar gastos a CSV |

### Ejemplo de gasto

```json
{
  "producto": "Arroz y pollo",
  "montoCents": 3500000,
  "fecha": "2026-10-30"
}
```

`montoCents` está en centavos: `3500000` = **$35.000**.

## Estructura

```
src/
├── index.ts                  # entrypoint del Worker
├── domain/                   # núcleo puro
│   ├── entities/
│   ├── enums/
│   ├── rules/
│   ├── factories/
│   └── ports/
│       ├── in/
│       └── out/
├── application/
│   └── usecases/
├── infrastructure/
│   ├── http/                 # entrada (Hono)
│   ├── d1/                   # salida (persistencia)
│   ├── auth/                 # JWT + PBKDF2
│   └── config/               # composition root
└── exception/
```

Regla de dependencia:

```
infrastructure → application → domain
```

## Seguridad

- Contraseñas de usuario y de admin con **PBKDF2** (Web Crypto).
- **JWT** para sesión; refresh tokens guardados hasheados en D1.
- Editar/eliminar exige rol `ADMIN` **y** la contraseña de admin (`X-Admin-Password`), verificada en el servidor.
- SQL siempre parametrizado (`prepare().bind()`).

## Despliegue en Cloudflare (cuando toque)

1. Crear la base remota:

   ```bash
   pnpm wrangler d1 create andromeda-db
   ```

2. Copiar el `database_id` real en `wrangler.jsonc`.

3. Aplicar migraciones remotas:

   ```bash
   pnpm db:migrate:remote
   ```

4. Configurar el secreto:

   ```bash
   pnpm wrangler secret put JWT_SECRET
   ```

5. Desplegar:

   ```bash
   pnpm deploy
   ```
