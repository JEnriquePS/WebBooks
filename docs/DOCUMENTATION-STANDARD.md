# Estándar de Documentación — WebBooks

Este documento define los tipos de documentación del proyecto, cuándo usar cada uno, y su formato.

## Tipos de documentos

| Tipo | Directorio | Prefijo | Cuándo usar |
|------|-----------|---------|-------------|
| **ADR** | `docs/adr/` | `ADR-###` | Decisiones arquitectónicas con trade-offs técnicos |
| **SPEC** | `docs/specs/` | `SPEC-###` | Cambios de diseño, UI/UX, o funcionalidad implementada |
| **GUIDE** | `docs/guides/` | Sin prefijo | Guías de uso, setup, o procesos del proyecto |

---

## ADR — Architecture Decision Record

**Propósito:** Documentar decisiones técnicas significativas que tienen alternativas y consecuencias. Un ADR responde: "¿por qué elegimos X en vez de Y?"

**Cuándo crear un ADR:**
- Cambio en el modelo de datos (nuevos campos, relaciones, migraciones)
- Elección de librería, framework, o herramienta
- Cambio en la arquitectura del sistema (API, servicios, infraestructura)
- Patrón de diseño técnico que afecta múltiples archivos
- Decisión que sería difícil o costosa de revertir

**Cuándo NO crear un ADR:**
- Cambios de UI/layout (usar SPEC)
- Bug fixes
- Refactors que no cambian comportamiento
- Actualizaciones de dependencias menores

### Formato

```markdown
# ADR-###: Título descriptivo en español

**Estado:** Propuesto | Aprobado | Implementado | Deprecado
**Fecha:** YYYY-MM-DD

## Contexto

[Describir el problema o necesidad. Incluir datos concretos si los hay:
métricas, ejemplos reales, limitaciones actuales.]

## Decisión

[Describir la decisión tomada en 1-3 párrafos. Ser específico.]

## Alternativas consideradas

[Opcional pero recomendado. Listar alternativas y por qué se descartaron.]

### Opción A: [nombre]
- Ventaja: ...
- Desventaja: ...

### Opción B: [nombre] (elegida)
- Ventaja: ...
- Desventaja: ...

## Cambios requeridos

### Backend
[Cambios en modelo, API, servicios. Incluir snippets de código si aclaran.]

### Frontend
[Cambios en componentes, stores, tipos.]

### Infraestructura
[Cambios en Docker, CI/CD, config. Omitir si no aplica.]

## Consecuencias

[Qué implica esta decisión. Efectos positivos, negativos, y trade-offs aceptados.]
```

### Convenciones
- **Numeración:** Secuencial, 3 dígitos con ceros: `ADR-001`, `ADR-010`
- **Nombre del archivo:** `ADR-###-slug-descriptivo.md` (slug en español, kebab-case)
- **Idioma:** Español
- **Estados:** `Propuesto` → `Aprobado` → `Implementado` | `Deprecado`

---

## SPEC — Specification Document

**Propósito:** Documentar cambios de diseño, funcionalidad, o UI ya implementados o por implementar. Un SPEC responde: "¿qué cambió y por qué?"

**Cuándo crear un SPEC:**
- Rediseño de un componente visual
- Nueva funcionalidad de usuario (feature)
- Cambio de comportamiento en la UI
- Reestructuración de layout o navegación

**Cuándo NO crear un SPEC:**
- Decisiones arquitectónicas con trade-offs (usar ADR)
- Corrección de bugs (documentar en el commit)
- Cambios internos sin impacto visible al usuario

### Formato

```markdown
# SPEC-###: Título descriptivo en español

**Estado:** Propuesto | Implementado
**Fecha:** YYYY-MM-DD

## Motivación

[¿Por qué se necesita este cambio? Describir el problema desde la
perspectiva del usuario.]

## Cambios realizados

### [Componente/Área 1]
[Describir cambios. Usar tablas comparativas antes/después cuando aplique.]

| Propiedad | Antes | Después |
|-----------|-------|---------|
| ...       | ...   | ...     |

### [Componente/Área 2]
[Más cambios si aplica.]

## Estructura visual

[Opcional. Diagrama ASCII o descripción del layout resultante.]

```
┌─────────────┐
│  Ejemplo    │
└─────────────┘
```

## Archivos modificados

- `ruta/al/archivo1.tsx`
- `ruta/al/archivo2.ts`

## Notas

[Detalles de implementación, edge cases, o consideraciones adicionales.]
```

### Convenciones
- **Numeración:** Secuencial, 3 dígitos: `SPEC-001`, `SPEC-010`
- **Nombre del archivo:** `SPEC-###-slug-descriptivo.md`
- **Idioma:** Español
- **Estados:** `Propuesto` → `Implementado`

---

## GUIDE — Guías

**Propósito:** Documentar procesos, setup, o instrucciones que se consultan repetidamente.

**Ejemplos:**
- Guía de setup local
- Cómo agregar un nuevo endpoint
- Proceso de deploy
- Convenciones de código

### Formato

```markdown
# Título de la guía

[Descripción breve de qué cubre esta guía.]

## Prerequisitos

[Lo que se necesita antes de seguir la guía.]

## Pasos

### 1. Primer paso
[Instrucciones.]

### 2. Segundo paso
[Instrucciones.]

## Troubleshooting

[Problemas comunes y soluciones. Opcional.]
```

### Convenciones
- **Nombre del archivo:** `slug-descriptivo.md` (sin prefijo numérico)
- **Idioma:** Español
- **Ubicación:** `docs/guides/`

---

## Reglas generales

1. **Idioma:** Todo en español
2. **Formato:** Markdown con GitHub Flavored Markdown
3. **Código:** Usar bloques con sintaxis highlighting (```typescript, ```prisma, etc.)
4. **Tablas:** Preferir tablas para comparaciones antes/después
5. **Brevedad:** Documentar lo necesario, no escribir novelas
6. **Archivos afectados:** Siempre listar los archivos modificados en ADRs y SPECs
7. **Fechas:** Formato ISO `YYYY-MM-DD`

## Estructura del directorio

```
docs/
├── DOCUMENTATION-STANDARD.md    ← Este archivo
├── adr/
│   ├── ADR-008-navegacion-por-carpetas.md
│   └── ADR-009-extraccion-metadata-pdf.md
├── specs/
│   └── SPEC-001-rediseno-book-card.md
└── guides/
    └── (guías futuras)
```
