# 📊 Sistema de Contabilidad - Guía Completa

## 🎯 ¿Qué es este sistema?

Este es un sistema completo de contabilidad para tu negocio pequeño que te permite:
- Registrar todas tus ventas diarias
- Registrar todos tus gastos/egresos
- Ver tu saldo en tiempo real (día, semana, mes, total)
- Generar reportes detallados con gráficas
- Exportar reportes a PDF
- Hacer respaldos de tus datos

**Lo mejor de todo:** Funciona completamente en tu computadora, sin necesidad de internet ni servidores complicados. Tus datos se guardan localmente en tu navegador.

---

## 🚀 Instrucciones de Instalación y Uso

### Paso 1: Descargar los archivos

Asegúrate de tener estos 4 archivos en una misma carpeta:
- `index.html`
- `estilos.css`
- `app.js`
- `README.md` (este archivo)

### Paso 2: Abrir el sistema según tu dispositivo

#### En Computadora (Windows, Mac, Linux)

1. Abre tu navegador web (Chrome, Firefox, Edge, etc.)
2. Presiona `Ctrl + O` (o `Cmd + O` en Mac) para abrir un archivo
3. Busca y selecciona el archivo `index.html`
4. ¡Listo! El sistema debería abrirse en tu navegador

**Alternativa:** También puedes hacer doble clic en el archivo `index.html` y se abrirá automáticamente.

#### En Android (Teléfono/Tablet)

1. **Preparar los archivos:**
   - Copia la carpeta completa con todos los archivos a tu teléfono
   - Puedes usar USB, Google Drive, Dropbox, o cualquier método que prefieras

2. **Abrir en Chrome:**
   - Abre la aplicación "Chrome" en tu teléfono
   - Ve a la ubicación donde copiaste los archivos
   - Toca en el archivo `index.html`
   - El sistema se abrirá en Chrome

3. **Agregar a pantalla de inicio (Recomendado):**
   - Una vez abierto el sistema, toca el menú (tres puntos) en Chrome
   - Selecciona "Agregar a pantalla de inicio" o "Instalar app"
   - Dale un nombre si quieres (ej: "Mi Contabilidad")
   - Ahora tendrás un ícono en tu pantalla de inicio
   - Cada vez que toques el ícono, el sistema se abrirá como una app

#### En iPhone/iPad

1. **Preparar los archivos:**
   - Copia la carpeta completa con todos los archivos a tu dispositivo
   - Usa iCloud Drive, AirDrop, o cualquier método

2. **Abrir en Safari:**
   - Abre la aplicación "Safari" (el navegador nativo)
   - Usa el app "Archivos" para navegar a donde copiaste los archivos
   - Toca en el archivo `index.html`
   - El sistema se abrirá en Safari

3. **Agregar a pantalla de inicio (Recomendado):**
   - En la parte inferior de Safari, toca el botón de compartir (cuadrado con flecha)
   - Desplázate y toca "Añadir a pantalla de inicio"
   - Dale un nombre si quieres (ej: "Mi Contabilidad")
   - Toca "Añadir"
   - Ahora tendrás un ícono en tu pantalla de inicio
   - Cada vez que toques el ícono, el sistema se abrirá como una app

### Paso 3: Verificar que el almacenamiento funciona

Al abrir el sistema, verás un indicador en la parte superior del encabezado:

- **✅ Datos guardados correctamente** - Verde = Todo funciona perfecto
- **⚠️ Usando respaldo (localStorage)** - Amarillo = Funciona pero con respaldo alternativo
- **❌ Error: No se pueden guardar datos** - Rojo = Problemas de almacenamiento

**Si ves el indicador rojo:**
- En móviles: Verifica que no estés en modo incógnito
- Verifica los permisos de almacenamiento del navegador
- Intenta cerrar y volver a abrir el navegador
- Haz respaldos frecuentes usando "Exportar Datos"

### Paso 4: Empezar a usar

Una vez abierto el sistema, verás 4 pestañas principales:
- **Dashboard:** Resumen general de tus finanzas
- **Ventas:** Para registrar ventas
- **Gastos:** Para registrar gastos
- **Reportes:** Para ver análisis y gráficas

---

## 📝 Guía de Uso Detallada

### 💰 Registrar una Venta

1. Haz clic en la pestaña **"Ventas"**
2. Completa el formulario:
   - **Fecha:** Selecciona la fecha de la venta (por defecto es hoy)
   - **Descripción:** Escribe qué vendiste (ej: "Playera azul", "Consulta médica")
   - **Cantidad:** Cuántas unidades vendiste (ej: 3)
   - **Precio Unitario:** Precio de cada unidad (ej: 200.00)
   - **Total:** Se calcula automáticamente (Cantidad × Precio)
   - **Método de Pago:** Efectivo, Tarjeta o Transferencia
3. Haz clic en **"💾 Guardar Venta"**
4. Verás un mensaje de confirmación y la venta aparecerá en la tabla de abajo

**💡 Consejo:** El total se calcula automáticamente cuando escribes la cantidad y el precio.

**Ejemplo:**
- Vendiste 5 playeras a $150 cada una
- Cantidad: 5
- Precio Unitario: 150
- Total: $750.00 (automático)

---

### 💸 Registrar un Gasto

1. Haz clic en la pestaña **"Gastos"**
2. Completa el formulario:
   - **Fecha:** Selecciona la fecha del gasto (por defecto es hoy)
   - **Descripción:** Escribe qué gastaste (ej: "Renta de local", "Pago de luz")
   - **Categoría:** Selecciona el tipo de gasto:
     - Renta
     - Servicios (luz, agua, internet)
     - Inventario
     - Sueldos
     - Marketing/Publicidad
     - Mantenimiento
     - Impuestos
     - Otros
   - **Monto:** Cuánto gastaste (ej: 5000.00)
   - **Método de Pago:** Efectivo, Tarjeta o Transferencia
3. Haz clic en **"💾 Guardar Gasto"**
4. Verás un mensaje de confirmación y el gasto aparecerá en la tabla de abajo

**Ejemplo:**
- Pagaste la renta del mes: $8,000
- Descripción: "Renta de local - Enero"
- Categoría: Renta
- Monto: 8000
- Método: Transferencia

---

### 📈 Ver el Dashboard (Resumen)

El Dashboard muestra automáticamente:

1. **Ingresos del Día:** Suma de todas las ventas de hoy
2. **Gastos del Día:** Suma de todos los gastos de hoy
3. **Saldo del Día:** Ingresos - Gastos (puede ser positivo o negativo)
4. **Saldo Total:** Saldo acumulado desde que empezaste a usar el sistema
5. **Esta Semana:** Ingresos - Gastos de los últimos 7 días
6. **Este Mes:** Ingresos - Gastos del mes actual
7. **Últimas Transacciones:** Las 10 transacciones más recientes (ventas y gastos)

**💡 El Dashboard se actualiza automáticamente** cada vez que registras una venta o gasto.

---

### 📊 Generar Reportes

1. Haz clic en la pestaña **"Reportes"**
2. (Opcional) Selecciona un rango de fechas:
   - **Fecha Inicio:** Desde qué fecha quieres el reporte
   - **Fecha Fin:** Hasta qué fecha quieres el reporte
   - Si no seleccionas fechas, mostrará todos los datos
3. Haz clic en **"Generar Reporte"**

El sistema mostrará:

- **📈 Ventas por Período:**
  - Total de ventas
  - Número de ventas
  - Promedio por venta
  - Gráfica de línea con las ventas por fecha

- **💸 Gastos por Categoría:**
  - Total de gastos
  - Gráfica circular (pie chart) mostrando qué porcentaje representa cada categoría

- **💰 Ganancias Netas:**
  - Ganancia Neta = Ingresos - Egresos
  - Gráfica de barras comparando ingresos vs egresos

- **🏆 Productos Más Vendidos:**
  - Lista de los productos/servicios que más has vendido
  - Cantidad vendida y total generado

- **📅 Comparativa Mensual:**
  - Gráfica de barras mostrando ingresos y egresos de los últimos 6 meses

---

### 📥 Exportar Reporte a PDF

1. Genera un reporte (ve a la pestaña Reportes y haz clic en "Generar Reporte")
2. Haz clic en el botón **"📥 Exportar a PDF"**
3. Se descargará automáticamente un archivo PDF con:
   - Resumen general (ingresos, gastos, ganancia neta)
   - Lista de todas las ventas
   - Lista de todos los gastos
4. El archivo se guardará en tu carpeta de Descargas con un nombre como: `reporte-contabilidad-2024-01-15.pdf`

**💡 Usa esto para:** Compartir reportes con tu contador, llevar registros físicos, o presentar información a inversionistas.

---

### 💾 Respaldo de Datos

#### Exportar (Hacer Respaldo)

1. En la parte inferior de cualquier pestaña, verás la sección **"💾 Respaldo de Datos"**
2. Haz clic en **"📥 Exportar Datos"**
3. Se descargará un archivo JSON con todos tus datos
4. **¡MUY IMPORTANTE!** Guarda este archivo en un lugar seguro:
   - En otra carpeta de tu computadora
   - En una memoria USB
   - En la nube (Google Drive, Dropbox, etc.)

**💡 Recomendación:** Haz respaldo al menos una vez por semana.

#### Importar (Restaurar Respaldo)

Si por alguna razón pierdes tus datos o quieres restaurar un respaldo anterior:

1. Haz clic en **"📤 Importar Datos"**
2. Busca y selecciona el archivo JSON que exportaste anteriormente
3. Confirma que quieres importar los datos
4. Tus datos se restaurarán completamente

**⚠️ Advertencia:** Importar datos reemplazará todos los datos actuales. Asegúrate de tener un respaldo antes de importar.

---

### 🗑️ Eliminar Registros

Si te equivocaste al registrar algo:

1. Ve a la pestaña **"Ventas"** o **"Gastos"**
2. En la tabla, encuentra el registro que quieres eliminar
3. Haz clic en el botón **"🗑️ Eliminar"**
4. Confirma que quieres eliminar el registro
5. El registro desaparecerá y los saldos se actualizarán automáticamente

**⚠️ Advertencia:** Esta acción no se puede deshacer.

---

### 🗑️ Borrar Todos los Datos (Nueva Función)

Si quieres empezar desde cero o cambiar de período:

1. Ve a la sección **"🗑️ Administración de Datos"** en la parte inferior
2. Haz clic en **"🗑️ Borrar Todos los Datos"**
3. Confirma la primera advertencia
4. Confirma la segunda advertencia
5. Escribe **"CONFIRMAR"** en el último mensaje
6. Todos los datos serán eliminados permanentemente

**⚠️ ADVERTENCIA CRÍTICA:** Esta acción NO SE PUEDE DESHACER. Asegúrate de exportar tus datos antes de borrar todo.

**💡 Casos de uso:**
- Empezar un nuevo período contable (año, mes, trimestre)
- Limpiar datos de prueba
- Resolver problemas de almacenamiento corrupto

---

### 🔍 Filtrar Registros

#### Filtrar Ventas

1. En la pestaña **"Ventas"**, verás la sección de filtros
2. Selecciona una fecha específica
3. Haz clic en **"Filtrar"**
4. Solo se mostrarán las ventas de esa fecha
5. Haz clic en **"Limpiar"** para ver todas las ventas de nuevo

#### Filtrar Gastos

1. En la pestaña **"Gastos"**, verás la sección de filtros
2. Selecciona una fecha específica y/o una categoría
3. Haz clic en **"Filtrar"**
4. Solo se mostrarán los gastos que coincidan con los filtros
5. Haz clic en **"Limpiar"** para ver todos los gastos de nuevo

---

## ❓ Preguntas Frecuentes

### ¿Mis datos se guardan automáticamente?

**Sí.** Cada vez que registras una venta o gasto, se guarda automáticamente en el navegador. El sistema usa IndexedDB (más confiable) con respaldo en localStorage. Verás un indicador verde si todo funciona correctamente.

### ¿Qué pasa si cierro el navegador?

Tus datos siguen guardados. Cuando vuelvas a abrir el archivo `index.html`, todos tus datos seguirán ahí. El sistema guarda en dos lugares diferentes para mayor confiabilidad.

### ¿Mis datos están seguros?

Tus datos se guardan **localmente en tu dispositivo** usando IndexedDB y localStorage. Esto significa:
- ✅ Solo tú tienes acceso a tus datos
- ✅ No se envían a ningún servidor
- ✅ No se comparten con nadie
- ⚠️ Si borras el historial del navegador, podrías perder los datos (por eso es importante hacer respaldos)

### ¿Funciona en teléfonos móviles?

**¡Sí, ahora funciona perfectamente!** El sistema está completamente optimizado para móviles:
- Diseño responsive que se adapta a pantallas pequeñas
- IndexedDB funciona mejor que localStorage en móviles
- Puedes agregarlo a tu pantalla de inicio como una app
- Funciona en Android (Chrome) y iPhone/iPad (Safari)

**Si en tu teléfono no guarda datos:**
1. Verifica que NO estés en modo incógnito
2. Asegúrate de usar Chrome (Android) o Safari (iPhone)
3. Revisa el indicador de estado en la parte superior
4. Haz respaldos frecuentes con "Exportar Datos"

### ¿Puedo usar esto en múltiples dispositivos?

Cada dispositivo guarda sus propios datos. Si quieres usar los mismos datos en otra computadora o teléfono:
1. Exporta los datos en el primer dispositivo
2. Copia el archivo JSON al segundo dispositivo
3. Importa los datos en el segundo dispositivo

### ¿Necesito internet para usar el sistema?

**Solo la primera vez.** Necesitas internet cuando abres el sistema por primera vez porque carga las librerías de gráficas y PDF desde internet. Una vez cargadas, puedes usar el sistema sin internet (pero es mejor tener internet para que las gráficas funcionen correctamente).

### ¿Qué significa el indicador de estado?

En la parte superior verás un indicador que muestra el estado del almacenamiento:

- **✅ Verde:** IndexedDB funcionando perfectamente, guardado confiable
- **⚠️ Amarillo:** Usando localStorage como respaldo, funciona pero menos óptimo
- **❌ Rojo:** Problemas con el almacenamiento, haz respaldos frecuentes

### ¿Qué hacer si veo el indicador rojo?

1. En móviles, verifica que NO estés en modo incógnito
2. Cierra y vuelve a abrir el navegador
3. Verifica los permisos de almacenamiento
4. Haz un respaldo inmediato con "Exportar Datos"
5. Intenta hacer algunas operaciones para ver si funciona

### ¿Cómo actualizo el sistema si hay una nueva versión?

Simplemente reemplaza los archivos `index.html`, `estilos.css` y `app.js` con los nuevos. **IMPORTANTE:** Antes de reemplazar, exporta tus datos como respaldo por si acaso.

---

## 🎨 Características del Sistema

### ✅ Funcionalidades Implementadas

#### Funcionalidades Básicas
- ✅ Registro de ventas con todos los campos solicitados
- ✅ Registro de gastos por categorías
- ✅ Cálculo automático de saldos (día, semana, mes, total)
- ✅ Dashboard con resumen visual
- ✅ Tablas interactivas con todos los registros
- ✅ Filtros por fecha y categoría
- ✅ Reportes completos con gráficas
- ✅ Productos más vendidos
- ✅ Comparativa mensual
- ✅ Exportación a PDF

#### Sistema de Almacenamiento (NUEVO)
- ✅ IndexedDB como almacenamiento principal (más confiable en móviles)
- ✅ localStorage como respaldo automático
- ✅ Indicador visual de estado (verde/amarillo/rojo)
- ✅ Detección de modo incógnito y permisos bloqueados
- ✅ Mensajes de error claros si hay problemas

#### Respaldo y Administración (NUEVO)
- ✅ Sistema de respaldo (exportar/importar datos)
- ✅ Botón "Borrar Todos los Datos" con confirmación triple
- ✅ Validación de archivos JSON en importación
- ✅ Respaldo dual automático (IndexedDB + localStorage)

#### Interfaz y Experiencia (NUEVO)
- ✅ Validación de formularios
- ✅ Confirmaciones antes de eliminar
- ✅ Diseño responsive (funciona en móviles)
- ✅ Mensajes de confirmación
- ✅ Meta tags para PWA (agregar a pantalla de inicio)
- ✅ Compatible con navegadores antiguos

### 🎨 Diseño

- Colores profesionales (azul, verde, gris)
- Iconos claros para cada sección
- Diseño limpio y fácil de usar
- Botones grandes y claros
- Mensajes de confirmación visibles

---

## 🔧 Requisitos Técnicos

- **Navegador:** Cualquier navegador moderno (Chrome, Firefox, Edge, Safari)
- **Internet:** Solo necesario la primera vez para cargar librerías externas
- **Instalación:** No requiere instalación, solo abrir el archivo HTML

---

## 📞 Soporte y Solución de Problemas

### Problemas Comunes y Soluciones

#### 1. "No guarda datos en mi teléfono"

**Solución:**
- Verifica que NO estés en modo incógnito
- Usa Chrome en Android o Safari en iPhone
- Comprueba el indicador de estado en la parte superior
- Haz respaldos frecuentes con "Exportar Datos"

#### 2. "Veo el indicador rojo ❌"

**Solución:**
- En móviles, sal de modo incógnito
- Cierra y vuelve a abrir el navegador
- Verifica los permisos de almacenamiento
- Haz un respaldo inmediato con "Exportar Datos"

#### 3. "Perdí todos mis datos"

**Solución:**
- Si hiciste respaldos, usa "Importar Datos"
- Si compartes con otros dispositivos, exporta e importa
- Para evitar esto, haz respaldos semanales

#### 4. "Las gráficas no se ven"

**Solución:**
- Verifica que tengas conexión a internet
- Cierra y vuelve a abrir la pestaña "Reportes"
- Intenta en otro navegador

#### 5. "No puedo abrir el archivo en mi teléfono"

**Solución:**
- En Android: Usa un administrador de archivos (Google Files)
- En iPhone: Usa el app "Archivos" de Apple
- Asegúrate de tener todos los archivos juntos

#### 6. "Al copiar los archivos, no funciona"

**Solución:**
- Copia TODA la carpeta, no solo algunos archivos
- Mantén juntos: index.html, app.js, estilos.css
- En móviles, no los separes en subcarpetas

### Contacto para Soporte

Si encuentras algún problema o tienes preguntas:

1. **Verifica que tengas todos los archivos** en la misma carpeta
2. **Abre el archivo en un navegador moderno** (Chrome o Firefox recomendados)
3. **Revisa que tengas internet** la primera vez que abres el sistema
4. **Verifica la consola del navegador** (F12) si hay errores
5. **Lee las preguntas frecuentes** en la sección anterior

---

## 📝 Notas Importantes

1. **Haz respaldos regularmente:** Aunque los datos se guardan automáticamente, siempre es bueno tener un respaldo extra.

2. **No borres el historial del navegador sin exportar:** Si borras el historial/cache del navegador, podrías perder tus datos. Siempre exporta antes de limpiar.

3. **Usa categorías consistentes:** Para obtener mejores reportes, intenta usar las mismas categorías y descripciones similares.

4. **Fechas importantes:** El sistema usa la fecha que seleccionas, no la fecha actual automáticamente. Esto te permite registrar transacciones pasadas si olvidaste hacerlo en su momento.

---

## 🎉 ¡Listo para Empezar!

Ahora ya sabes todo lo necesario para usar el sistema. Solo sigue estos pasos:

1. ✅ Abre el archivo `index.html` en tu navegador
2. ✅ Ve a la pestaña "Ventas" y registra tu primera venta
3. ✅ Ve a la pestaña "Gastos" y registra tu primer gasto
4. ✅ Revisa el Dashboard para ver tus saldos
5. ✅ Genera tu primer reporte en la pestaña "Reportes"
6. ✅ Haz un respaldo de tus datos

**¡Éxito con tu negocio!** 🚀

