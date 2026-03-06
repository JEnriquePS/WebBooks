# WebBooks — Spec Driven Development

> Documento de especificación técnica para guiar el desarrollo de WebBooks,  
> un lector de PDFs web estilo macOS Books con sistema de anotaciones persistidas.

---

## Índice

1. [Visión del Producto](#1-visión-del-producto)
2. [Personas y Casos de Uso](#2-personas-y-casos-de-uso)
3. [Requerimientos Funcionales](#3-requerimientos-funcionales)
4. [Requerimientos No Funcionales](#4-requerimientos-no-funcionales)
5. [Arquitectura del Sistema](#5-arquitectura-del-sistema)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Contratos de API](#7-contratos-de-api)
8. [Especificaciones de UI](#8-especificaciones-de-ui)
9. [Criterios de Aceptación por Feature](#9-criterios-de-aceptación-por-feature)
10. [Plan de Desarrollo por Fases](#10-plan-de-desarrollo-por-fases)
11. [Decisiones Técnicas y ADRs](#11-decisiones-técnicas-y-adrs)
12. [Plan de Tests](#12-plan-de-tests)
13. [Checklist de Definition of Done](#13-checklist-de-definition-of-done)

---

## 1. Visión del Producto

### Problema

Los profesionales que trabajan con grandes colecciones de PDFs (libros técnicos, papers, documentación) no tienen una herramienta web que combine:

- Exploración visual de su biblioteca de archivos locales
- Lectura fluida con un visor integrado de calidad
- Resaltado y anotaciones persistidas, consultables fuera del documento

### Solución

WebBooks es una aplicación web full-stack que sirve como interfaz de lectura sobre un directorio de PDFs local. El servidor escanea y sirve los archivos; el cliente renderiza el PDF en el browser, permite resaltar texto con múltiples colores y guarda todas las anotaciones en base de datos, accesibles desde cualquier sesión.

### Alcance v1.0

| Incluido | Excluido |
|---|---|
| Explorador de directorio de PDFs | Soporte multi-usuario / autenticación |
| Visor PDF con scroll y zoom | Edición de PDFs |
| Resaltado con 4 colores | Sincronización cloud |
| Notas en resaltados | Soporte a otros formatos (EPUB, DOCX) |
| Persistencia en base de datos | App móvil nativa |
| Progreso de lectura | Modo colaborativo / compartir |
| Búsqueda dentro del PDF | — |

---

## 2. Personas y Casos de Uso

### Persona Principal: El Lector Técnico

- Tiene entre 50 y 300 PDFs organizados en carpetas locales
- Los lee de forma no lineal, saltando entre capítulos
- Necesita volver a sus highlights semanas después
- Trabaja desde el mismo equipo siempre (uso local / LAN)

### Casos de Uso Principales

```
UC-01: Explorar la biblioteca
  Como lector, quiero ver todos mis PDFs en una grilla visual
  con portadas y progreso, para elegir qué leer.

UC-02: Abrir y leer un PDF
  Como lector, quiero abrir un PDF y navegar sus páginas con
  scroll fluido y zoom, para leerlo cómodamente.

UC-03: Resaltar texto
  Como lector, quiero seleccionar texto, elegir un color de
  resaltado y guardarlo, para marcarlo como importante.

UC-04: Añadir nota a un resaltado
  Como lector, quiero añadir una nota de texto a un resaltado,
  para recordar por qué lo marqué.

UC-05: Consultar todas las anotaciones de un libro
  Como lector, quiero ver un panel con todos los highlights
  agrupados por página, para repasar lo estudiado.

UC-06: Continuar lectura donde la dejé
  Como lector, quiero que la app recuerde la última página
  que leí, para continuar sin buscar manualmente.

UC-07: Buscar texto dentro del PDF
  Como lector, quiero buscar una palabra o frase dentro del
  PDF activo y navegar entre resultados.

UC-08: Exportar anotaciones
  Como lector, quiero exportar los highlights de un libro
  como archivo Markdown, para usarlos en mis notas.

UC-09: Descubrir anotaciones en la página principal
  Como lector, quiero ver anotaciones aleatorias de mis libros
  en la página principal, para redescubrir lo que he marcado.

UC-10: Editar metadata de un libro
  Como lector, quiero editar el título, autor y portada de un
  libro, para organizarlo a mi gusto.
```

---

## 3. Requerimientos Funcionales

### RF-01 — Explorador de Biblioteca

- `RF-01.1` El sistema escanea recursivamente el directorio configurado en `BOOKS_DIR` y registra todos los archivos `.pdf` encontrados.
- `RF-01.2` Cada libro se muestra con: portada (thumbnail de la página 1), título (extraído del metadata o nombre de archivo), total de páginas y porcentaje de progreso.
- `RF-01.3` La biblioteca se puede filtrar por: Todos, Recientes (últimos 7 días leídos), Favoritos, En progreso, Terminados.
- `RF-01.4` Existe una barra de búsqueda que filtra por nombre de archivo o título en tiempo real (debounce 300ms).
- `RF-01.5` El usuario puede marcar/desmarcar un libro como favorito desde la tarjeta.
- `RF-01.6` Un watcher detecta cuando se añaden o eliminan PDFs del directorio y actualiza la biblioteca sin recargar la página.
- `RF-01.7` La página principal de la biblioteca muestra una sección **"Redescubre tus notas"** con un carrusel de anotaciones aleatorias. Cada tarjeta muestra: texto resaltado, color del highlight, nota (si existe), título del libro, autor y portada (thumbnail). Al hacer clic en una tarjeta, se navega al libro en la página correspondiente.
- `RF-01.8` Las anotaciones aleatorias se refrescan cada vez que el usuario visita la página principal. Se muestran entre 3 y 6 anotaciones (según disponibilidad).

### RF-06 — Edición de Metadata del Libro

- `RF-06.1` Cada libro tiene una vista/modal de **edición de metadata** accesible desde la tarjeta del libro (botón de editar) o desde el toolbar del lector.
- `RF-06.2` Los campos editables son: título, autor, descripción y portada.
- `RF-06.3` Por defecto, la portada del libro es un thumbnail generado automáticamente de la **primera página del PDF**.
- `RF-06.4` El usuario puede subir una imagen personalizada como portada (formatos: JPG, PNG, WebP; tamaño máx: 2MB). La imagen se redimensiona a 400×560px y se almacena en el directorio de cache.
- `RF-06.5` El usuario puede restaurar la portada al thumbnail por defecto (primera página del PDF) en cualquier momento.
- `RF-06.6` Los cambios de metadata se persisten inmediatamente con feedback visual (toast de Sonner).

### RF-02 — Visor PDF

- `RF-02.1` El PDF se renderiza en el browser usando PDF.js a través de `react-pdf`.
- `RF-02.2` La navegación puede ser por scroll continuo o por página (toggle en toolbar).
- `RF-02.3` El usuario puede hacer zoom in/out con botones o `Ctrl + scroll`. Rango: 50% – 300%.
- `RF-02.4` El toolbar superior muestra: botón de regreso a biblioteca, título, número de página actual / total, controles de zoom y toggle de modo.
- `RF-02.5` El sidebar izquierdo puede mostrar tabla de contenidos (TOC) extraída del PDF o miniaturas de páginas.
- `RF-02.6` Al abrir un libro, el visor navega automáticamente a la última página leída.
- `RF-02.7` El progreso de lectura (página actual) se guarda automáticamente cada 5 segundos mientras el usuario lee.

### RF-03 — Sistema de Resaltado

- `RF-03.1` Al seleccionar texto en el PDF, aparece un popover con la paleta de colores: amarillo (`#FFF176`), verde (`#A5D6A7`), azul (`#90CAF9`), rosa (`#F48FB1`).
- `RF-03.2` Al elegir un color, el texto queda visualmente resaltado con ese color y la anotación se persiste en la base de datos de forma optimista (UI actualiza antes de confirmar el server).
- `RF-03.3` El popover incluye un botón "Añadir nota" que expande un textarea para escribir un comentario opcional.
- `RF-03.4` Los highlights guardados se renderizan al cargar la página correspondiente del PDF.
- `RF-03.5` Hacer clic en un highlight existente muestra un popover con opciones: ver/editar nota, cambiar color, eliminar.
- `RF-03.6` El sistema almacena la posición del highlight como un arreglo de rectángulos `{x, y, width, height}` normalizados al tamaño de la página del PDF.

### RF-04 — Panel de Anotaciones

- `RF-04.1` Un sidebar derecho muestra todas las anotaciones del libro activo, agrupadas por número de página.
- `RF-04.2` Cada anotación en la lista muestra: color de resaltado, texto resaltado (máx. 2 líneas), nota si existe, y número de página.
- `RF-04.3` Hacer clic en una anotación del panel navega el visor a la página correspondiente.
- `RF-04.4` El usuario puede exportar todas las anotaciones del libro activo como un archivo `.md` con la estructura:

```markdown
# Anotaciones: {título del libro}
Exportado: {fecha}

## Página {n}
> {texto resaltado}
**Nota:** {nota opcional}
Color: {color}
```

### RF-05 — Búsqueda

- `RF-05.1` El toolbar del lector incluye un campo de búsqueda que encuentra texto dentro del PDF activo.
- `RF-05.2` Los resultados se resaltan visualmente en el PDF con fondo naranja para diferenciarlos de los highlights del usuario.
- `RF-05.3` Botones anterior/siguiente navegan entre resultados. El contador muestra "3 de 12".

---

## 4. Requerimientos No Funcionales

### Rendimiento

- `RNF-01` El tiempo de carga inicial de la biblioteca (con hasta 500 PDFs) debe ser menor a 2 segundos.
- `RNF-02` El tiempo hasta que el usuario puede leer la primera página de un PDF debe ser menor a 3 segundos en una red LAN con archivos hasta 50MB.
- `RNF-03` Los thumbnails se generan de forma lazy y se cachean en disco. No se regeneran si el archivo no cambió.
- `RNF-04` El visor virtualiza las páginas: solo renderiza las páginas visibles ± 2 páginas de buffer.

### Compatibilidad

- `RNF-05` La app funciona correctamente en Chrome 120+, Firefox 121+, Safari 17+.
- `RNF-06` El layout mínimo soportado es de 1024px de ancho (no se requiere soporte móvil en v1.0).

### Disponibilidad

- `RNF-07` La aplicación corre localmente (o en LAN) y no depende de servicios externos en runtime.

### Seguridad

- `RNF-08` El servidor solo sirve archivos dentro del `BOOKS_DIR` configurado. Cualquier path traversal (`../`) retorna 403.
- `RNF-09` Los endpoints de escritura validan y sanitizan el input antes de persistir.

---

## 5. Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (React SPA)                   │
│                                                          │
│  ┌─────────────┐   ┌──────────────────────────────────┐ │
│  │ LibraryView │   │          ReaderView               │ │
│  │             │   │  ┌──────────┐  ┌───────────────┐ │ │
│  │  BookGrid   │   │  │PDFViewer │  │AnnotationPanel│ │ │
│  │  FilterBar  │   │  │  +Canvas │  │               │ │ │
│  │  SearchBar  │   │  │  Layer   │  │AnnotationList │ │ │
│  └──────┬──────┘   │  └──────────┘  └───────────────┘ │ │
│         │          │        TOCSidebar                  │ │
│         │          └──────────────────────────────────┘ │
│         │                          │                     │
│         └────────── API Client ────┘                     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────┐
│                  BACKEND (Node + Express)                 │
│                                                          │
│  /api/library      /api/books/:id/file                   │
│  /api/books/:id    /api/books/:id/annotations            │
│  /api/annotations/:id    /api/books/:id/progress         │
│                                                          │
│  ┌──────────────┐  ┌────────────────┐                    │
│  │ LibraryScanner│  │ ThumbnailCache │                    │
│  │  (chokidar)  │  │  (PNG files)   │                    │
│  └──────┬───────┘  └───────┬────────┘                    │
│         │                  │                             │
│         └────── Prisma ORM ┘                             │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼───────────────────┐
         ▼                 ▼                   ▼
   PostgreSQL          /books/            /cache/
   (annotations,       (PDF files)        (thumbnails)
    books, progress)
```

### Stack Tecnológico

| Capa | Tecnología | Versión mínima | Justificación |
|---|---|---|---|
| Frontend framework | React | 18 | Ecosistema, hooks, concurrent mode |
| Build tool | Vite | 5 | HMR rápido, ESM nativo |
| PDF rendering | react-pdf / PDF.js | 7.x | Estándar de facto en web |
| Estilos | Tailwind CSS | 4 | Velocidad de desarrollo, nuevo motor CSS-first |
| Iconos | Lucide React | latest | Iconografía consistente, tree-shakeable |
| Estado global | Zustand | 4 | Ligero, no boilerplate |
| Toasts / Alertas | Sonner | latest | Toasts accesibles, animados, apilables |
| HTTP client | TanStack Query | 5 | Cache, loading states, mutations |
| Backend | Node.js + Express | 20 LTS | Equipo familiarizado |
| ORM | Prisma | 5 | DX, migraciones, type-safety |
| Base de datos (dev) | SQLite | 3 | Cero configuración local |
| Base de datos (prod) | PostgreSQL | 16 | Robustez, JSONB nativo |
| File watcher | chokidar | 3 | Cross-platform, estable |

---

## 6. Modelo de Datos

### Esquema Prisma

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // sqlite en desarrollo
  url      = env("DATABASE_URL")
}

model Book {
  id              String    @id @default(uuid())
  title           String
  author          String?
  description     String?
  fileName        String    @unique
  filePath        String    @unique
  totalPages      Int?
  fileSize        BigInt
  thumbnailPath   String?   // auto-generado de la página 1 del PDF (portada por defecto)
  customCoverPath String?   // portada personalizada subida por el usuario (null = usar thumbnailPath)
  coverColor      String?   // color dominante extraído de la portada
  isFavorite      Boolean   @default(false)
  addedAt         DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  annotations     Annotation[]
  readingProgress ReadingProgress?
  bookTags        BookTag[]

  @@map("books")
}

model Annotation {
  id           String   @id @default(uuid())
  bookId       String
  pageNumber   Int
  selectedText String
  note         String?
  color        String   // "yellow" | "green" | "blue" | "pink"
  positionData Json     // { rects: [{x, y, width, height}] }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([bookId])
  @@index([bookId, pageNumber])
  @@map("annotations")
}

model ReadingProgress {
  id             String   @id @default(uuid())
  bookId         String   @unique
  currentPage    Int      @default(1)
  scrollOffset   Float    @default(0) // 0.0 - 1.0
  isFinished     Boolean  @default(false)
  readingTimeSec Int      @default(0)
  lastReadAt     DateTime @default(now())

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@map("reading_progress")
}

model Tag {
  id       String    @id @default(uuid())
  name     String    @unique
  color    String
  bookTags BookTag[]

  @@map("tags")
}

model BookTag {
  bookId String
  tagId  String

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([bookId, tagId])
  @@map("book_tags")
}
```

### Estructura de `positionData`

El campo JSONB `positionData` en `Annotation` almacena las coordenadas de los rectángulos que conforman el resaltado (puede ser multi-línea):

```typescript
interface PositionData {
  rects: Array<{
    x: number;       // posición X normalizada (0-1) relativa al ancho de la página
    y: number;       // posición Y normalizada (0-1) relativa al alto de la página
    width: number;   // ancho normalizado (0-1)
    height: number;  // alto normalizado (0-1)
  }>;
  pageWidth: number;   // ancho original de la página en puntos PDF
  pageHeight: number;  // alto original de la página en puntos PDF
}
```

Las coordenadas se normalizan para que el highlight sea independiente del zoom actual al guardarse.

---

## 7. Contratos de API

### Tipos compartidos

```typescript
// types.ts (compartido frontend/backend)

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  fileName: string;
  totalPages: number | null;
  fileSize: number;
  coverUrl: string | null;    // resuelve customCoverPath ?? thumbnailPath
  isFavorite: boolean;
  addedAt: string;  // ISO 8601
  progress: {
    currentPage: number;
    percentage: number;
    isFinished: boolean;
    lastReadAt: string;
  } | null;
}

interface Annotation {
  id: string;
  bookId: string;
  pageNumber: number;
  selectedText: string;
  note: string | null;
  color: "yellow" | "green" | "blue" | "pink";
  positionData: PositionData;
  createdAt: string;
}

interface RandomAnnotation extends Annotation {
  book: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
  };
}
```

---

### `GET /api/library`

Retorna todos los libros registrados con su progreso.

**Query params opcionales:**

| Param | Tipo | Valores |
|---|---|---|
| `filter` | string | `all` \| `recent` \| `favorites` \| `in-progress` \| `finished` |
| `search` | string | texto libre, busca en `title` y `fileName` |

**Response `200`:**
```json
{
  "books": [Book],
  "total": 42
}
```

---

### `GET /api/annotations/random`

Retorna anotaciones aleatorias con metadata del libro para mostrar en la página principal.

**Query params opcionales:**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `limit` | number | `6` | Cantidad de anotaciones a retornar (máx. 10) |

**Response `200`:**
```json
{
  "annotations": [RandomAnnotation]
}
```

Cada `RandomAnnotation` incluye el objeto `book` con `id`, `title`, `author` y `coverUrl` para renderizar la tarjeta sin queries adicionales.

Si no hay anotaciones en la BD, retorna un arreglo vacío.

---

### `PATCH /api/books/:id`

Actualiza la metadata editable de un libro.

**Body:**
```json
{
  "title": "Clean Code (edición personal)",
  "author": "Robert C. Martin",
  "description": "Notas sobre principios de código limpio"
}
```

Todos los campos son opcionales. Solo se actualizan los campos enviados.

**Response `200`:** `Book` actualizado

**Validaciones:**
- `title`: no vacío si se envía, máx. 500 caracteres
- `author`: máx. 200 caracteres
- `description`: máx. 2000 caracteres

---

### `POST /api/books/:id/cover`

Sube una imagen personalizada como portada del libro.

**Body:** `multipart/form-data` con campo `cover` (imagen JPG, PNG o WebP, máx. 2MB)

**Response `200`:**
```json
{
  "coverUrl": "/api/books/abc-123/cover?v=1709654400"
}
```

El servidor redimensiona la imagen a 400×560px y la almacena en el directorio de cache. El query param `v` es un cache-buster basado en timestamp.

**Errores:**
- `400` si el archivo no es una imagen válida o excede 2MB
- `404` si el libro no existe

---

### `DELETE /api/books/:id/cover`

Elimina la portada personalizada y restaura el thumbnail por defecto (primera página del PDF).

**Response `200`:**
```json
{
  "coverUrl": "/api/books/abc-123/thumbnail"
}
```

---

### `POST /api/library/scan`

Fuerza un re-escaneo del directorio `BOOKS_DIR`.

**Response `200`:**
```json
{
  "added": 3,
  "removed": 0,
  "updated": 1,
  "total": 127
}
```

---

### `GET /api/books/:id/file`

Sirve el archivo PDF con soporte de `Range` headers para streaming.

**Headers de respuesta:**
```
Content-Type: application/pdf
Content-Disposition: inline; filename="{fileName}"
Accept-Ranges: bytes
```

**Errores:**
- `404` si el libro no existe en la BD
- `404` si el archivo físico no se encuentra
- `403` si el path del archivo está fuera de `BOOKS_DIR`

---

### `GET /api/books/:id/thumbnail`

Retorna la portada del libro como imagen PNG.

**Response `200`:** `image/png`

Si el thumbnail no existe aún, se genera en el momento (puede tomar ~500ms la primera vez).

---

### `GET /api/books/:id/annotations`

**Response `200`:**
```json
{
  "annotations": [Annotation],
  "total": 18
}
```

---

### `POST /api/books/:id/annotations`

Crea una nueva anotación.

**Body:**
```json
{
  "pageNumber": 42,
  "selectedText": "El texto que fue resaltado",
  "color": "yellow",
  "positionData": {
    "rects": [{ "x": 0.1, "y": 0.3, "width": 0.5, "height": 0.02 }],
    "pageWidth": 595,
    "pageHeight": 842
  },
  "note": "Opcional"
}
```

**Response `201`:** `Annotation`

**Validaciones:**
- `pageNumber`: entero positivo, ≤ `book.totalPages`
- `selectedText`: no vacío, máx. 2000 caracteres
- `color`: uno de `yellow | green | blue | pink`
- `positionData.rects`: arreglo no vacío, cada valor normalizado entre 0 y 1

---

### `PATCH /api/annotations/:id`

Actualiza `note` y/o `color` de una anotación existente.

**Body:**
```json
{
  "note": "Nueva nota",
  "color": "blue"
}
```

**Response `200`:** `Annotation` actualizada

---

### `DELETE /api/annotations/:id`

**Response `204`:** sin cuerpo

---

### `GET /api/books/:id/progress`

**Response `200`:**
```json
{
  "currentPage": 87,
  "scrollOffset": 0.34,
  "isFinished": false,
  "readingTimeSec": 4320,
  "lastReadAt": "2025-03-01T18:30:00Z"
}
```

Si el libro nunca fue abierto, retorna `null`.

---

### `PUT /api/books/:id/progress`

**Body:**
```json
{
  "currentPage": 88,
  "scrollOffset": 0.0
}
```

**Response `200`:** progress actualizado

---

### `GET /api/books/:id/annotations/export`

**Query params:**

| Param | Tipo | Default |
|---|---|---|
| `format` | string | `markdown` |

**Response `200`:**
```
Content-Type: text/markdown
Content-Disposition: attachment; filename="{title}-annotations.md"
```

---

### Manejo de errores

Todos los errores siguen este formato:

```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "No book found with id: abc-123"
  }
}
```

| Código HTTP | Código de error | Descripción |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body inválido o params incorrectos |
| 403 | `PATH_TRAVERSAL` | Intento de acceder fuera de BOOKS_DIR |
| 404 | `BOOK_NOT_FOUND` | Libro no existe en BD |
| 404 | `FILE_NOT_FOUND` | Archivo PDF no encontrado en disco |
| 404 | `ANNOTATION_NOT_FOUND` | Anotación no existe |
| 500 | `INTERNAL_ERROR` | Error inesperado del servidor |

### Manejo de errores en el frontend (Sonner)

Todos los errores que ocurran durante la interacción del usuario se muestran mediante **toasts de Sonner** (`sonner`) con mensajes detallados y accionables. El componente `<Toaster />` se monta en el root de la app.

**Reglas de notificación:**

| Tipo | Variante Sonner | Duración | Ejemplo |
|---|---|---|---|
| Error de red / API | `toast.error()` | 5s | "No se pudo guardar el resaltado. Verifica tu conexión e intenta de nuevo." |
| Validación de input | `toast.error()` | 4s | "El texto seleccionado excede los 2000 caracteres permitidos." |
| Acción exitosa | `toast.success()` | 3s | "Anotación eliminada correctamente." |
| Advertencia | `toast.warning()` | 4s | "El archivo PDF no fue encontrado en disco. Puede haber sido movido o eliminado." |
| Info / progreso | `toast.info()` | 3s | "Biblioteca actualizada: 2 libros nuevos detectados." |

**Formato de mensajes de error:**

Los mensajes de error deben ser:
1. **Descriptivos:** Indicar qué operación falló ("No se pudo guardar el resaltado")
2. **Contextuales:** Incluir el motivo cuando esté disponible desde la API ("El libro no existe en la base de datos")
3. **Accionables:** Sugerir qué puede hacer el usuario ("Intenta de nuevo", "Recarga la página")

**Implementación:**

```typescript
// Ejemplo de integración con TanStack Query mutations
const createAnnotation = useMutation({
  mutationFn: (data: CreateAnnotationInput) => api.createAnnotation(bookId, data),
  onError: (error: ApiError) => {
    toast.error(error.message, {
      description: error.detail ?? "Intenta de nuevo. Si el problema persiste, recarga la página.",
    });
    // Rollback del optimistic update
  },
  onSuccess: () => {
    toast.success("Resaltado guardado");
  },
});
```

**Mapeo de errores API → mensajes de usuario:**

| Código de error | Mensaje al usuario |
|---|---|
| `VALIDATION_ERROR` | Se muestra el detalle de validación recibido del server |
| `BOOK_NOT_FOUND` | "El libro no fue encontrado. Puede haber sido eliminado de la biblioteca." |
| `FILE_NOT_FOUND` | "El archivo PDF no se encontró en disco. Verifica que no haya sido movido o eliminado." |
| `ANNOTATION_NOT_FOUND` | "La anotación ya no existe. Puede haber sido eliminada en otra sesión." |
| `PATH_TRAVERSAL` | "Acceso denegado al archivo solicitado." |
| `INTERNAL_ERROR` | "Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde." |
| Error de red (fetch fail) | "No se pudo conectar con el servidor. Verifica tu conexión." |

---

## 8. Especificaciones de UI

### Layout General del Lector

```
┌─────────────────────────────────────────────────────────────┐
│                       TOOLBAR (56px)                         │
│  ← Biblioteca  |  Título del libro  |  [FileText] 87/320  |  [Search]  [ZoomIn][ZoomOut]  │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  LEFT PANEL  │       PDF CANVAS             │  RIGHT PANEL  │
│  (280px)     │       (flexible)             │  (300px)      │
│              │                              │               │
│  • TOC       │  ┌──────────────────────┐   │  Anotaciones  │
│  • Páginas   │  │                      │   │  del libro    │
│              │  │    PDF renderizado   │   │               │
│              │  │    + highlight layer │   │  ─────────    │
│              │  │                      │   │  Pág. 87      │
│              │  └──────────────────────┘   │  > "texto..." │
│              │                              │  Nota: ...    │
└──────────────┴──────────────────────────────┴───────────────┘
```

### Paleta de colores del sistema

```
Fondo app:       #F5F5F7  (similar macOS)
Fondo sidebar:   #FAFAFA
Bordes:          #E0E0E0
Texto principal: #1D1D1F
Texto secundario:#6E6E73
Acento:          #0071E3  (azul Apple)

Highlights:
  Amarillo:  #FFF176  (texto en #5D4037)
  Verde:     #A5D6A7  (texto en #1B5E20)
  Azul:      #90CAF9  (texto en #0D47A1)
  Rosa:      #F48FB1  (texto en #880E4F)
```

### Flujo de Resaltado — Estados

```
ESTADO 1: El usuario selecciona texto con el cursor
          → window.getSelection() tiene rango activo

ESTADO 2: HighlightPopover aparece anclado sobre la selección
          → Muestra 4 círculos de color + icono nota
          → Si se mueve sin elegir color: popover desaparece

ESTADO 3: Usuario hace clic en un color
          → Optimistic update: highlight se pinta inmediatamente
          → POST /api/books/:id/annotations se lanza en background
          → Si POST falla: highlight se revierte y se muestra toast de error

ESTADO 4: (Opcional) Usuario abre campo de nota
          → Textarea se expande dentro del popover
          → Botón "Guardar nota" → PATCH /api/annotations/:id

ESTADO 5: Clic sobre highlight existente
          → Popover muestra: texto, nota (si existe), opciones de color, botón eliminar
```

### Keyboard Shortcuts

| Atajo | Acción |
|---|---|
| `J` / `K` | Página siguiente / anterior |
| `Ctrl + F` | Abrir búsqueda en PDF |
| `Esc` | Cerrar búsqueda / cerrar paneles |
| `Ctrl + [` | Toggle sidebar izquierdo |
| `Ctrl + ]` | Toggle sidebar derecho |
| `Ctrl + +` / `Ctrl + -` | Zoom in / out |
| `G + número` | Ir a página específica |
| `F` | Toggle pantalla completa |

---

## 9. Criterios de Aceptación por Feature

### Feature: Escaneo de biblioteca

```
Dado que BOOKS_DIR = /home/user/books y contiene 3 PDFs
Cuando el servidor inicia
Entonces los 3 libros aparecen en GET /api/library

Dado que se añade un nuevo PDF a /home/user/books
Cuando el watcher lo detecta (máx. 2 segundos)
Entonces el nuevo libro aparece en la biblioteca sin recargar la página

Dado que un PDF es eliminado del directorio
Cuando el watcher lo detecta
Entonces el libro desaparece de la biblioteca
Y sus anotaciones se eliminan en cascada (onDelete: Cascade)

Dado que el directorio contiene un archivo que no es PDF (ej: .DS_Store)
Cuando el scanner corre
Entonces ese archivo es ignorado y no aparece en la biblioteca
```

### Feature: Resaltado y persistencia

```
Dado que el usuario está en la página 42 de un libro
Cuando selecciona el texto "machine learning" y elige color amarillo
Entonces el texto queda resaltado en amarillo inmediatamente (optimistic)
Y la anotación se persiste en la BD con pageNumber=42, color="yellow"
Y la posición se guarda como rects normalizados entre 0 y 1

Dado que el usuario cierra el libro y lo vuelve a abrir en la página 42
Cuando la página 42 se renderiza
Entonces los highlights guardados se pintan sobre el texto correspondiente
Con los colores correctos

Dado que el usuario hace clic en un highlight existente y elige "Eliminar"
Cuando confirma la eliminación
Entonces el highlight desaparece visualmente
Y DELETE /api/annotations/:id retorna 204
Y la anotación ya no aparece en el panel de anotaciones

Dado que POST /api/annotations falla por error de red
Cuando el optimistic update fue aplicado
Entonces el highlight se revierte visualmente
Y aparece un toast de error "No se pudo guardar el resaltado. Intenta de nuevo."
```

### Feature: Progreso de lectura

```
Dado que el usuario está leyendo el libro en la página 55
Cuando han pasado 5 segundos desde el último guardado automático
Entonces PUT /api/books/:id/progress se llama con currentPage=55

Dado que el usuario cierra el libro y lo vuelve a abrir
Cuando el visor carga
Entonces GET /api/books/:id/progress retorna currentPage=55
Y el visor navega automáticamente a la página 55

Dado que el usuario llega a la última página del libro
Cuando el visor detecta currentPage === totalPages
Entonces isFinished se actualiza a true automáticamente
Y en la biblioteca el libro aparece con badge "Terminado"
```

### Feature: Exportar anotaciones

```
Dado que el libro "Clean Code" tiene 5 anotaciones en 3 páginas diferentes
Cuando el usuario hace clic en "Exportar anotaciones"
Entonces se descarga un archivo "Clean Code-annotations.md"
Con las anotaciones agrupadas por página en orden ascendente
En el formato especificado en RF-04.4
```

### Feature: Anotaciones aleatorias en página principal

```
Dado que existen 20 anotaciones distribuidas en 5 libros
Cuando el usuario visita la página principal de la biblioteca
Entonces se muestra la sección "Redescubre tus notas" con entre 3 y 6 tarjetas
Y cada tarjeta muestra: texto resaltado, color del highlight, título del libro, autor y portada

Dado que el usuario hace clic en una tarjeta de anotación aleatoria
Cuando la navegación ocurre
Entonces se abre el libro correspondiente en la página del highlight

Dado que no existen anotaciones en la biblioteca
Cuando el usuario visita la página principal
Entonces la sección "Redescubre tus notas" no se muestra

Dado que el usuario recarga la página principal
Cuando las anotaciones aleatorias se cargan
Entonces el orden de las tarjetas puede ser diferente al anterior
```

### Feature: Edición de metadata del libro

```
Dado que el usuario abre la vista de edición de un libro
Cuando modifica el título a "Mi título personalizado" y guarda
Entonces el título se actualiza en la tarjeta de la biblioteca
Y se muestra un toast de éxito "Metadata actualizada"

Dado que el usuario sube una imagen JPG como portada
Cuando la imagen es válida (< 2MB, formato correcto)
Entonces la portada del libro se reemplaza con la imagen subida
Y el thumbnail anterior por defecto se mantiene como respaldo

Dado que el usuario hace clic en "Restaurar portada original"
Cuando se confirma la acción
Entonces la portada vuelve al thumbnail de la primera página del PDF
Y la imagen personalizada se elimina del cache

Dado que un libro recién escaneado no tiene metadata editada
Cuando se muestra en la biblioteca
Entonces el título es el nombre del archivo (sin extensión)
Y el autor es null (no se muestra)
Y la portada es el thumbnail de la primera página del PDF

Dado que el usuario sube una imagen > 2MB como portada
Cuando intenta guardarla
Entonces se muestra un toast.error "La imagen no debe superar los 2MB"
Y la portada no cambia
```

---

## 10. Plan de Desarrollo por Fases

### Fase 01 — MVP Core Reader `(2–3 semanas)`

**Objetivo:** App funcional mínima. Se puede leer un PDF, resaltar y el highlight persiste.

**Setup inicial:**
- [ ] Crear monorepo con carpetas `client/` y `server/`
- [ ] `client/`: Vite + React + Tailwind + TanStack Query + Zustand
- [ ] `server/`: Express + Prisma + SQLite
- [ ] Variables de entorno: `BOOKS_DIR`, `DATABASE_URL`, `PORT`
- [ ] Script `npm run dev` que levanta ambos con concurrently

**Backend:**
- [ ] `LibraryScanner`: recorre `BOOKS_DIR`, extrae metadata básica con `pdf-parse`, inserta en BD
- [ ] `GET /api/library`: lista libros con progreso
- [ ] `GET /api/books/:id/file`: sirve PDF con Range headers
- [ ] `GET /api/books/:id/annotations`: fetch anotaciones por libro
- [ ] `POST /api/books/:id/annotations`: crear anotación con validación
- [ ] `DELETE /api/annotations/:id`: eliminar anotación
- [ ] `PUT /api/books/:id/progress`: guardar progreso

**Frontend:**
- [ ] `LibraryView`: grid de tarjetas con nombre, páginas y botón "Abrir"
- [ ] `ReaderView`: layout de 3 columnas (sidebars colapsables)
- [ ] `PDFViewer`: renderiza PDF con react-pdf, scroll continuo
- [ ] `HighlightLayer`: canvas overlay sobre el PDF
- [ ] `HighlightPopover`: aparece al seleccionar texto, muestra paleta de colores
- [ ] `useHighlights` hook: gestiona highlights con optimistic updates (TanStack Query)
- [ ] `AnnotationPanel`: lista de anotaciones del libro activo
- [ ] Auto-save de progreso cada 5 segundos

**Tests de humo (manuales):**
- [ ] Abrir 3 PDFs distintos
- [ ] Crear un highlight en cada color
- [ ] Cerrar y reabrir: verificar que el highlight persiste
- [ ] Navegar a la última página guardada al reabrir

---

### Fase 02 — Library UI `(1–2 semanas)`

**Objetivo:** La biblioteca se ve y siente como macOS Books.

- [ ] Generación de thumbnails: `POST /api/library/scan` genera PNG de página 1 usando `pdf-poppler` o `pdfjs-dist` en Node
- [ ] `BookCard`: thumbnail, título, barra de progreso, botón favorito
- [ ] Filtros en frontend: Todos / Recientes / Favoritos / En progreso / Terminados
- [ ] `SearchBar` con debounce 300ms, filtrado por título y nombre de archivo
- [ ] Toggle: vista grid / vista lista
- [ ] Watcher con chokidar: actualizaciones en tiempo real via SSE o WebSocket básico
- [ ] Badge "Terminado" cuando `isFinished = true`

---

### Fase 03 — Reader Avanzado `(2 semanas)`

**Objetivo:** El lector tiene paridad funcional con apps nativas.

- [ ] TOC (tabla de contenidos): extraída del PDF con PDF.js `getOutline()`
- [ ] Miniaturas de páginas en sidebar
- [ ] Modo oscuro para el lector (invertir colores del PDF con CSS filter)
- [ ] Búsqueda full-text dentro del PDF (`pdfjs.getTextContent()`)
- [ ] Notas en highlights: textarea en el popover, PATCH al guardar
- [ ] Panel de anotaciones completo: agrupado por página, con nota visible
- [ ] Exportar anotaciones como Markdown: `GET /api/books/:id/annotations/export`
- [ ] Keyboard shortcuts (ver sección 8)
- [ ] `PageNavigator`: input de número de página en toolbar

---

### Fase 04 — Polish & Production `(1–2 semanas)`

**Objetivo:** App lista para uso diario, dockerizada.

- [ ] Migrar de SQLite a PostgreSQL
- [ ] Virtualización de páginas con `react-virtual` para PDFs > 500 páginas
- [ ] Toast notifications (éxito/error en operaciones)
- [ ] Loading skeletons en biblioteca y al abrir PDF
- [ ] Docker & Docker Compose (ver sección de infraestructura abajo)
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] Test E2E con Playwright: flujo completo highlight → persistencia
- [ ] README con instrucciones de setup en 3 comandos

#### Infraestructura Docker

El proyecto se ejecuta completamente con Docker Compose. La configuración incluye:

**Servicios:**

| Servicio | Imagen base | Puerto | Descripción |
|---|---|---|---|
| `client` | `node:20-alpine` | 5173 | Frontend Vite dev server (dev) o Nginx con build estático (prod) |
| `server` | `node:20-alpine` | 3000 | Backend Express + Prisma |
| `db` | `postgres:16-alpine` | 5432 | Base de datos PostgreSQL |

**Volúmenes:**

| Volumen | Mount | Descripción |
|---|---|---|
| `pgdata` | `/var/lib/postgresql/data` | Datos persistentes de PostgreSQL |
| bind mount | `${BOOKS_DIR}:/books:ro` | Directorio de PDFs del host (solo lectura) |
| bind mount | `./cache:/app/cache` | Cache de thumbnails |

**Flujo de desarrollo:**

```bash
# Levantar todo el stack
docker compose up -d

# Ver logs
docker compose logs -f server

# Ejecutar migraciones de Prisma
docker compose exec server npx prisma migrate dev

# Detener
docker compose down
```

**Flujo de producción:**

```bash
# Build y levantar en modo producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

El `Dockerfile` del server usa multi-stage build:
1. **Stage `deps`:** Instala dependencias
2. **Stage `build`:** Compila TypeScript y genera Prisma client
3. **Stage `runtime`:** Imagen final mínima con solo artefactos de producción

El `Dockerfile` del client usa multi-stage build:
1. **Stage `build`:** Ejecuta `vite build`
2. **Stage `runtime`:** Nginx alpine sirviendo los archivos estáticos

---

## 11. Decisiones Técnicas y ADRs

### ADR-01: react-pdf vs pdfjs-dist directo

**Decisión:** Usar `react-pdf` (wrapper de PDF.js para React)

**Contexto:** react-pdf abstrae el setup de PDF.js y provee componentes `<Document>` y `<Page>`. Usar PDF.js directo da más control pero requiere más boilerplate.

**Consecuencias:** Se acepta la limitación de que el canvas de PDF.js y nuestro canvas de highlights deben estar sincronizados manualmente. Se crea un `HighlightLayer` que se superpone sobre cada `<Page>` con `position: absolute`.

---

### ADR-05: Lucide Icons en lugar de emojis

**Decisión:** Usar `lucide-react` como librería de iconos. No se usan emojis en la UI.

**Contexto:** Los emojis se renderizan diferente entre sistemas operativos y navegadores, generando inconsistencias visuales. Lucide provee iconos SVG consistentes, con soporte de tree-shaking para mantener el bundle ligero.

**Consecuencias:** Todos los iconos de la interfaz (toolbar, botones, navegación, estados) usan componentes de `lucide-react`. Los iconos relevantes incluyen: `ArrowLeft`, `Search`, `ZoomIn`, `ZoomOut`, `FileText`, `BookOpen`, `Star`, `Trash2`, `Download`, `ChevronLeft`, `ChevronRight`, `PanelLeftClose`, `PanelRightClose`, `Highlighter`, `StickyNote`, entre otros.

---

### ADR-06: Docker como entorno de ejecución estándar

**Decisión:** El proyecto se ejecuta mediante Docker y Docker Compose tanto en desarrollo como en producción.

**Contexto:** Asegurar reproducibilidad del entorno (Node.js, PostgreSQL, dependencias del sistema para PDF rendering) sin requerir instalación manual.

**Consecuencias:** Se requiere Docker instalado en la máquina del desarrollador. El `docker-compose.yml` orquesta client, server y PostgreSQL. En desarrollo se montan volúmenes para hot-reload; en producción se usan multi-stage builds optimizados.

---

### ADR-07: Sonner para sistema de toasts y alertas

**Decisión:** Usar `sonner` como librería de toasts para todas las notificaciones al usuario.

**Contexto:** Se necesita un sistema de notificaciones para comunicar errores detallados, confirmaciones y advertencias. Sonner provee una API simple (`toast.error()`, `toast.success()`, etc.), soporta stacking, es accesible (ARIA), animado y ligero.

**Consecuencias:** Todos los errores de interacción del usuario se muestran con mensajes descriptivos, contextuales y accionables a través de Sonner. No se usan `alert()`, `console.error()` ni banners manuales para comunicar errores al usuario. El componente `<Toaster />` se monta una sola vez en el root layout.

---

### ADR-02: Coordenadas normalizadas para highlights

**Decisión:** Guardar posiciones de highlights normalizadas (0–1) en lugar de píxeles absolutos.

**Contexto:** El usuario puede cambiar el zoom del PDF. Si guardamos píxeles absolutos al zoom actual, el highlight aparecerá desplazado cuando el usuario cambie el zoom.

**Consecuencias:** Al renderizar, multiplicamos los valores normalizados por las dimensiones del canvas actual. Esto agrega un paso de conversión pero hace los highlights estables ante cualquier zoom.

---

### ADR-03: SQLite en desarrollo, PostgreSQL en producción

**Decisión:** Usar SQLite con Prisma en desarrollo y PostgreSQL en producción.

**Contexto:** SQLite es zero-config, lo que acelera el onboarding. El campo `positionData` es `TEXT` en SQLite y `JSONB` en PostgreSQL. Prisma abstrae ambos mediante el tipo `Json`.

**Consecuencias:** Los índices sobre `JSONB` en producción mejoran el performance en queries de anotaciones por posición. En desarrollo se usa JSON serializado.

---

### ADR-04: Optimistic updates para highlights

**Decisión:** Pintar el highlight inmediatamente en el canvas y persistir en background con TanStack Query.

**Contexto:** La latencia de la llamada API (incluso en localhost) crea una fricción perceptible si esperamos confirmación antes de pintar.

**Consecuencias:** Se implementa rollback automático si el POST falla. Se muestra un toast de error al usuario. Se acepta la complejidad añadida de manejar el estado "pendiente" del highlight.

---

## 12. Plan de Tests

Esta sección define los tests que el agente debe ejecutar para validar cada feature. Todos los tests deben pasar antes de considerar una fase como completada.

### 12.1 Tests unitarios (Vitest)

**Backend — Servicios:**

```
TEST-B01: LibraryScanner
  ✓ Escanea un directorio con 3 PDFs y retorna 3 registros
  ✓ Ignora archivos que no son .pdf (.DS_Store, .txt, .epub)
  ✓ Detecta PDFs nuevos en un re-escaneo y los añade
  ✓ Marca como eliminados los PDFs que ya no existen en disco
  ✓ No duplica registros si el mismo PDF ya está en la BD (upsert por filePath)
  ✓ Permite PDFs con el mismo fileName en carpetas distintas (fileName no es unique)
  ✓ Calcula campo folder como ruta relativa al BOOKS_DIR
  ✓ PDFs en la raíz de BOOKS_DIR tienen folder = ""
  ✓ PDFs en subcarpetas tienen folder = "NombreCarpeta"
  ✓ PDFs en subcarpetas anidadas tienen folder = "Carpeta/Subcarpeta"
  ✓ Scans concurrentes no colisionan (mutex scanning)
  ✓ El flag scanning se resetea incluso si hay error (try/finally)

TEST-B02: Validaciones de API
  ✓ POST /api/books/:id/annotations rechaza pageNumber <= 0
  ✓ POST /api/books/:id/annotations rechaza selectedText vacío
  ✓ POST /api/books/:id/annotations rechaza selectedText > 2000 caracteres
  ✓ POST /api/books/:id/annotations rechaza color no válido
  ✓ POST /api/books/:id/annotations rechaza rects con valores fuera de 0-1
  ✓ POST /api/books/:id/annotations acepta note: null (nullish)
  ✓ POST /api/books/:id/annotations acepta note: undefined (nullish)
  ✓ PATCH /api/annotations/:id rechaza color no válido
  ✓ PATCH /api/annotations/:id acepta note: null (nullish)
  ✓ PUT /api/books/:id/progress rechaza currentPage <= 0

TEST-B03: Seguridad — Path traversal
  ✓ GET /api/books/:id/file retorna 403 si filePath contiene ../
  ✓ GET /api/books/:id/file retorna 403 si filePath apunta fuera de BOOKS_DIR
  ✓ GET /api/books/:id/file retorna 403 con symlinks que escapan BOOKS_DIR

TEST-B04: Servicio de anotaciones
  ✓ Crear anotación retorna el objeto completo con id generado
  ✓ Listar anotaciones por libro las retorna agrupables por página
  ✓ Eliminar anotación retorna 204 y ya no aparece en listado
  ✓ Actualizar nota y color persiste los cambios correctamente
  ✓ Eliminar libro elimina sus anotaciones en cascada

TEST-B05: Progreso de lectura
  ✓ PUT crea progreso si no existe
  ✓ PUT actualiza progreso existente
  ✓ GET retorna null si el libro nunca fue abierto
  ✓ isFinished se marca true cuando currentPage === totalPages

TEST-B06: Anotaciones aleatorias
  ✓ GET /api/annotations/random retorna entre 0 y limit anotaciones
  ✓ Cada anotación incluye book.id, book.title, book.author y book.coverUrl
  ✓ Retorna arreglo vacío si no hay anotaciones en la BD
  ✓ Respeta el parámetro limit (máx. 10)
  ✓ Las anotaciones provienen de libros distintos cuando es posible

TEST-B07: Edición de metadata
  ✓ PATCH /api/books/:id actualiza title correctamente
  ✓ PATCH /api/books/:id actualiza author correctamente
  ✓ PATCH /api/books/:id actualiza description correctamente
  ✓ PATCH /api/books/:id rechaza title vacío
  ✓ PATCH /api/books/:id rechaza title > 500 caracteres
  ✓ PATCH /api/books/:id rechaza author > 200 caracteres
  ✓ PATCH /api/books/:id rechaza description > 2000 caracteres
  ✓ PATCH /api/books/:id retorna 404 si el libro no existe

TEST-B08: Portada personalizada
  ✓ POST /api/books/:id/cover acepta JPG y redimensiona a 400×560
  ✓ POST /api/books/:id/cover acepta PNG
  ✓ POST /api/books/:id/cover acepta WebP
  ✓ POST /api/books/:id/cover rechaza archivos > 2MB
  ✓ POST /api/books/:id/cover rechaza archivos que no son imagen
  ✓ DELETE /api/books/:id/cover restaura thumbnail por defecto
  ✓ DELETE /api/books/:id/cover elimina imagen personalizada del cache
  ✓ coverUrl resuelve customCoverPath cuando existe, thumbnailPath cuando no

TEST-B09: Navegación por carpetas
  ✓ GET /api/library sin param folder retorna libros de la raíz y lista de subcarpetas
  ✓ GET /api/library?folder=Literatura retorna solo libros con folder="Literatura"
  ✓ GET /api/library?folder=Software%20%26%20Tech maneja nombres con caracteres especiales
  ✓ Subcarpetas se calculan correctamente (hijos inmediatos, no nietos)
  ✓ GET /api/library?folder=CarpetaInexistente retorna books=[] y folders=[]
  ✓ Filtro "favorites" ignora folder y busca en toda la biblioteca
  ✓ Filtro "recent" ignora folder y busca en toda la biblioteca
  ✓ Filtro "in-progress" ignora folder y busca en toda la biblioteca
  ✓ Filtro "finished" ignora folder y busca en toda la biblioteca
  ✓ Búsqueda por texto ignora folder y busca en toda la biblioteca
  ✓ Response incluye currentFolder con el valor del param recibido
  ✓ Cada BookResponse incluye campo folder con su ruta relativa
```

**Frontend — Hooks y utilidades:**

```
TEST-F01: useHighlights hook
  ✓ Retorna highlights del libro activo agrupados por página
  ✓ Optimistic update añade highlight antes de respuesta del server
  ✓ Rollback remueve highlight si el POST falla
  ✓ Muestra toast.error con mensaje detallado cuando falla

TEST-F02: Conversión de coordenadas
  ✓ Normaliza rectángulos de píxeles a valores 0-1
  ✓ Desnormaliza valores 0-1 a píxeles según zoom actual
  ✓ Mantiene posición correcta al cambiar zoom de 100% a 200%

TEST-F03: Exportación Markdown
  ✓ Genera markdown con formato correcto según RF-04.4
  ✓ Agrupa anotaciones por página en orden ascendente
  ✓ Incluye notas cuando existen, las omite cuando no

TEST-F04: Mapeo de errores
  ✓ Transforma BOOK_NOT_FOUND en mensaje descriptivo para el usuario
  ✓ Transforma VALIDATION_ERROR mostrando el detalle del server
  ✓ Transforma errores de red en mensaje de conexión
  ✓ Transforma INTERNAL_ERROR en mensaje genérico accionable

TEST-F05: useTextSelection hook
  ✓ Retorna selectedText, selectionRects y pageNumber al seleccionar texto
  ✓ pageWidth y pageHeight usan dimensiones originales del PDF (no del DOM con zoom)
  ✓ selectionRects están normalizados entre 0 y 1
  ✓ clearSelection limpia todos los estados y remueve la selección del browser
  ✓ No se activa al hacer clic sin seleccionar texto

TEST-F06: Navegación por carpetas (store + API)
  ✓ currentFolder inicia en "" (raíz)
  ✓ setFolder actualiza currentFolder
  ✓ getLibrary envía param folder cuando no está vacío
  ✓ getLibrary retorna { books, folders, currentFolder, total }
```

### 12.2 Tests de integración (Vitest + Supertest)

```
TEST-I01: Flujo completo de anotaciones
  ✓ Crear libro → crear anotación → listar → verificar que aparece
  ✓ Crear anotación → actualizar nota → verificar cambio
  ✓ Crear anotación → eliminar → listar → verificar que no aparece

TEST-I02: Flujo de biblioteca
  ✓ Escanear directorio → GET /api/library retorna libros encontrados
  ✓ POST /api/library/scan después de añadir PDF → libro nuevo aparece
  ✓ Filtrar por favoritos retorna solo libros marcados
  ✓ PDFs con mismo nombre en carpetas distintas coexisten sin conflicto

TEST-I03: Flujo de progreso
  ✓ Abrir libro → guardar progreso → cerrar → reabrir → progreso restaurado
  ✓ Llegar a última página → isFinished se marca automáticamente

TEST-I04: Exportación
  ✓ GET /api/books/:id/annotations/export retorna markdown válido
  ✓ Content-Type es text/markdown
  ✓ Content-Disposition incluye nombre del libro

TEST-I05: Flujo de metadata y portada
  ✓ Crear libro → editar título y autor → GET /api/library muestra datos actualizados
  ✓ Subir portada personalizada → GET libro retorna coverUrl apuntando a imagen custom
  ✓ Eliminar portada personalizada → GET libro retorna coverUrl apuntando a thumbnail por defecto
  ✓ Crear libro sin editar → coverUrl apunta a thumbnail de página 1

TEST-I06: Anotaciones aleatorias
  ✓ Crear 10 anotaciones en 3 libros → GET /api/annotations/random retorna anotaciones con metadata de libro
  ✓ Eliminar todas las anotaciones → GET /api/annotations/random retorna arreglo vacío

TEST-I07: Navegación por carpetas
  ✓ Escanear directorio con subcarpetas → libros tienen folder correcto
  ✓ GET /api/library → retorna subcarpetas de la raíz
  ✓ GET /api/library?folder=Carpeta → retorna solo libros de esa carpeta
  ✓ GET /api/library?folder=Carpeta → retorna subcarpetas de Carpeta
  ✓ Re-scan actualiza folder de libros existentes
  ✓ Buscar texto → retorna libros de todas las carpetas
```

### 12.3 Tests E2E (Playwright)

```
TEST-E01: Biblioteca
  ✓ La página carga y muestra carpetas del directorio configurado
  ✓ Clic en carpeta muestra los libros y subcarpetas de esa carpeta
  ✓ Breadcrumb muestra la ruta actual (Biblioteca > Carpeta > Subcarpeta)
  ✓ Clic en segmento del breadcrumb navega a esa carpeta
  ✓ Carpetas no se muestran cuando hay un filtro activo (Favoritos, Recientes, etc.)
  ✓ Carpetas no se muestran cuando hay búsqueda activa
  ✓ La búsqueda filtra libros por nombre en tiempo real (todas las carpetas)
  ✓ Los filtros (Todos, Favoritos, En progreso) funcionan correctamente
  ✓ Marcar/desmarcar favorito actualiza la UI

TEST-E02: Lector de PDF
  ✓ Clic en un libro abre el visor con el PDF renderizado
  ✓ El scroll navega entre páginas y actualiza el contador
  ✓ Zoom in/out cambia el tamaño del PDF renderizado
  ✓ El botón de regreso vuelve a la biblioteca

TEST-E03: Resaltado completo
  ✓ Seleccionar texto → elegir color → highlight aparece pintado
  ✓ Cerrar libro → reabrir → highlight persiste en la posición correcta
  ✓ Clic en highlight existente → cambiar color → color se actualiza
  ✓ Clic en highlight existente → eliminar → highlight desaparece
  ✓ Añadir nota a highlight → nota aparece en panel de anotaciones

TEST-E04: Panel de anotaciones
  ✓ Muestra todas las anotaciones del libro activo
  ✓ Clic en anotación navega a la página correspondiente
  ✓ Exportar genera y descarga archivo .md

TEST-E05: Progreso de lectura
  ✓ Leer hasta página 50 → cerrar → reabrir → visor abre en página 50
  ✓ Libro terminado muestra badge "Terminado" en biblioteca

TEST-E06: Manejo de errores visibles
  ✓ Simular fallo de red al crear highlight → toast.error aparece con mensaje descriptivo
  ✓ Simular fallo de red al guardar progreso → toast.error aparece
  ✓ Abrir libro con PDF eliminado del disco → toast.error con mensaje de archivo no encontrado

TEST-E07: Anotaciones aleatorias en página principal
  ✓ La sección "Redescubre tus notas" aparece cuando hay anotaciones
  ✓ Cada tarjeta muestra texto resaltado, color, título del libro, autor y portada
  ✓ Clic en tarjeta navega al libro en la página correcta
  ✓ La sección no se muestra cuando no hay anotaciones

TEST-E08: Edición de metadata
  ✓ Abrir edición de libro → cambiar título → título actualizado en biblioteca
  ✓ Abrir edición de libro → cambiar autor → autor visible en tarjeta
  ✓ Subir imagen como portada → portada cambia en la tarjeta del libro
  ✓ Restaurar portada original → portada vuelve al thumbnail de página 1
  ✓ Subir imagen > 2MB → toast.error con mensaje de tamaño excedido

TEST-E09: Navegación por carpetas
  ✓ La raíz muestra tarjetas de carpetas con icono Folder y nombre
  ✓ Clic en carpeta "Literatura" → muestra libros de Literatura
  ✓ Breadcrumb aparece: "Biblioteca > Literatura"
  ✓ Clic en "Biblioteca" del breadcrumb → vuelve a la raíz
  ✓ Carpetas con caracteres especiales (& en "Software & Tech") se manejan correctamente
  ✓ Vista lista muestra carpetas como filas antes de los libros
  ✓ Cambiar de grid a lista mantiene la carpeta actual
```

### 12.4 Ejecución de tests

```bash
# Tests unitarios y de integración
docker compose exec server npm run test          # Backend
docker compose exec client npm run test          # Frontend

# Tests E2E (requiere stack levantado)
docker compose exec client npx playwright test

# Todos los tests
docker compose exec server npm run test && \
docker compose exec client npm run test && \
docker compose exec client npx playwright test
```

**El agente debe ejecutar los tests después de implementar cada feature y verificar que todos pasan antes de avanzar a la siguiente.**

---

## 13. Checklist de Definition of Done

Antes de considerar cualquier feature como completada, debe cumplir:

### Código
- [ ] Funcionalidad implementada según criterios de aceptación de la sección 9
- [ ] Sin errores de TypeScript (strict mode)
- [ ] Sin warnings de ESLint
- [ ] Sin `console.log` en código de producción

### API
- [ ] Endpoint validado con Zod o librería equivalente
- [ ] Errores retornan formato estándar `{ error: { code, message } }`
- [ ] Path traversal verificado para endpoints que sirven archivos

### Frontend
- [ ] Loading state implementado (skeleton o spinner)
- [ ] Error state implementado (mensaje de error visible al usuario)
- [ ] Empty state implementado (cuando no hay datos)
- [ ] Funciona a 1024px y 1440px de ancho

### Base de Datos
- [ ] Migración de Prisma creada (`prisma migrate dev`)
- [ ] No hay queries N+1 (verificar con Prisma query log)

### Tests
- [ ] Tests unitarios relevantes escritos y pasando (Vitest)
- [ ] Tests de integración relevantes escritos y pasando (Vitest + Supertest)
- [ ] Tests E2E del flujo principal escritos y pasando (Playwright)
- [ ] Errores de usuario muestran toast de Sonner con mensaje detallado y accionable

### QA Manual
- [ ] Feature probada en Chrome
- [ ] Feature probada en Firefox
- [ ] Flujo completo verificado desde cero (BD limpia)
- [ ] No hay regresiones en features existentes

---

*Documento generado como guía de Spec Driven Development para WebBooks v1.0*
*Última actualización: Marzo 2026*
