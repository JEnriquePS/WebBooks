# ADR-008: Navegación por carpetas en la biblioteca

**Estado:** Propuesto
**Fecha:** 2026-03-06

## Contexto

Los usuarios organizan sus PDFs en carpetas temáticas dentro de `BOOKS_DIR` (ej: `Programación/`, `Ciencia/`, `Novelas/`). Actualmente la biblioteca muestra todos los PDFs en una lista plana, ignorando la estructura de directorios. Esto dificulta encontrar libros cuando la colección es grande.

## Decisión

La biblioteca respetará la estructura de carpetas del directorio `BOOKS_DIR`. El usuario podrá navegar entre carpetas como un explorador de archivos, con breadcrumb para indicar la ubicación actual.

## Cambios requeridos

### Backend

**Modelo de datos (Prisma):**
- Agregar campo `folder` al modelo `Book`: ruta relativa de la carpeta respecto a `BOOKS_DIR` (`""` para raíz, `"Programación"`, `"Ciencia/Papers"`, etc.)

**Scanner (`libraryScanner.ts`):**
- Al registrar un libro, calcular `folder` como `path.relative(BOOKS_DIR, path.dirname(filePath))`
- `"."` se normaliza a `""` (raíz)

**API (`GET /api/library`):**
- Nuevo query param `folder` (string, default `""`)
- Cuando `folder` está presente, retornar solo los libros de esa carpeta exacta (no recursivo)
- Agregar al response un array `folders`: subcarpetas disponibles en la carpeta actual
- Response ampliado:
```json
{
  "books": [BookResponse],
  "folders": ["Programación", "Ciencia", "Novelas"],
  "currentFolder": "",
  "total": 42
}
```

**BookResponse:**
- Agregar campo `folder: string` al tipo

### Frontend

**Store (`libraryStore.ts`):**
- Agregar `currentFolder: string` y `setFolder(folder: string)` al estado

**API client (`api.ts`):**
- Agregar param `folder` a `getLibrary()`

**BookGrid:**
- Antes de las tarjetas de libros, mostrar tarjetas de carpetas (icono `Folder`, nombre, cantidad de libros)
- Clic en carpeta → `setFolder(folder)`

**LibraryView:**
- Agregar breadcrumb debajo del header: `Biblioteca > Programación > React`
- Cada segmento es clickeable para navegar hacia arriba
- Botón "Atrás" visible cuando no se está en la raíz

### Comportamiento

- Los filtros (Favoritos, Recientes, etc.) buscan en **todas** las carpetas (ignoran `currentFolder`)
- La búsqueda por texto busca en **todas** las carpetas
- Solo la vista "Todos" sin búsqueda respeta la navegación por carpetas

## Consecuencias

- El campo `folder` es derivado del `filePath` y se calcula automáticamente durante el escaneo
- No se permite mover libros entre carpetas desde la app (el usuario lo hace desde el sistema de archivos)
- La navegación es sencilla y familiar (tipo Finder/Explorer)
- Los filtros globales siguen funcionando sin fricción
