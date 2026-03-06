# SPEC-001: Rediseño de BookCard — portada compacta y metadata visible

**Estado:** Implementado
**Fecha:** 2026-03-05

## Motivación

El diseño anterior del BookCard usaba una portada vertical (`aspect-[2/3]`) que ocupaba la mayor parte del espacio visual de la tarjeta. Los detalles del libro se limitaban a título y autor/año en un área pequeña debajo de la portada. Esto dificultaba escanear visualmente la biblioteca cuando se buscaba un libro específico, ya que la información útil (páginas, tamaño, progreso) no era visible sin abrir el libro.

## Cambios realizados

### BookCard (`client/src/components/library/BookCard.tsx`)

#### Portada

| Propiedad     | Antes             | Después           |
|---------------|-------------------|--------------------|
| Aspect ratio  | `aspect-[2/3]` (vertical, tipo libro) | `aspect-[3/2]` (horizontal, tipo landscape) |
| Espacio visual | ~70% de la tarjeta | ~40% de la tarjeta |
| Padding interno (sin cover) | `p-4` | `p-3` |
| Line clamp (sin cover) | 4 líneas | 3 líneas |

#### Sección de detalles

| Elemento            | Antes                           | Después                                  |
|---------------------|----------------------------------|-------------------------------------------|
| Título              | `line-clamp-2`, `text-sm`       | Sin cambios                               |
| Autor / Año         | `text-xs`, truncado              | Sin cambios                               |
| Páginas totales     | No visible                       | Icono `BookOpen` + `{totalPages} pág`     |
| Tamaño de archivo   | No visible                       | Icono `FileText` + KB/MB formateado       |
| Barra de progreso   | Sección separada fuera del botón | Integrada dentro de la sección de detalles |

#### Nueva función utilitaria

```typescript
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

#### Nuevos iconos importados

- `BookOpen` (lucide-react) — para total de páginas
- `FileText` (lucide-react) — para tamaño del archivo

### BookGrid (`client/src/components/library/BookGrid.tsx`)

| Propiedad         | Antes                                    | Después                                          |
|-------------------|-------------------------------------------|--------------------------------------------------|
| Columnas del grid | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` |
| Skeleton count    | 8                                         | 10                                               |
| Skeleton aspect   | `aspect-[2/3]`                            | `aspect-[3/2]`                                   |
| Skeleton rows     | 2 (título + autor)                        | 3 (título + autor + metadata)                    |
| Folder card aspect| `aspect-[2/3]`                            | `aspect-[3/2]`                                   |

## Estructura visual resultante

```
┌─────────────────────────┐
│                         │
│    Portada (3:2)        │
│    (landscape)          │
│                         │
├─────────────────────────┤
│ Título del Libro        │
│ Autor · 2004            │
│ 📖 342 pág  📄 4.2 MB  │
│ ████████░░░░░░░░░ 52%   │
└─────────────────────────┘
```

## Archivos modificados

- `client/src/components/library/BookCard.tsx`
- `client/src/components/library/BookGrid.tsx`

## Notas

- Los iconos usan `w-3 h-3` (12px) para mantener proporción con el texto `text-[11px]`
- La metadata (páginas + tamaño) solo se muestra si `totalPages` existe; el tamaño siempre se muestra
- El grid adiciona una columna en `xl` (>1280px) para aprovechar pantallas anchas con las tarjetas más compactas
- No se modificó el componente `BookListItem` (vista lista) ya que su diseño horizontal no tiene el mismo problema de espacio
