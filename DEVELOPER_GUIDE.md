# Guía para Desarrolladores — Sistema de Contabilidad PWA

## Arquitectura general

SPA en JavaScript vanilla. Sin bundler, sin frameworks. Todo se carga mediante `<script>` en `index.html`.

```
index.html          ← shell HTML + carga de scripts en orden
├── perfilManager.js ← gestión de perfiles/tesorerías y persistencia
├── ingresos.js      ← UI y lógica de ingresos (ventas)
├── gastos.js        ← UI y lógica de gastos
├── reportes.js      ← dashboard y generación de reportes en pantalla
├── exportaciones.js ← PDF, Excel, PowerPoint, JSON backup/restore
├── app.js           ← orquestador: inicialización, deps, navegación, SW
└── service-worker.js ← caché offline, versionado, banner de actualización
```

## Patrón de dependencias (deps)

Ningún módulo accede directamente a `ventas`, `gastos` ni a `IndexedDB`.
Todos reciben un objeto `deps` inyectado por `app.js` vía `crearDeps()`.

```js
// Ejemplo: guardar un ingreso
MI.guardarVenta(crearDeps());

// crearDeps() expone:
deps.getVentas()       // array en memoria
deps.setVentas(arr)    // mutación en memoria
deps.guardarVentas()   // persiste en IndexedDB + localStorage
deps.mostrarMensaje('texto', 'success|error|info')
deps.actualizarDashboard()
// ... y más helpers de formato y categorías
```

## Persistencia

| Capa | Clave / Store | Propósito |
|---|---|---|
| IndexedDB `ContabilidadDB` | `ventas_perfil_<id>` | Almacenamiento principal |
| IndexedDB `ContabilidadDB` | `gastos_perfil_<id>` | Almacenamiento principal |
| localStorage | `contabilidad_ventas_perfil_<id>` | Respaldo por si falla IDB |
| localStorage | `contabilidad_gastos_perfil_<id>` | Respaldo por si falla IDB |
| localStorage | `contabilidad_perfiles` | Lista de perfiles (JSON) |
| localStorage | `contabilidad_perfil_activo` | ID del perfil en uso |

**NO tocar:** stores legacy `ventas` / `gastos` (sin prefijo de perfil). Contienen datos históricos.

## Agregar un módulo nuevo

1. Crear `mi-modulo.js` con el patrón IIFE:
   ```js
   (function (global) {
       function miFuncion(deps) { /* ... */ }
       global.MiModulo = { miFuncion };
   })(typeof window !== 'undefined' ? window : globalThis);
   ```
2. Agregar `<script src="./mi-modulo.js"></script>` en `index.html` **antes** de `app.js`.
3. Referenciar en `app.js`: `const MM = window.MiModulo;`
4. Exponer las funciones que necesiten `deps` siguiendo el patrón existente.

## Agregar una validación de formulario

Las funciones `validarIngreso` y `validarGasto` en `ingresos.js` / `gastos.js` son el punto de entrada.
Retornan `null` si todo es válido, o un `string` con el mensaje de error.

```js
// Para agregar una nueva regla (ej: monto máximo):
function validarIngreso(fecha, descripcion, monto) {
    // ... validaciones existentes ...
    if (monto > 9999999) return 'El monto excede el límite permitido';
    return null;
}
```

Los tests en `tests/tests.html` cubren estas validaciones — agregar un caso `it(...)` por cada regla nueva.

## Service Worker — cómo versionar

Cuando se modifiquen archivos JS/CSS críticos, incrementar la versión en `service-worker.js`:

```js
const APP_CACHE_VERSION = '5'; // era '4'
```

Esto invalida los caches anteriores en la próxima visita. El banner de actualización aparecerá
automáticamente en las pestañas abiertas.

**Flujo del banner:**
1. SW nuevo se instala → queda en estado `waiting`
2. `app.js` detecta `updatefound` → `statechange: installed`
3. Se muestra el banner: "Nueva versión disponible"
4. Usuario hace clic "Actualizar ahora" → se envía `SKIP_WAITING` al SW → `window.location.reload()`

## Correr los tests

1. Servir la carpeta raíz con un servidor HTTP local (no `file://`)
2. Abrir `http://localhost:<puerto>/tests/tests.html`
3. Hacer clic en "Ejecutar todos los tests"

Los tests **no requieren** npm ni ninguna dependencia externa.

`tests/tests.html` carga en orden: `perfilManager.js`, `ingresos.js`, `gastos.js`, `exportaciones.js` y ejecuta el runner embebido.

Para agregar un test nuevo:
```js
describe('Mi módulo — descripción', () => {
    it('hace X correctamente', () => {
        const resultado = miFuncion(args);
        expect(resultado).toBe(valorEsperado);
    });
});
```

## Pruebas de exportación

No se generan archivos PDF/xlsx/pptx en la suite (evita depender del DOM de `index.html` y de descargas). En su lugar se valida la **misma lógica** que usan las exportaciones:

| Qué se prueba | Dónde está en código |
|---|---|
| Rango de fechas y texto "Período: …" | `ModExportaciones.obtenerTextoPeriodoPdf`, `filtrarRegistrosPorFecha` |
| Título del reporte unificado | `ModExportaciones.TITULO_REPORTE` |
| Metadatos del JSON de respaldo | `ModExportaciones.construirPayloadBackupJSON` → `schema`, `version`, `perfilId`, `perfilNombre`, `exportadoEn`, totales |

Si cambias el copy del pie de página en `app.js` (`TEXTO_PIE_FORMAL_EXPORT`), los tests que comparan contra un string fijo pueden requerir actualización.

## Accesibilidad

Implementación **básica** orientada a legibilidad y lectores de pantalla:

- **Banner de actualización** (`app.js`): contenedor con `role="status"`, `aria-live="polite"`, `aria-label` descriptivo; botones "Actualizar ahora" y cerrar con `aria-label`; emoji decorativo con `aria-hidden="true"` donde aplica.
- **Lista de tesorerías** (HTML generado en `app.js`): botones Abrir y Eliminar con `aria-label` que incluye el nombre de la tesorería.
- **Pantalla inicial** (`index.html`): botón "Crear nuevo perfil" con `aria-label`; bloque de instalación PWA con `role="region"` y etiquetas en botones.
- **CSS** (`estilos.css`): `:focus-visible` visible en botones e inputs; en viewports ≤768px, `font-size` base 16px en `body`, inputs de formulario a 16px (evita zoom indeseado en iOS), pestañas y botones con altura mínima ~44px para toque.

Un auditoría WCAG completa no está automatizada; para nivel AA formal habría que revisar contraste píxel a píxel y flujos con lectores reales.

## Categorías de gastos

Las categorías se almacenan en minúsculas normalizadas. Las etiquetas de visualización
se definen en `ETIQUETAS_CATEGORIA_FORMAL` en `app.js`:

```js
const ETIQUETAS_CATEGORIA_FORMAL = {
    inventario: 'Compras',
    sueldos: 'Nómina / honorarios',
    marketing: 'Publicidad'
};
```

Para agregar una categoría fija nueva, agregar la clave aquí. Las categorías personalizadas
se guardan tal cual (sin necesidad de agregarlas al mapa).

## Cosas que NO se deben modificar sin coordinación

- Contrato de objetos de registro: `{ id, fecha, descripcion, monto, metodoPago }` (ventas) y `{ id, fecha, descripcion, categoria, monto, metodoPago }` (gastos).
- Claves de localStorage: `contabilidad_perfiles`, `contabilidad_perfil_activo`, prefijos de stores.
- Lógica de migración en `perfilManager.js` — riesgo de pérdida de datos históricos.
- Flujos de eliminación (borrado total y eliminación de tesorería) — tienen confirmaciones de seguridad.
- Schema JSON de exportación: `contabilidad-multi-perfil-v1`, versión `3.0`.
