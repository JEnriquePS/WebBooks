# WebBooks — Instrucciones para Claude Code

## Proyecto
Lector de PDFs web estilo macOS Books. Monorepo con `client/` (React + Vite + Tailwind v4) y `server/` (Express + Prisma + SQLite).

## Documentación
- Estándar de documentación: `docs/DOCUMENTATION-STANDARD.md`
- ADRs (decisiones arquitectónicas): `docs/adr/ADR-###-slug.md`
- SPECs (cambios de UI/funcionalidad): `docs/specs/SPEC-###-slug.md`
- Guías: `docs/guides/`
- Usa `/document` para generar documentación de cambios recientes

## Convenciones
- Idioma de documentación: español
- Iconos: Lucide React (no emojis)
- Estilos: Tailwind CSS v4 (CSS-first, sin tailwind.config)
- Validación: Zod en server, usar `.nullish()` para campos que aceptan null
- DB: SQLite con Prisma, migraciones en `server/prisma/migrations/`
- PDF metadata: prioridad filename > PDF info para año
- Tests: Vitest
