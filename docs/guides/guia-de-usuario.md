# Guia de usuario — WebBooks

WebBooks es un lector de PDFs web con una interfaz inspirada en macOS Books. Permite organizar, leer y anotar tus documentos PDF desde el navegador.

## Prerequisitos

- Tener la aplicacion corriendo localmente (ver `README.md` o usar `npm run dev` / `docker compose up`)
- Colocar archivos PDF en la carpeta configurada en `BOOKS_DIR` (por defecto `./books`)

## Biblioteca

La biblioteca es la pantalla principal. Muestra todos los PDFs detectados en tu carpeta de libros.

### 1. Escanear libros

Haz clic en el boton **Escanear** (esquina superior derecha) para detectar PDFs nuevos o eliminados en tu carpeta de libros. La aplicacion mostrara cuantos archivos se agregaron o removieron.

### 2. Filtrar libros

Usa las pestanas de filtro en la parte superior:

| Filtro | Descripcion |
|--------|-------------|
| **Todos** | Muestra todos los libros |
| **Recientes** | Libros abiertos recientemente |
| **Favoritos** | Libros marcados como favoritos |
| **En progreso** | Libros con lectura iniciada pero no terminada |
| **Terminados** | Libros que ya completaste |

### 3. Buscar libros

Usa la barra de busqueda para filtrar por titulo, autor u otros metadatos.

### 4. Cambiar vista

Alterna entre vista de **cuadricula** y vista de **lista** usando los botones junto a la barra de busqueda.

### 5. Navegar por carpetas

Si tus PDFs estan organizados en subcarpetas, la biblioteca muestra una navegacion tipo breadcrumb para entrar y salir de carpetas.

### 6. Marcar favoritos

Pasa el cursor sobre un libro y haz clic en el icono de estrella para agregarlo o quitarlo de favoritos.

### 7. Editar metadatos

Pasa el cursor sobre un libro y haz clic en el icono de lapiz para abrir el editor de metadatos. Puedes modificar:

- **Titulo** del libro
- **Autor**
- **Descripcion**
- **Portada** — subir una imagen personalizada (JPG, PNG o WebP, max 2 MB) o restaurar la original

Tambien puedes consultar la metadata original del PDF expandiendo la seccion correspondiente.

### 8. Redescubre tus notas

Si tienes anotaciones en tus libros, la seccion "Redescubre tus notas" muestra una seleccion aleatoria de tus highlights. Haz clic en cualquiera para ir directamente a esa pagina del libro.

## Lector de PDF

Haz clic en cualquier libro de la biblioteca para abrirlo en el lector.

### Barra de herramientas

La barra superior del lector contiene:

| Control | Descripcion |
|---------|-------------|
| Flecha atras | Volver a la biblioteca |
| Navegador de paginas | Ir a una pagina especifica o avanzar/retroceder |
| Modo scroll / pagina | Alternar entre desplazamiento continuo y pagina por pagina |
| Buscar | Buscar texto dentro del PDF |
| Zoom (-/+) | Ajustar el nivel de zoom (50% a 300%) |
| Panel izquierdo | Mostrar/ocultar la barra lateral izquierda |
| Panel derecho | Mostrar/ocultar la barra lateral derecha |

### Panel izquierdo

Tiene dos pestanas:

- **Contenido** — Tabla de contenido del PDF (si el documento la incluye). Haz clic en cualquier entrada para navegar a esa seccion.
- **Miniaturas** — Vista previa de todas las paginas. Haz clic en una miniatura para saltar a esa pagina.

### Panel derecho — Anotaciones

Muestra todas las anotaciones (highlights) del libro actual, agrupadas por pagina. Haz clic en cualquier anotacion para navegar a su pagina. Desde aqui puedes exportar todas tus anotaciones a un archivo Markdown.

### Crear anotaciones

1. Selecciona texto en el PDF arrastrando el cursor
2. Aparecera un popover con colores disponibles: amarillo, verde, azul y rosa
3. Haz clic en un color para crear el highlight
4. Opcionalmente, haz clic en "Anadir nota" para escribir una nota antes de seleccionar el color

### Editar anotaciones

Haz clic en un texto resaltado para abrir el editor. Desde ahi puedes:

- Cambiar el color del highlight
- Agregar o editar la nota asociada
- Eliminar la anotacion (requiere confirmacion)

### Buscar en el documento

Haz clic en el icono de busqueda o usa `Ctrl+F` / `Cmd+F` para abrir la barra de busqueda dentro del PDF.

### Atajos de teclado

| Atajo | Accion |
|-------|--------|
| `j` | Pagina siguiente |
| `k` | Pagina anterior |
| `f` | Pantalla completa |
| `Ctrl/Cmd + F` | Buscar en el documento |
| `Ctrl/Cmd + [` | Mostrar/ocultar panel izquierdo |
| `Ctrl/Cmd + ]` | Mostrar/ocultar panel derecho |
| `Ctrl/Cmd + +` | Acercar zoom |
| `Ctrl/Cmd + -` | Alejar zoom |
| `Escape` | Cerrar busqueda |

### Progreso de lectura

El progreso se guarda automaticamente mientras lees. Al reabrir un libro, la aplicacion retoma desde la ultima pagina visitada. En la biblioteca, cada libro muestra una barra de progreso con el porcentaje completado.

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| No aparecen libros | Verifica que la carpeta `BOOKS_DIR` contiene archivos `.pdf` y haz clic en "Escanear" |
| La portada no se muestra | Sube una portada manualmente desde el editor de metadatos |
| El PDF no carga | Verifica que el archivo no este corrupto abriendolo con otro lector de PDF |
| Los highlights no se guardan | Verifica que el servidor este corriendo y accesible |
