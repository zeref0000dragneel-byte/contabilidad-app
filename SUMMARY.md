# SUMMARY — Sistema de Contabilidad
## Estado general: 97% estimado de completitud (entrega estable)

## Módulos completados:
- **Multi-perfil (tesorerías):** implementado — selección/creación, barra “Tesorería activa”, cambio de perfil, datos aislados por perfil.
- **Exportaciones profesionales:** PDF (resumen + tablas de detalle), Excel (portada, hojas, gráficas), PowerPoint (portada + slides de detalle), JSON de respaldo con `schema` / `version` (`contabilidad-multi-perfil-v1`, `3.0`); título de reporte unificado (`TITULO_REPORTE`) en las tres exportaciones.
- **Persistencia por perfil:** IndexedDB `ContabilidadDB` v2 con stores `ventas_perfil_*` / `gastos_perfil_*`; respaldo localStorage; stores legacy `ventas` / `gastos` conservados.
- **Eliminación de tesorería:** modal en dos pasos, nombre exacto, opción exportar antes, log local de eliminaciones.
- **Dashboard, Ingresos, Gastos, Reportes:** `reportes.js`, `ingresos.js`, `gastos.js`; orquestación en `app.js`.
- **Validaciones robustas:** `validarIngreso` / `validarGasto` — descripción no vacía (tras trim), monto mayor que cero, fecha válida y no futura; mensajes de error concretos en toast.
- **Tests automáticos en navegador:** `tests/tests.html` — ~65+ casos: validaciones (módulos reales), PerfilManager, migración, JSON, **lógica de exportación** (período, título, pie, filtrado de registros, metadatos JSON `construirPayloadBackupJSON`), **UI** (regla modal eliminación, banner `SKIP_WAITING`, toast); versión SW; sin npm.
- **Service Worker:** v4 — caché global + runtime por perfil; limpieza de caches viejos; control de actualización (banner + `SKIP_WAITING`).
- **Accesibilidad (básica):** `role` / `aria-live` / `aria-label` en banner de actualización e instalación PWA; etiquetas en botones de lista de perfiles (Abrir/Eliminar) y “Crear nuevo perfil”; foco visible (`:focus-visible`); tamaño mínimo de toque y `font-size` en móvil (`estilos.css`).
- **Documentación:** `DEVELOPER_GUIDE.md` (incluye secciones **Accesibilidad** y **Pruebas de exportación**); comentarios de responsabilidad en módulos clave.
- **UI inicial:** pantalla de perfiles, copy formal (Oaxaca 2026).

## Módulos en progreso:
- Revisión de `console.log` residuales.
- Validación estricta al importar JSON (schema/version vs filas).
- Pruebas manuales de migración legacy en dispositivos reales.

## Módulos pendientes:
- Multiusuario remoto / cuentas.
- Sincronización en la nube.
- Integración con APIs bancarias.
- Notificaciones push.
- e2e (Playwright/Cypress) si se requiere CI.

## Decisiones de arquitectura tomadas:
- Orquestador `app.js` + módulos globales cargados por `index.html`.
- **Exportaciones:** funciones puras expuestas en `ModExportaciones` para tests (`filtrarRegistrosPorFecha`, `obtenerTextoPeriodoPdf`, `construirPayloadBackupJSON`, `TITULO_REPORTE`).
- **Service Worker:** `APP_CACHE_VERSION = '4'`; actualización vía banner + `SKIP_WAITING`.
- **Tests:** HTML + scripts del proyecto (`perfilManager`, `ingresos`, `gastos`, `exportaciones`); sin Jest.

## Lo que NO se debe tocar sin autorización:
- Contrato de objetos por registro e importación JSON.
- Claves `contabilidad_perfiles`, `contabilidad_perfil_activo`, prefijos de stores/caches.
- Lógica de migración en `perfilManager.js`.
- Flujos de borrado total y eliminación de tesorería.
- Subir `APP_CACHE_VERSION` solo coordinando despliegue.

## Deuda técnica conocida:
- Colisión teórica de IDs por `Date.now()`.
- `file://` limita PWA.
- PDF: emoji en título puede degradarse según visor.
- Tests no generan binarios PDF/xlsx/pptx; validan la misma lógica de datos y metadatos que esas rutas.

## Próximo paso concreto:
- Tras cambios en JS/CSS críticos, subir `APP_CACHE_VERSION` y probar banner + `SET_PERFIL_CACHE` al cambiar tesorería.

## Stack usado:
- HTML5, CSS3, JavaScript (ES6+)
- IndexedDB, localStorage
- Chart.js, jsPDF (+ autotable), ExcelJS, JSZip, PptxGenJS
- Service Worker, Web App Manifest (PWA)

## Accesibilidad (resumen)
- Banner de actualización: `role="status"`, `aria-live="polite"`, textos y botones con `aria-label`.
- Perfiles: `aria-label` descriptivos en Abrir, Eliminar y Crear nuevo perfil.
- Instalación PWA: región con `aria-label`; botones con `type="button"` y etiquetas.
- CSS: contraste mantenido en cabecera; foco visible; targets ≥44px y texto base 16px en móvil.

## Pruebas de exportación (resumen)
- Período y título alineados con `obtenerTextoPeriodoPdf` y `TITULO_REPORTE`.
- Filtrado de fechas = mismas filas que usarían PDF/Excel/PPTX sin filtro de reporte.
- JSON: `schema`, `version`, `perfilId`, `perfilNombre`, `exportadoEn`, totales y arrays.
