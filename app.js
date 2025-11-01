// ============================================
// SISTEMA DE CONTABILIDAD - LÓGICA PRINCIPAL
// ============================================

// Variables globales para almacenar datos
let ventas = [];
let gastos = [];

// Claves para localStorage
const STORAGE_VENTAS = 'contabilidad_ventas';
const STORAGE_GASTOS = 'contabilidad_gastos';

// ============================================
// INICIALIZACIÓN
// ============================================

// Cuando se carga la página, inicializar todo
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
});

function inicializarApp() {
    // Cargar datos guardados
    cargarDatos();
    
    // Configurar navegación de tabs
    configurarNavegacion();
    
    // Configurar formularios
    configurarFormularios();
    
    // Mostrar datos iniciales
    actualizarDashboard();
    mostrarVentas();
    mostrarGastos();
    
    // Establecer fecha actual como predeterminada en formularios
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('venta-fecha').value = hoy;
    document.getElementById('gasto-fecha').value = hoy;
    
    // Calcular total automáticamente cuando cambia cantidad o precio
    document.getElementById('venta-cantidad').addEventListener('input', calcularTotalVenta);
    document.getElementById('venta-precio').addEventListener('input', calcularTotalVenta);
}

// ============================================
// GESTIÓN DE DATOS (localStorage)
// ============================================

// Cargar datos del almacenamiento local
function cargarDatos() {
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
}

// Guardar ventas en localStorage
function guardarVentas() {
    localStorage.setItem(STORAGE_VENTAS, JSON.stringify(ventas));
}

// Guardar gastos en localStorage
function guardarGastos() {
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
// FORMULARIOS
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

function guardarVenta() {
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
    
    // Guardar en localStorage
    guardarVentas();
    
    // Limpiar formulario
    document.getElementById('form-venta').reset();
    
    // Restablecer fecha actual
    const hoy = new Date().toISOString().split('T')[0];
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

function guardarGasto() {
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
    
    // Guardar en localStorage
    guardarGastos();
    
    // Limpiar formulario
    document.getElementById('form-gasto').reset();
    
    // Restablecer fecha actual
    const hoy = new Date().toISOString().split('T')[0];
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

function eliminarVenta(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
        ventas = ventas.filter(v => v.id !== id);
        guardarVentas();
        mostrarVentas();
        actualizarDashboard();
        mostrarMensaje('Venta eliminada');
    }
}

function eliminarGasto(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
        gastos = gastos.filter(g => g.id !== id);
        guardarGastos();
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
    const hoy = new Date().toISOString().split('T')[0];
    
    // Calcular ingresos del día
    const ingresosDia = ventas
        .filter(v => v.fecha === hoy)
        .reduce((sum, v) => sum + v.total, 0);
    
    // Calcular gastos del día
    const gastosDia = gastos
        .filter(g => g.fecha === hoy)
        .reduce((sum, g) => sum + g.monto, 0);
    
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
        .filter(v => new Date(v.fecha) >= fechaHace7Dias)
        .reduce((sum, v) => sum + v.total, 0);
    const gastosSemana = gastos
        .filter(g => new Date(g.fecha) >= fechaHace7Dias)
        .reduce((sum, g) => sum + g.monto, 0);
    const saldoSemanal = ingresosSemana - gastosSemana;
    
    // Calcular saldo mensual
    const hoyObj = new Date();
    const ingresosMes = ventas
        .filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.getMonth() === hoyObj.getMonth() && 
                   fechaVenta.getFullYear() === hoyObj.getFullYear();
        })
        .reduce((sum, v) => sum + v.total, 0);
    const gastosMes = gastos
        .filter(g => {
            const fechaGasto = new Date(g.fecha);
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
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
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
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(20, 184, 166, 0.8)',
                    'rgba(156, 163, 175, 0.8)'
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
                    backgroundColor: 'rgba(16, 185, 129, 0.8)'
                },
                {
                    label: 'Egresos',
                    data: [egresos],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)'
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
                    backgroundColor: 'rgba(16, 185, 129, 0.8)'
                },
                {
                    label: 'Egresos',
                    data: egresosMensuales,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)'
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
// EXPORTAR/IMPORTAR DATOS
// ============================================

function exportarDatos() {
    const datos = {
        ventas: ventas,
        gastos: gastos,
        fechaExportacion: new Date().toISOString()
    };
    
    const datosJSON = JSON.stringify(datos, null, 2);
    const blob = new Blob([datosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-contabilidad-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    mostrarMensaje('✅ Datos exportados correctamente');
}

function importarDatos() {
    document.getElementById('file-input').click();
}

function cargarDatosImportados(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            
            if (confirm('¿Estás seguro de que quieres importar estos datos? Se reemplazarán los datos actuales.')) {
                if (datos.ventas) ventas = datos.ventas;
                if (datos.gastos) gastos = datos.gastos;
                
                guardarVentas();
                guardarGastos();
                
                actualizarDashboard();
                mostrarVentas();
                mostrarGastos();
                
                mostrarMensaje('✅ Datos importados correctamente');
            }
        } catch (error) {
            mostrarMensaje('❌ Error al importar datos. Verifica que el archivo sea válido.', 'error');
        }
    };
    reader.readAsText(file);
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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
window.cargarDatosImportados = cargarDatosImportados;

