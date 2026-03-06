# ADR-009: Extracción completa de metadata PDF + auto-completar desde nombre de archivo

**Estado:** Aprobado
**Fecha:** 2026-03-06

## Contexto

Actualmente el scanner solo extrae `Title`, `Author` y `pageCount` del PDF. Muchos PDFs tienen metadata adicional útil (Subject, Keywords, CreationDate) y otros no tienen metadata alguna. Sin embargo, los archivos del usuario siguen una convención de nombrado como `Título - Autor - Año.pdf` que puede aprovecharse como fallback.

### Metadata real observada en la biblioteca

| Archivo | Title | Author | Otros |
|---------|-------|--------|-------|
| 2666 - Roberto Bolaño - 2004.pdf | "2666" | ❌ vacío | Creator, CreationDate |
| Amberes - Roberto Bolaño - 2002.pdf | "Amberes" | "Roberto Bolaño" | Creator, CreationDate |
| 21 libros para leer este 2025.pdf | ❌ vacío | ❌ vacío | ❌ nada |

## Decisión

1. **Extraer todos los campos de metadata disponibles** del PDF durante el escaneo
2. **Auto-completar desde el nombre del archivo** cuando la metadata del PDF está vacía
3. Los campos extraídos del PDF se almacenan como **solo lectura** (metadata original)
4. Los campos editables por el usuario (title, author, description) tienen prioridad sobre los del PDF

## Cambios requeridos

### Modelo de datos (Prisma)

Agregar campos al modelo `Book`:

```prisma
model Book {
  // ... campos existentes ...

  // Metadata extraída del PDF (solo lectura, informativa)
  pdfTitle        String?   // Title del PDF info
  pdfAuthor       String?   // Author del PDF info
  pdfSubject      String?   // Subject del PDF info
  pdfKeywords     String?   // Keywords del PDF info
  pdfCreator      String?   // App que creó el contenido original
  pdfProducer     String?   // App que generó el PDF
  pdfCreationDate String?   // Fecha de creación del PDF
  pdfModDate      String?   // Fecha de modificación del PDF

  // Año extraído (del PDF o del nombre de archivo)
  year            Int?
}
```

### Scanner (`libraryScanner.ts`)

**Extracción de metadata completa:**
```typescript
interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  keywords: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modDate: string | null;
  totalPages: number | null;
}
```

Extraer todos los campos de `data.info` retornados por `pdf-parse`.

**Parseo del nombre de archivo como fallback:**

Patrones soportados:
```
"Título - Autor - Año.pdf"         → { title, author, year }
"Título - Autor.pdf"               → { title, author }
"Título.pdf"                       → { title }
"Título (Autor, Año).pdf"          → { title, author, year }
```

Regex principal:
```typescript
// Patrón: "Título - Autor - Año.pdf"
const match = baseName.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(\d{4})$/);
if (match) {
  return { title: match[1].trim(), author: match[2].trim(), year: parseInt(match[3]) };
}

// Patrón: "Título - Autor.pdf"
const match2 = baseName.match(/^(.+?)\s*-\s*(.+?)$/);
if (match2) {
  return { title: match2[1].trim(), author: match2[2].trim(), year: null };
}

// Fallback: nombre del archivo sin extensión
return { title: baseName, author: null, year: null };
```

**Prioridad de resolución para `title` y `author`:**

```
1. Campo editado por el usuario (si lo modificó manualmente)
2. Metadata del PDF (pdfTitle, pdfAuthor)
3. Parseado del nombre de archivo
4. Nombre del archivo sin extensión (solo para title)
```

Para implementar esto sin complejidad, el scanner asigna `title` y `author` siguiendo esta prioridad al crear el libro. Si el usuario después edita via PATCH, esos valores tienen prioridad natural (ya están en los campos principales).

### API

**`GET /api/books/:id`** — Incluir los nuevos campos `pdf*` y `year` en la respuesta.

**Modal de edición de metadata** — Mostrar sección informativa "Metadata del PDF" con los campos `pdf*` como texto de solo lectura, debajo de los campos editables.

### Frontend

**MetadataEditModal** — Agregar sección colapsable "Metadata original del PDF":
- Muestra pdfTitle, pdfAuthor, pdfSubject, pdfKeywords, pdfCreator, pdfProducer, pdfCreationDate como texto gris de solo lectura
- Solo se muestra si al menos un campo tiene valor
- No es editable — es informativo

**BookCard** — Mostrar año junto al autor si está disponible: `"Roberto Bolaño · 2004"`

## Consecuencias

- Los libros sin metadata del PDF se benefician del parseo del nombre de archivo
- La metadata original del PDF se preserva como referencia, sin mezclarla con las ediciones del usuario
- El año se extrae y almacena por separado, útil para ordenar y mostrar
- El parseo del nombre de archivo es best-effort: si el formato no coincide con los patrones, se usa el nombre completo como título
- El re-scan actualiza los campos `pdf*` si cambian, pero NO sobreescribe `title`/`author` si el usuario los editó manualmente
