# espe-expressjs · Tarea U2 · Caso 10 · Eventos

Proyecto de clase (Express 5, Prisma 7, login JWT) extendido con MongoDB (Mongoose 9) para el caso **10 · Eventos**.

| Base | Qué guarda |
|---|---|
| PostgreSQL | `User` (login), `Appointment`/`TimeBlock` (clase) y **`Registration`** (inscripción al evento: el aforo es límite duro) |
| MongoDB | `Specialty` (clase), **`Event`** (catálogo con `sede` y `agenda[]` embebidas) y **`Survey`** (encuesta de satisfacción) |

Modelado: [`docs/Tarea_modelo_hibrido.md`](docs/Tarea_modelo_hibrido.md).

## Cómo correrlo

```bash
docker compose up -d            # PostgreSQL + pgAdmin + MongoDB
cp .env.example .env            # cambie JWT_SECRET
npm install
npx prisma migrate dev          # aplica las migraciones (incluye add_registrations)
npx prisma generate
npm run dev                     # solo arranca si MongoDB conecta
npm test                        # (otra terminal) corre la colección de Postman con newman
```

## Endpoints del caso

| Método y ruta | Base(s) |
|---|---|
| `GET /api/events?q=&fields=&sort=` · `GET /api/events/:id` | MongoDB (+ cupos en PostgreSQL) |
| `POST` / `PUT` / `DELETE /api/events/:id` (JWT) | MongoDB; DELETE → 409 si hay inscritos |
| `POST /api/registrations` (JWT) | PostgreSQL validando MongoDB, aforo → 409 |
| `GET /api/registrations/me` (JWT) | Las dos, `$in` + `Map` |
| `PATCH /api/registrations/:id/cancel` (JWT) | PostgreSQL |
| `POST /api/surveys` (JWT) | MongoDB validando PostgreSQL (404/403/409) |
| `GET /api/events/:id/surveys` · `/surveys/summary` | MongoDB (`populate` · `aggregate`) |
| `GET` / `DELETE /api/auth/me` (JWT) | PostgreSQL (+ borra encuestas en MongoDB) |

## Entrega

```bash
git tag u2-tarea
git push origin u2-tarea
```
