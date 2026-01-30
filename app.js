// ============================================
// SISTEMA DE CONTABILIDAD - LÓGICA PRINCIPAL
// ============================================

// Variables globales para almacenar datos
let ventas = [];
let gastos = [];

// Configuración de almacenamiento
const DB_NAME = 'ContabilidadDB';
const DB_VERSION = 1;
const STORE_VENTAS = 'ventas';
const STORE_GASTOS = 'gastos';

// Claves para localStorage (respaldo)
const STORAGE_VENTAS = 'contabilidad_ventas';
const STORAGE_GASTOS = 'contabilidad_gastos';

// Estado del almacenamiento
let storageStatus = {
    indexedDB: false,
    localStorage: false,
    mode: 'unknown'
};

// ============================================
// PWA - INSTALACIÓN Y SERVICE WORKER
// ============================================

let deferredPrompt;

// Detectar evento de instalación PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    console.log('✅ Evento de instalación PWA detectado');
    
    // Mostrar banner de instalación
    const installBanner = document.getElementById('install-banner');
    if (installBanner && !window.matchMedia('(display-mode: standalone)').matches) {
        // Solo mostrar si no está ya instalada y estamos en HTTP/HTTPS
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            installBanner.style.display = 'flex';
            console.log('✅ Banner de instalación mostrado');
        } else {
            console.warn('⚠️ Banner no mostrado: requiere servidor HTTP');
        }
    }
});

// Registrar Service Worker para funcionalidad offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Solo registrar Service Worker si estamos en HTTP/HTTPS (no file://)
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => {
                    console.log('✅ Service Worker registrado:', reg.scope);
                    
                    // Verificar actualizaciones cada hora
                    setInterval(() => {
                        reg.update();
                    }, 3600000);
                })
                .catch(err => {
                    console.warn('⚠️ Error al registrar Service Worker:', err);
                    mostrarAdvertenciaServidor();
                });
        } else {
            // Si estamos en file://, mostrar advertencia
            console.warn('⚠️ Service Worker requiere servidor HTTP. Abre con servidor local.');
            mostrarAdvertenciaServidor();
        }
    });
}

// Detectar si la app ya está instalada
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ App ejecutándose en modo standalone (instalada)');
}

// Función para mostrar advertencia sobre servidor
function mostrarAdvertenciaServidor() {
    // Solo mostrar una vez
    if (localStorage.getItem('servidor_advertencia_vista')) return;
    
    setTimeout(() => {
        const mensaje = document.createElement('div');
        mensaje.id = 'advertencia-servidor';
        mensaje.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 90%;
            text-align: center;
            animation: slideDown 0.3s ease;
        `;
        mensaje.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">⚠️ Servidor Requerido</h3>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
                Para instalar la PWA, necesitas usar un servidor local.<br>
                Abre <strong>servidor-local.html</strong> para ver las instrucciones.
            </p>
            <button onclick="this.parentElement.remove(); localStorage.setItem('servidor_advertencia_vista', 'true');" 
                    style="background: white; color: #ff6b6b; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                Entendido
            </button>
        `;
        document.body.appendChild(mensaje);
        
        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }, 1000);
}

// ============================================
// INICIALIZACIÓN
// ============================================

// Cuando se carga la página, inicializar todo
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
    configurarInstalacionPWA();
});

async function inicializarApp() {
    // Inicializar almacenamiento
    await inicializarAlmacenamiento();
    
    // Cargar datos guardados
    await cargarDatos();
    
    // Configurar navegación de tabs
    configurarNavegacion();
    
    // Configurar formularios
    configurarFormularios();
    
    // Configurar botón de borrar todo
    configurarBorrarTodo();
    
    // Mostrar datos iniciales
    actualizarDashboard();
    mostrarVentas();
    mostrarGastos();
    
    // Establecer fecha actual como predeterminada en formularios (usando fecha local)
    const hoy = obtenerFechaLocal();
    document.getElementById('venta-fecha').value = hoy;
    document.getElementById('gasto-fecha').value = hoy;
    
    // Calcular total automáticamente cuando cambia cantidad o precio
    document.getElementById('venta-cantidad').addEventListener('input', calcularTotalVenta);
    document.getElementById('venta-precio').addEventListener('input', calcularTotalVenta);
    
    // Actualizar indicador de estado
    actualizarIndicadorEstado();
    
    // Verificar recordatorio de respaldo semanal
    verificarRecordatorioRespaldo();
}

// ============================================
// GESTIÓN DE ALMACENAMIENTO (IndexedDB + localStorage)
// ============================================

// Inicializar el sistema de almacenamiento
async function inicializarAlmacenamiento() {
    // Verificar IndexedDB
    if (window.indexedDB) {
        try {
            const db = await abrirIndexedDB();
            if (db) {
                storageStatus.indexedDB = true;
                storageStatus.mode = 'indexeddb';
                console.log('✅ IndexedDB disponible y funcionando');
            }
        } catch (error) {
            console.warn('⚠️ Error al inicializar IndexedDB:', error);
        }
    }
    
    // Verificar localStorage
    try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        storageStatus.localStorage = true;
        if (storageStatus.mode === 'unknown') {
            storageStatus.mode = 'localstorage';
        }
        console.log('✅ localStorage disponible y funcionando');
    } catch (error) {
        console.error('❌ localStorage no disponible:', error);
    }
}

// Abrir conexión a IndexedDB
function abrirIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Error al abrir IndexedDB:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Crear stores si no existen
            if (!db.objectStoreNames.contains(STORE_VENTAS)) {
                db.createObjectStore(STORE_VENTAS, { keyPath: 'id', autoIncrement: false });
            }
            if (!db.objectStoreNames.contains(STORE_GASTOS)) {
                db.createObjectStore(STORE_GASTOS, { keyPath: 'id', autoIncrement: false });
            }
        };
    });
}

// Obtener objeto de store de IndexedDB
function obtenerObjectStore(db, storeName, mode) {
    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
}

// Cargar datos del almacenamiento
async function cargarDatos() {
    try {
        if (storageStatus.indexedDB) {
            await cargarDesdeIndexedDB();
        } else if (storageStatus.localStorage) {
            cargarDesdeLocalStorage();
        } else {
            console.error('❌ No hay almacenamiento disponible');
            ventas = [];
            gastos = [];
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        // Intentar cargar desde localStorage como respaldo
        if (storageStatus.localStorage) {
            cargarDesdeLocalStorage();
        }
    }
}

// Cargar desde IndexedDB
async function cargarDesdeIndexedDB() {
    const db = await abrirIndexedDB();
    
    // Cargar ventas
    const ventasStore = obtenerObjectStore(db, STORE_VENTAS, 'readonly');
    const ventasRequest = ventasStore.getAll();
    ventas = await new Promise((resolve) => {
        ventasRequest.onsuccess = () => resolve(ventasRequest.result || []);
        ventasRequest.onerror = () => resolve([]);
    });
    
    // Cargar gastos
    const gastosStore = obtenerObjectStore(db, STORE_GASTOS, 'readonly');
    const gastosRequest = gastosStore.getAll();
    gastos = await new Promise((resolve) => {
        gastosRequest.onsuccess = () => resolve(gastosRequest.result || []);
        gastosRequest.onerror = () => resolve([]);
    });
    
    console.log(`✅ Datos cargados desde IndexedDB: ${ventas.length} ventas, ${gastos.length} gastos`);
}

// Cargar desde localStorage
function cargarDesdeLocalStorage() {
    const ventasGuardadas = localStorage.getItem(STORAGE_VENTAS);
    const gastosGuardados = localStorage.getItem(STORAGE_GASTOS);
    
    if (ventasGuardadas) {
        ventas = JSON.parse(ventasGuardadas);
    } else {
        ventas = [];
    }
    
    if (gastosGuardados) {
        gastos = JSON.parse(gastosGuardados);
    } else {
        gastos = [];
    }
    
    console.log(`✅ Datos cargados desde localStorage: ${ventas.length} ventas, ${gastos.length} gastos`);
}

// Guardar ventas
async function guardarVentas() {
    try {
        if (storageStatus.indexedDB) {
            await guardarVentasIndexedDB();
        }
        if (storageStatus.localStorage) {
            guardarVentasLocalStorage();
        }
        actualizarIndicadorEstado();
    } catch (error) {
        console.error('Error al guardar ventas:', error);
        if (storageStatus.localStorage) {
            guardarVentasLocalStorage();
        }
        actualizarIndicadorEstado();
    }
}

// Guardar gastos
async function guardarGastos() {
    try {
        if (storageStatus.indexedDB) {
            await guardarGastosIndexedDB();
        }
        if (storageStatus.localStorage) {
            guardarGastosLocalStorage();
        }
        actualizarIndicadorEstado();
    } catch (error) {
        console.error('Error al guardar gastos:', error);
        if (storageStatus.localStorage) {
            guardarGastosLocalStorage();
        }
        actualizarIndicadorEstado();
    }
}

// Guardar ventas en IndexedDB
async function guardarVentasIndexedDB() {
    const db = await abrirIndexedDB();
    const store = obtenerObjectStore(db, STORE_VENTAS, 'readwrite');
    
    // Limpiar store primero
    await new Promise((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Agregar todas las ventas
    for (const venta of ventas) {
        await new Promise((resolve, reject) => {
            const addRequest = store.add(venta);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
        });
    }
}

// Guardar gastos en IndexedDB
async function guardarGastosIndexedDB() {
    const db = await abrirIndexedDB();
    const store = obtenerObjectStore(db, STORE_GASTOS, 'readwrite');
    
    // Limpiar store primero
    await new Promise((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Agregar todos los gastos
    for (const gasto of gastos) {
        await new Promise((resolve, reject) => {
            const addRequest = store.add(gasto);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
        });
    }
}

// Guardar ventas en localStorage
function guardarVentasLocalStorage() {
    localStorage.setItem(STORAGE_VENTAS, JSON.stringify(ventas));
}

// Guardar gastos en localStorage
function guardarGastosLocalStorage() {
    localStorage.setItem(STORAGE_GASTOS, JSON.stringify(gastos));
}

// ============================================
// NAVEGACIÓN ENTRE TABS
// ============================================

function configurarNavegacion() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al botón y contenido seleccionado
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// ============================================
// CONFIGURACIÓN ADICIONAL
// ============================================

function configurarFormularios() {
    // Formulario de ventas
    const formVenta = document.getElementById('form-venta');
    formVenta.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarVenta();
    });
    
    // Formulario de gastos
    const formGasto = document.getElementById('form-gasto');
    formGasto.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarGasto();
    });
}

// Configurar botón de borrar todo
function configurarBorrarTodo() {
    const btnBorrarTodo = document.getElementById('btn-borrar-todo');
    if (btnBorrarTodo) {
        btnBorrarTodo.addEventListener('click', borrarTodosLosDatos);
    }
}

// Actualizar indicador de estado de almacenamiento
function actualizarIndicadorEstado() {
    const indicador = document.getElementById('storage-status');
    if (!indicador) return;
    
    if (storageStatus.indexedDB) {
        indicador.className = 'storage-status success';
        indicador.innerHTML = '✅ Datos guardados correctamente';
        indicador.title = 'IndexedDB funcionando correctamente';
    } else if (storageStatus.localStorage) {
        indicador.className = 'storage-status warning';
        indicador.innerHTML = '⚠️ Usando respaldo (localStorage)';
        indicador.title = 'No se pudo usar IndexedDB, usando localStorage';
    } else {
        indicador.className = 'storage-status error';
        indicador.innerHTML = '❌ Error: No se pueden guardar datos';
        indicador.title = 'El almacenamiento está bloqueado. Haz respaldos frecuentes.';
    }
}

// Borrar todos los datos
async function borrarTodosLosDatos() {
    // Primera confirmación
    const confirm1 = confirm('⚠️ ADVERTENCIA: Estás a punto de borrar TODOS los datos.\n\nEsto incluye TODAS las ventas y gastos registrados.\n\n¿Estás seguro que quieres continuar?');
    
    if (!confirm1) {
        return;
    }
    
    // Segunda confirmación
    const confirm2 = confirm('🚨 ÚLTIMA OPORTUNIDAD 🚨\n\nEsta acción NO SE PUEDE DESHACER.\n\nEscribe "CONFIRMAR" en la siguiente ventana si realmente quieres borrar TODO.');
    
    if (!confirm2) {
        return;
    }
    
    const confirm3 = prompt('Para confirmar, escribe exactamente: CONFIRMAR');
    
    if (confirm3 !== 'CONFIRMAR') {
        mostrarMensaje('Operación cancelada. Los datos están seguros.', 'info');
        return;
    }
    
    try {
        // Limpiar datos en memoria PRIMERO
        ventas = [];
        gastos = [];
        
        // Borrar de IndexedDB
        if (storageStatus.indexedDB) {
            try {
                const db = await abrirIndexedDB();
                
                // Borrar ventas con transacción completa
                await new Promise((resolve, reject) => {
                    const transaction = db.transaction([STORE_VENTAS], 'readwrite');
                    const ventasStore = transaction.objectStore(STORE_VENTAS);
                    const clearVentas = ventasStore.clear();
                    clearVentas.onsuccess = () => {
                        transaction.oncomplete = () => {
                            console.log('✅ Ventas borradas de IndexedDB');
                            resolve();
                        };
                        transaction.onerror = () => {
                            console.error('Error en transacción de ventas:', transaction.error);
                            reject(transaction.error);
                        };
                    };
                    clearVentas.onerror = () => {
                        console.error('Error al borrar ventas:', clearVentas.error);
                        reject(clearVentas.error);
                    };
                });
                
                // Borrar gastos con transacción completa
                await new Promise((resolve, reject) => {
                    const transaction = db.transaction([STORE_GASTOS], 'readwrite');
                    const gastosStore = transaction.objectStore(STORE_GASTOS);
                    const clearGastos = gastosStore.clear();
                    clearGastos.onsuccess = () => {
                        transaction.oncomplete = () => {
                            console.log('✅ Gastos borrados de IndexedDB');
                            resolve();
                        };
                        transaction.onerror = () => {
                            console.error('Error en transacción de gastos:', transaction.error);
                            reject(transaction.error);
                        };
                    };
                    clearGastos.onerror = () => {
                        console.error('Error al borrar gastos:', clearGastos.error);
                        reject(clearGastos.error);
                    };
                });
                
                console.log('✅ Todos los datos borrados de IndexedDB correctamente');
            } catch (error) {
                console.error('Error al borrar de IndexedDB:', error);
                // Continuar con localStorage incluso si IndexedDB falla
            }
        }
        
        // Borrar de localStorage
        if (storageStatus.localStorage) {
            try {
                localStorage.removeItem(STORAGE_VENTAS);
                localStorage.removeItem(STORAGE_GASTOS);
                console.log('✅ Datos borrados de localStorage correctamente');
            } catch (error) {
                console.error('Error al borrar de localStorage:', error);
            }
        }
        
        // Asegurar que los arrays estén vacíos después de borrar
        ventas = [];
        gastos = [];
        
        // ❌ ELIMINADA: await cargarDatos(); - Esto recargaba los datos que acabamos de borrar
        
        // Verificar que efectivamente se borraron
        if (ventas.length > 0 || gastos.length > 0) {
            console.warn('⚠️ Algunos datos aún existen después del borrado. Forzando borrado...');
            ventas = [];
            gastos = [];
            await guardarVentas();
            await guardarGastos();
        }
        
        // Actualizar visualización
        actualizarDashboard();
        mostrarVentas();
        mostrarGastos();
        
        // Mostrar mensaje de éxito
        mostrarMensaje('✅ Todos los datos han sido borrados exitosamente. Puedes empezar un nuevo período.', 'success');
        
    } catch (error) {
        console.error('Error al borrar datos:', error);
        mostrarMensaje('❌ Error al borrar los datos. Intenta de nuevo.', 'error');
    }
}

// Calcular total de venta automáticamente
function calcularTotalVenta() {
    const cantidad = parseFloat(document.getElementById('venta-cantidad').value) || 0;
    const precio = parseFloat(document.getElementById('venta-precio').value) || 0;
    const total = cantidad * precio;
    
    document.getElementById('venta-total').value = total.toFixed(2);
}

// ============================================
// GUARDAR VENTAS
// ============================================

async function guardarVenta() {
    // Obtener valores del formulario
    const fecha = document.getElementById('venta-fecha').value;
    const descripcion = document.getElementById('venta-descripcion').value.trim();
    const cantidad = parseFloat(document.getElementById('venta-cantidad').value);
    const precio = parseFloat(document.getElementById('venta-precio').value);
    const total = cantidad * precio;
    const metodoPago = document.getElementById('venta-metodo').value;
    
    // Validar que todos los campos estén completos
    if (!fecha || !descripcion || cantidad <= 0 || precio <= 0 || !metodoPago) {
        mostrarMensaje('Por favor completa todos los campos correctamente', 'error');
        return;
    }
    
    // Crear objeto de venta
    const nuevaVenta = {
        id: Date.now(), // ID único basado en timestamp
        fecha: fecha,
        descripcion: descripcion,
        cantidad: cantidad,
        precio: precio,
        total: total,
        metodoPago: metodoPago
    };
    
    // Agregar a la lista
    ventas.push(nuevaVenta);
    
    // Guardar en almacenamiento
    await guardarVentas();
    
    // Limpiar formulario
    document.getElementById('form-venta').reset();
    
    // Restablecer fecha actual (usando fecha local)
    const hoy = obtenerFechaLocal();
    document.getElementById('venta-fecha').value = hoy;
    
    // Actualizar visualización
    mostrarVentas();
    actualizarDashboard();
    
    // Mostrar mensaje de éxito
    mostrarMensaje('✅ Venta registrada correctamente');
}

// ============================================
// GUARDAR GASTOS
// ============================================

async function guardarGasto() {
    // Obtener valores del formulario
    const fecha = document.getElementById('gasto-fecha').value;
    const descripcion = document.getElementById('gasto-descripcion').value.trim();
    const categoria = document.getElementById('gasto-categoria').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const metodoPago = document.getElementById('gasto-metodo').value;
    
    // Validar que todos los campos estén completos
    if (!fecha || !descripcion || categoria === '' || monto <= 0 || !metodoPago) {
        mostrarMensaje('Por favor completa todos los campos correctamente', 'error');
        return;
    }
    
    // Crear objeto de gasto
    const nuevoGasto = {
        id: Date.now(), // ID único basado en timestamp
        fecha: fecha,
        descripcion: descripcion,
        categoria: categoria,
        monto: monto,
        metodoPago: metodoPago
    };
    
    // Agregar a la lista
    gastos.push(nuevoGasto);
    
    // Guardar en almacenamiento
    await guardarGastos();
    
    // Limpiar formulario
    document.getElementById('form-gasto').reset();
    
    // Restablecer fecha actual (usando fecha local)
    const hoy = obtenerFechaLocal();
    document.getElementById('gasto-fecha').value = hoy;
    
    // Actualizar visualización
    mostrarGastos();
    actualizarDashboard();
    
    // Mostrar mensaje de éxito
    mostrarMensaje('✅ Gasto registrado correctamente');
}

// ============================================
// ELIMINAR REGISTROS
// ============================================

async function eliminarVenta(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
        ventas = ventas.filter(v => v.id !== id);
        await guardarVentas();
        mostrarVentas();
        actualizarDashboard();
        mostrarMensaje('Venta eliminada');
    }
}

async function eliminarGasto(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
        gastos = gastos.filter(g => g.id !== id);
        await guardarGastos();
        mostrarGastos();
        actualizarDashboard();
        mostrarMensaje('Gasto eliminado');
    }
}

// ============================================
// MOSTRAR VENTAS EN TABLA
// ============================================

function mostrarVentas(filtroFecha = null) {
    const tbody = document.getElementById('tbody-ventas');
    let ventasFiltradas = ventas;
    
    // Aplicar filtro de fecha si existe
    if (filtroFecha) {
        ventasFiltradas = ventas.filter(v => v.fecha === filtroFecha);
    }
    
    // Ordenar por fecha (más recientes primero)
    ventasFiltradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (ventasFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No hay ventas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = ventasFiltradas.map(venta => {
        const fechaFormateada = formatearFecha(venta.fecha);
        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${venta.descripcion}</td>
                <td>${venta.cantidad}</td>
                <td>$${venta.precio.toFixed(2)}</td>
                <td><strong>$${venta.total.toFixed(2)}</strong></td>
                <td>${capitalizar(venta.metodoPago)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="eliminarVenta(${venta.id})">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// MOSTRAR GASTOS EN TABLA
// ============================================

function mostrarGastos(filtroFecha = null, filtroCategoria = null) {
    const tbody = document.getElementById('tbody-gastos');
    let gastosFiltrados = gastos;
    
    // Aplicar filtros
    if (filtroFecha) {
        gastosFiltrados = gastosFiltrados.filter(g => g.fecha === filtroFecha);
    }
    if (filtroCategoria) {
        gastosFiltrados = gastosFiltrados.filter(g => g.categoria === filtroCategoria);
    }
    
    // Ordenar por fecha (más recientes primero)
    gastosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (gastosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay gastos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = gastosFiltrados.map(gasto => {
        const fechaFormateada = formatearFecha(gasto.fecha);
        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${gasto.descripcion}</td>
                <td>${capitalizar(gasto.categoria)}</td>
                <td><strong>$${gasto.monto.toFixed(2)}</strong></td>
                <td>${capitalizar(gasto.metodoPago)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="eliminarGasto(${gasto.id})">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Funciones para filtrar
function filtrarVentas() {
    const filtroFecha = document.getElementById('filtro-fecha-ventas').value;
    mostrarVentas(filtroFecha || null);
}

function limpiarFiltroVentas() {
    document.getElementById('filtro-fecha-ventas').value = '';
    mostrarVentas();
}

function filtrarGastos() {
    const filtroFecha = document.getElementById('filtro-fecha-gastos').value;
    const filtroCategoria = document.getElementById('filtro-categoria-gastos').value;
    mostrarGastos(filtroFecha || null, filtroCategoria || null);
}

function limpiarFiltroGastos() {
    document.getElementById('filtro-fecha-gastos').value = '';
    document.getElementById('filtro-categoria-gastos').value = '';
    mostrarGastos();
}

// ============================================
// CÁLCULOS Y DASHBOARD
// ============================================

function actualizarDashboard() {
    // Obtener fecha actual en formato local (YYYY-MM-DD)
    const hoy = obtenerFechaLocal();
    
    console.log('Fecha de hoy para dashboard:', hoy); // Debug
    console.log('Ventas totales:', ventas.length);
    console.log('Gastos totales:', gastos.length);
    
    // Calcular ingresos del día
    const ingresosDia = ventas
        .filter(v => {
            console.log('Comparando venta fecha:', v.fecha, 'con hoy:', hoy, 'Coincide:', v.fecha === hoy);
            return v.fecha === hoy;
        })
        .reduce((sum, v) => sum + v.total, 0);
    
    // Calcular gastos del día
    const gastosDia = gastos
        .filter(g => {
            console.log('Comparando gasto fecha:', g.fecha, 'con hoy:', hoy, 'Coincide:', g.fecha === hoy);
            return g.fecha === hoy;
        })
        .reduce((sum, g) => sum + g.monto, 0);
    
    console.log('Ingresos del día:', ingresosDia);
    console.log('Gastos del día:', gastosDia);
    
    // Calcular saldo del día
    const saldoDia = ingresosDia - gastosDia;
    
    // Calcular saldo total
    const totalIngresos = ventas.reduce((sum, v) => sum + v.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const saldoTotal = totalIngresos - totalGastos;
    
    // Calcular saldo semanal
    const fechaHace7Dias = new Date();
    fechaHace7Dias.setDate(fechaHace7Dias.getDate() - 7);
    const ingresosSemana = ventas
        .filter(v => new Date(v.fecha + 'T00:00:00') >= fechaHace7Dias)
        .reduce((sum, v) => sum + v.total, 0);
    const gastosSemana = gastos
        .filter(g => new Date(g.fecha + 'T00:00:00') >= fechaHace7Dias)
        .reduce((sum, g) => sum + g.monto, 0);
    const saldoSemanal = ingresosSemana - gastosSemana;
    
    // Calcular saldo mensual
    const hoyObj = new Date();
    const ingresosMes = ventas
        .filter(v => {
            const fechaVenta = new Date(v.fecha + 'T00:00:00');
            return fechaVenta.getMonth() === hoyObj.getMonth() && 
                   fechaVenta.getFullYear() === hoyObj.getFullYear();
        })
        .reduce((sum, v) => sum + v.total, 0);
    const gastosMes = gastos
        .filter(g => {
            const fechaGasto = new Date(g.fecha + 'T00:00:00');
            return fechaGasto.getMonth() === hoyObj.getMonth() && 
                   fechaGasto.getFullYear() === hoyObj.getFullYear();
        })
        .reduce((sum, g) => sum + g.monto, 0);
    const saldoMensual = ingresosMes - gastosMes;
    
    // Actualizar elementos del DOM
    document.getElementById('ingresos-dia').textContent = formatearMoneda(ingresosDia);
    document.getElementById('egresos-dia').textContent = formatearMoneda(gastosDia);
    document.getElementById('saldo-dia').textContent = formatearMoneda(saldoDia);
    document.getElementById('saldo-dia').className = saldoDia >= 0 ? 'card-amount' : 'card-amount negative';
    
    document.getElementById('saldo-total').textContent = formatearMoneda(saldoTotal);
    document.getElementById('saldo-semanal').textContent = formatearMoneda(saldoSemanal);
    document.getElementById('saldo-mensual').textContent = formatearMoneda(saldoMensual);
    
    // Actualizar transacciones recientes
    mostrarTransaccionesRecientes();
}

function mostrarTransaccionesRecientes() {
    const contenedor = document.getElementById('transacciones-recientes');
    
    // Combinar ventas y gastos
    const todasTransacciones = [
        ...ventas.map(v => ({ ...v, tipo: 'ingreso', monto: v.total })),
        ...gastos.map(g => ({ ...g, tipo: 'egreso', monto: g.monto }))
    ];
    
    // Ordenar por fecha (más recientes primero) y tomar las últimas 10
    todasTransacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const recientes = todasTransacciones.slice(0, 10);
    
    if (recientes.length === 0) {
        contenedor.innerHTML = '<p class="no-data">No hay transacciones registradas aún</p>';
        return;
    }
    
    contenedor.innerHTML = recientes.map(trans => {
        const icono = trans.tipo === 'ingreso' ? '💰' : '💸';
        const claseMonto = trans.tipo === 'ingreso' ? 'positive' : 'negative';
        const signo = trans.tipo === 'ingreso' ? '+' : '-';
        const descripcion = trans.tipo === 'ingreso' ? trans.descripcion : trans.descripcion;
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-desc">${icono} ${descripcion}</div>
                    <div class="transaction-date">${formatearFecha(trans.fecha)}</div>
                </div>
                <div class="transaction-amount ${claseMonto}">
                    ${signo}${formatearMoneda(trans.monto)}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// REPORTES Y GRÁFICAS
// ============================================

let graficaVentas = null;
let graficaGastos = null;
let graficaGanancias = null;
let graficaMensual = null;

function generarReporte() {
    const fechaInicio = document.getElementById('reporte-fecha-inicio').value;
    const fechaFin = document.getElementById('reporte-fecha-fin').value;
    
    // Filtrar datos por rango de fechas
    let ventasFiltradas = ventas;
    let gastosFiltrados = gastos;
    
    if (fechaInicio) {
        ventasFiltradas = ventasFiltradas.filter(v => v.fecha >= fechaInicio);
        gastosFiltrados = gastosFiltrados.filter(g => g.fecha >= fechaInicio);
    }
    
    if (fechaFin) {
        ventasFiltradas = ventasFiltradas.filter(v => v.fecha <= fechaFin);
        gastosFiltrados = gastosFiltrados.filter(g => g.fecha <= fechaFin);
    }
    
    // Calcular totales
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
    const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
    const gananciaNeta = totalVentas - totalGastos;
    const numVentas = ventasFiltradas.length;
    const promedioVentas = numVentas > 0 ? totalVentas / numVentas : 0;
    
    // Actualizar resumen de ventas
    document.getElementById('total-ventas-reporte').textContent = formatearMoneda(totalVentas);
    document.getElementById('numero-ventas-reporte').textContent = numVentas;
    document.getElementById('promedio-ventas-reporte').textContent = formatearMoneda(promedioVentas);
    
    // Actualizar resumen de gastos
    document.getElementById('total-gastos-reporte').textContent = formatearMoneda(totalGastos);
    
    // Actualizar ganancia neta
    const gananciaElement = document.getElementById('ganancia-neta-texto');
    gananciaElement.textContent = `Ganancia Neta: ${formatearMoneda(gananciaNeta)}`;
    gananciaElement.className = gananciaNeta >= 0 ? 'positive' : 'negative';
    
    // Generar gráficas
    generarGraficaVentas(ventasFiltradas);
    generarGraficaGastos(gastosFiltrados);
    generarGraficaGanancias(totalVentas, totalGastos);
    generarGraficaMensual();
    
    // Mostrar productos más vendidos
    mostrarProductosMasVendidos(ventasFiltradas);
}

function generarGraficaVentas(ventasFiltradas) {
    const ctx = document.getElementById('grafica-ventas').getContext('2d');
    
    // Agrupar por fecha
    const ventasPorFecha = {};
    ventasFiltradas.forEach(v => {
        if (!ventasPorFecha[v.fecha]) {
            ventasPorFecha[v.fecha] = 0;
        }
        ventasPorFecha[v.fecha] += v.total;
    });
    
    const fechas = Object.keys(ventasPorFecha).sort();
    const montos = fechas.map(fecha => ventasPorFecha[fecha]);
    
    // Destruir gráfica anterior si existe
    if (graficaVentas) {
        graficaVentas.destroy();
    }
    
    graficaVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechas.map(f => formatearFecha(f)),
            datasets: [{
                label: 'Ventas',
                data: montos,
                borderColor: '#1B263B',
                backgroundColor: 'rgba(27, 38, 59, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generarGraficaGastos(gastosFiltrados) {
    const ctx = document.getElementById('grafica-gastos').getContext('2d');
    
    // Agrupar por categoría
    const gastosPorCategoria = {};
    gastosFiltrados.forEach(g => {
        if (!gastosPorCategoria[g.categoria]) {
            gastosPorCategoria[g.categoria] = 0;
        }
        gastosPorCategoria[g.categoria] += g.monto;
    });
    
    const categorias = Object.keys(gastosPorCategoria);
    const montos = categorias.map(cat => gastosPorCategoria[cat]);
    
    // Destruir gráfica anterior si existe
    if (graficaGastos) {
        graficaGastos.destroy();
    }
    
    graficaGastos = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categorias.map(c => capitalizar(c)),
            datasets: [{
                data: montos,
                backgroundColor: [
                    'rgba(27, 38, 59, 0.8)',   // Azul marino
                    'rgba(119, 141, 169, 0.8)', // Azul grisáceo
                    'rgba(13, 27, 42, 0.8)',    // Azul oscuro
                    'rgba(27, 38, 59, 0.6)',    // Azul marino más claro
                    'rgba(119, 141, 169, 0.6)', // Azul grisáceo más claro
                    'rgba(13, 27, 42, 0.6)',    // Azul oscuro más claro
                    'rgba(27, 38, 59, 0.4)',    // Azul marino muy claro
                    'rgba(119, 141, 169, 0.4)'  // Azul grisáceo muy claro
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function generarGraficaGanancias(ingresos, egresos) {
    const ctx = document.getElementById('grafica-ganancias').getContext('2d');
    
    // Destruir gráfica anterior si existe
    if (graficaGanancias) {
        graficaGanancias.destroy();
    }
    
    graficaGanancias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ingresos vs Egresos'],
            datasets: [
                {
                    label: 'Ingresos',
                    data: [ingresos],
                    backgroundColor: 'rgba(119, 141, 169, 0.8)'
                },
                {
                    label: 'Egresos',
                    data: [egresos],
                    backgroundColor: 'rgba(27, 38, 59, 0.8)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generarGraficaMensual() {
    const ctx = document.getElementById('grafica-mensual').getContext('2d');
    
    // Obtener datos de los últimos 6 meses
    const meses = [];
    const ingresosMensuales = [];
    const egresosMensuales = [];
    
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesNombre = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        meses.push(capitalizar(mesNombre));
        
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        
        const ingresos = ventas
            .filter(v => {
                const fechaVenta = new Date(v.fecha);
                return fechaVenta.getMonth() === mes && fechaVenta.getFullYear() === año;
            })
            .reduce((sum, v) => sum + v.total, 0);
        
        const egresos = gastos
            .filter(g => {
                const fechaGasto = new Date(g.fecha);
                return fechaGasto.getMonth() === mes && fechaGasto.getFullYear() === año;
            })
            .reduce((sum, g) => sum + g.monto, 0);
        
        ingresosMensuales.push(ingresos);
        egresosMensuales.push(egresos);
    }
    
    // Destruir gráfica anterior si existe
    if (graficaMensual) {
        graficaMensual.destroy();
    }
    
    graficaMensual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Ingresos',
                    data: ingresosMensuales,
                    backgroundColor: 'rgba(119, 141, 169, 0.8)'
                },
                {
                    label: 'Egresos',
                    data: egresosMensuales,
                    backgroundColor: 'rgba(27, 38, 59, 0.8)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function mostrarProductosMasVendidos(ventasFiltradas) {
    const contenedor = document.getElementById('productos-mas-vendidos');
    
    // Agrupar por descripción
    const productos = {};
    ventasFiltradas.forEach(v => {
        if (!productos[v.descripcion]) {
            productos[v.descripcion] = { cantidad: 0, total: 0 };
        }
        productos[v.descripcion].cantidad += v.cantidad;
        productos[v.descripcion].total += v.total;
    });
    
    // Ordenar por total vendido
    const productosArray = Object.entries(productos)
        .map(([desc, datos]) => ({ descripcion: desc, ...datos }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10
    
    if (productosArray.length === 0) {
        contenedor.innerHTML = '<p class="no-data">No hay datos disponibles</p>';
        return;
    }
    
    contenedor.innerHTML = productosArray.map((prod, index) => {
        const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦';
        return `
            <div class="product-item">
                <div>
                    <strong>${medalla} ${prod.descripcion}</strong>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">
                        Cantidad: ${prod.cantidad} | Total: ${formatearMoneda(prod.total)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// EXPORTAR A PDF
// ============================================

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Contabilidad', 14, 20);
    
    // Fecha del reporte
    doc.setFontSize(10);
    doc.text(`Generado el: ${formatearFecha(new Date().toISOString().split('T')[0])}`, 14, 30);
    
    let yPos = 40;
    
    // Resumen general
    const totalIngresos = ventas.reduce((sum, v) => sum + v.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const gananciaNeta = totalIngresos - totalGastos;
    
    doc.setFontSize(14);
    doc.text('Resumen General', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text(`Total de Ingresos: ${formatearMoneda(totalIngresos)}`, 14, yPos);
    yPos += 7;
    doc.text(`Total de Gastos: ${formatearMoneda(totalGastos)}`, 14, yPos);
    yPos += 7;
    doc.text(`Ganancia Neta: ${formatearMoneda(gananciaNeta)}`, 14, yPos);
    yPos += 15;
    
    // Ventas
    if (ventas.length > 0) {
        doc.setFontSize(14);
        doc.text('Ventas', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        ventas.slice(0, 20).forEach((venta, index) => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(
                `${formatearFecha(venta.fecha)} - ${venta.descripcion} - ${formatearMoneda(venta.total)}`,
                14,
                yPos
            );
            yPos += 6;
        });
        yPos += 5;
    }
    
    // Gastos
    if (gastos.length > 0) {
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Gastos', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        gastos.slice(0, 20).forEach((gasto, index) => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(
                `${formatearFecha(gasto.fecha)} - ${gasto.descripcion} (${capitalizar(gasto.categoria)}) - ${formatearMoneda(gasto.monto)}`,
                14,
                yPos
            );
            yPos += 6;
        });
    }
    
    // Guardar PDF
    doc.save(`reporte-contabilidad-${new Date().toISOString().split('T')[0]}.pdf`);
    mostrarMensaje('✅ PDF generado correctamente');
}

// ============================================
// CONFIGURACIÓN DE INSTALACIÓN PWA
// ============================================

function configurarInstalacionPWA() {
    const installButton = document.getElementById('install-button');
    const installDismiss = document.getElementById('install-dismiss');
    
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                try {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`Instalación: ${outcome}`);
                    
                    if (outcome === 'accepted') {
                        mostrarMensaje('✅ ¡App instalada! Ahora puedes abrirla desde tu pantalla de inicio.', 'success');
                    }
                    
                    deferredPrompt = null;
                    const installBanner = document.getElementById('install-banner');
                    if (installBanner) {
                        installBanner.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error al instalar:', error);
                    mostrarMensaje('❌ Error al instalar. Verifica que uses un servidor HTTP.', 'error');
                }
            } else {
                // Verificar si estamos en file://
                if (window.location.protocol === 'file:') {
                    mostrarMensaje('⚠️ Para instalar, necesitas usar un servidor local. Abre servidor-local.html para instrucciones.', 'error');
                } else {
                    // Fallback para iOS/Safari
                    mostrarMensaje('💡 En iPhone: Toca el botón compartir → "Agregar a pantalla de inicio"', 'info');
                }
            }
        });
    }
    
    if (installDismiss) {
        installDismiss.addEventListener('click', () => {
            const installBanner = document.getElementById('install-banner');
            if (installBanner) {
                installBanner.style.display = 'none';
            }
            // Guardar preferencia para no mostrar por 7 días
            localStorage.setItem('pwa_dismissed', Date.now().toString());
        });
    }
    
    // No mostrar banner si fue descartado recientemente
    const dismissed = localStorage.getItem('pwa_dismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
            const installBanner = document.getElementById('install-banner');
            if (installBanner) {
                installBanner.style.display = 'none';
            }
        }
    }
    
    // Mostrar banner después de un delay si no está instalada y estamos en HTTP
    setTimeout(() => {
        const installBanner = document.getElementById('install-banner');
        if (installBanner && 
            !window.matchMedia('(display-mode: standalone)').matches &&
            (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
            !deferredPrompt) {
            // Si no hay deferredPrompt pero estamos en HTTP, puede ser que el navegador no soporte
            // o que el manifest no esté cargando correctamente
            console.log('ℹ️ Banner de instalación listo (esperando evento beforeinstallprompt)');
        }
    }, 2000);
}

// ============================================
// RECORDATORIO DE RESPALDO SEMANAL
// ============================================

function verificarRecordatorioRespaldo() {
    const lastBackupReminder = localStorage.getItem('last_backup_reminder');
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (!lastBackupReminder || (now - parseInt(lastBackupReminder)) > weekInMs) {
        setTimeout(() => {
            if (confirm('💾 ¿Hiciste un respaldo de tus datos esta semana?\n\nSe recomienda hacer respaldos semanales para proteger tu información.\n\n¿Quieres exportar tus datos ahora?')) {
                exportarDatosMejorado();
            }
            localStorage.setItem('last_backup_reminder', now.toString());
        }, 2000); // Mostrar después de 2 segundos
    }
}

// ============================================
// EXPORTAR/IMPORTAR DATOS
// ============================================

function exportarDatos() {
    // Mantener compatibilidad con versión anterior
    exportarDatosMejorado();
}

function importarDatos() {
    // Mantener compatibilidad con versión anterior
    importarDatosMejorado();
}

function exportarDatosMejorado() {
    try {
        const datos = {
            ventas: ventas,
            gastos: gastos,
            exportadoEn: new Date().toISOString(),
            version: '2.0',
            totalVentas: ventas.length,
            totalGastos: gastos.length
        };
        
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const fecha = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `contabilidad-backup-${fecha}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        mostrarMensaje('✅ Respaldo descargado. Guárdalo en un lugar seguro.', 'success');
        
        // Actualizar último recordatorio
        localStorage.setItem('last_backup_reminder', Date.now().toString());
        
        // Mostrar instrucciones después de un momento
        setTimeout(() => {
            alert('💡 IMPORTANTE:\n\n' +
                  '1. Este archivo contiene TODOS tus datos\n' +
                  '2. Guárdalo en un lugar seguro (Google Drive, Dropbox, etc.)\n' +
                  '3. Para usar en otro dispositivo: abre la app ahí y usa "Importar Datos"\n' +
                  '4. Se recomienda hacer respaldo cada semana');
        }, 500);
        
    } catch (error) {
        console.error('Error al exportar:', error);
        mostrarMensaje('❌ Error al exportar datos', 'error');
    }
}

function importarDatosMejorado() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const datos = JSON.parse(text);
            
            // Validar datos
            if (!datos.ventas || !Array.isArray(datos.ventas) || 
                !datos.gastos || !Array.isArray(datos.gastos)) {
                throw new Error('Archivo inválido: formato incorrecto');
            }
            
            // Preguntar si reemplazar o combinar
            const opcion = confirm(
                '¿Cómo quieres importar los datos?\n\n' +
                'OK = REEMPLAZAR todos los datos actuales\n' +
                'Cancelar = COMBINAR con los datos actuales\n\n' +
                `El archivo contiene: ${datos.ventas.length} ventas y ${datos.gastos.length} gastos`
            );
            
            if (opcion) {
                // Reemplazar
                ventas = datos.ventas;
                gastos = datos.gastos;
                mostrarMensaje('✅ Datos reemplazados completamente', 'success');
            } else {
                // Combinar (evitar duplicados por ID si existen)
                const ventasIds = new Set(ventas.map(v => v.id));
                const gastosIds = new Set(gastos.map(g => g.id));
                
                const nuevasVentas = datos.ventas.filter(v => !ventasIds.has(v.id));
                const nuevosGastos = datos.gastos.filter(g => !gastosIds.has(g.id));
                
                ventas = [...ventas, ...nuevasVentas];
                gastos = [...gastos, ...nuevosGastos];
                
                mostrarMensaje(
                    `✅ Datos combinados: ${nuevasVentas.length} ventas y ${nuevosGastos.length} gastos agregados`,
                    'success'
                );
            }
            
            // Guardar
            await guardarVentas();
            await guardarGastos();
            
            // Actualizar vista
            actualizarDashboard();
            mostrarVentas();
            mostrarGastos();
            
        } catch (error) {
            console.error('Error al importar:', error);
            mostrarMensaje('❌ Error al importar. Verifica que el archivo sea correcto: ' + error.message, 'error');
        }
    };
    
    input.click();
}

async function cargarDatosImportados(event) {
    // Mantener compatibilidad con función anterior
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const datos = JSON.parse(text);
        
        if (!datos.ventas || !Array.isArray(datos.ventas) || 
            !datos.gastos || !Array.isArray(datos.gastos)) {
            throw new Error('Archivo inválido');
        }
        
        const opcion = confirm(
            '¿Cómo quieres importar los datos?\n\n' +
            'OK = REEMPLAZAR todos los datos actuales\n' +
            'Cancelar = COMBINAR con los datos actuales'
        );
        
        if (opcion) {
            ventas = datos.ventas;
            gastos = datos.gastos;
        } else {
            const ventasIds = new Set(ventas.map(v => v.id));
            const gastosIds = new Set(gastos.map(g => g.id));
            
            const nuevasVentas = datos.ventas.filter(v => !ventasIds.has(v.id));
            const nuevosGastos = datos.gastos.filter(g => !gastosIds.has(g.id));
            
            ventas = [...ventas, ...nuevasVentas];
            gastos = [...gastos, ...nuevosGastos];
        }
        
        await guardarVentas();
        await guardarGastos();
        
        actualizarDashboard();
        mostrarVentas();
        mostrarGastos();
        
        mostrarMensaje(`✅ Datos importados: ${datos.ventas.length} ventas, ${datos.gastos.length} gastos`, 'success');
        
    } catch (error) {
        console.error('Error al importar:', error);
        mostrarMensaje('❌ Error al importar. Verifica que el archivo sea correcto.', 'error');
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Función helper para obtener la fecha local en formato YYYY-MM-DD
// Esta función siempre devuelve la fecha local del usuario, sin problemas de zona horaria
function obtenerFechaLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    const día = ahora.getDate();
    
    const mesStr = String(mes).padStart(2, '0');
    const díaStr = String(día).padStart(2, '0');
    
    const fechaLocal = `${año}-${mesStr}-${díaStr}`;
    console.log('Fecha local generada:', fechaLocal, 'Hora actual:', ahora.toLocaleString());
    
    return fechaLocal;
}

function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(monto);
}

function formatearFecha(fecha) {
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarMensaje(texto, tipo = 'success') {
    const mensaje = document.getElementById('mensaje-exito');
    mensaje.textContent = texto;
    mensaje.className = 'mensaje-flotante show';
    
    if (tipo === 'error') {
        mensaje.style.backgroundColor = '#ef4444';
    } else if (tipo === 'info') {
        mensaje.style.backgroundColor = '#3b82f6';
    } else {
        mensaje.style.backgroundColor = '#10b981';
    }
    
    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

// Hacer funciones disponibles globalmente
window.eliminarVenta = eliminarVenta;
window.eliminarGasto = eliminarGasto;
window.filtrarVentas = filtrarVentas;
window.limpiarFiltroVentas = limpiarFiltroVentas;
window.filtrarGastos = filtrarGastos;
window.limpiarFiltroGastos = limpiarFiltroGastos;
window.generarReporte = generarReporte;
window.exportarPDF = exportarPDF;
window.exportarDatos = exportarDatos;
window.importarDatos = importarDatos;
window.exportarDatosMejorado = exportarDatosMejorado;
window.importarDatosMejorado = importarDatosMejorado;
window.cargarDatosImportados = cargarDatosImportados;
window.cargarDatosImportadosMejorado = cargarDatosImportados;

