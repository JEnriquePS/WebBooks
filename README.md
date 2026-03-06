# WebBooks

Lector de PDFs web estilo macOS Books. Explora tu biblioteca de archivos locales, lee con un visor integrado y guarda resaltados y anotaciones en base de datos.

## Stack

- **Client:** React 19, Vite, Tailwind CSS v4, Zustand, React Query, react-pdf
- **Server:** Express, Prisma, SQLite, Sharp, pdf-parse
- **Infra:** Docker Compose

## Requisitos

- Node.js 22+
- Docker (opcional, para desarrollo con contenedores)

## Inicio rápido

```bash
# Instalar dependencias
npm install
cd client && npm install
cd ../server && npm install

# Configurar base de datos
npm run db:migrate

# Desarrollo con Docker
npm run dev

# Desarrollo local (sin Docker)
npm run dev:local
```

## Scripts disponibles

| Script | Descripcion |
|---|---|
| `npm run dev` | Levanta el entorno con Docker Compose |
| `npm run dev:local` | Ejecuta server y client en paralelo |
| `npm run build` | Build de produccion con Docker |
| `npm run db:migrate` | Ejecuta migraciones de Prisma |
| `npm run db:studio` | Abre Prisma Studio |

## Estructura del proyecto

```
WebBooks/
├── client/          # Frontend React + Vite
├── server/          # Backend Express + Prisma
│   └── prisma/      # Schema y migraciones
├── books/           # Directorio de PDFs (local)
├── docs/
│   ├── specs/       # Especificaciones
│   ├── adr/         # Decisiones arquitectonicas
│   └── guides/      # Guias de usuario
└── docker-compose.yml
```

## Documentacion

- [Especificacion del producto](docs/specs/webbooks-spec-driven.md)
- [Guia de usuario](docs/guides/guia-de-usuario.md)
- [Estandar de documentacion](docs/DOCUMENTATION-STANDARD.md)
