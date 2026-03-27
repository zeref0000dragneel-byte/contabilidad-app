/**
 * Dashboard y reportes (gráficas Chart.js). Datos vía deps.
 */
(function (global) {
    let graficaVentas = null;
    let graficaGastos = null;
    let graficaGanancias = null;
    let graficaMensual = null;

    function actualizarDashboard(deps) {
        const hoy = deps.obtenerFechaLocal();
        const ventas = deps.getVentas();
        const gastos = deps.getGastos();

        const ingresosDia = ventas
            .filter((v) => v.fecha === hoy)
            .reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);

        const gastosDia = gastos.filter((g) => g.fecha === hoy).reduce((sum, g) => sum + g.monto, 0);

        const saldoDia = ingresosDia - gastosDia;

        const totalIngresos = ventas.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const saldoTotal = totalIngresos - totalGastos;

        const fechaHace7Dias = new Date();
        fechaHace7Dias.setDate(fechaHace7Dias.getDate() - 7);
        const ingresosSemana = ventas
            .filter((v) => new Date(v.fecha + 'T00:00:00') >= fechaHace7Dias)
            .reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const gastosSemana = gastos
            .filter((g) => new Date(g.fecha + 'T00:00:00') >= fechaHace7Dias)
            .reduce((sum, g) => sum + g.monto, 0);
        const saldoSemanal = ingresosSemana - gastosSemana;

        const hoyObj = new Date();
        const ingresosMes = ventas
            .filter((v) => {
                const fechaVenta = new Date(v.fecha + 'T00:00:00');
                return (
                    fechaVenta.getMonth() === hoyObj.getMonth() &&
                    fechaVenta.getFullYear() === hoyObj.getFullYear()
                );
            })
            .reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const gastosMes = gastos
            .filter((g) => {
                const fechaGasto = new Date(g.fecha + 'T00:00:00');
                return (
                    fechaGasto.getMonth() === hoyObj.getMonth() &&
                    fechaGasto.getFullYear() === hoyObj.getFullYear()
                );
            })
            .reduce((sum, g) => sum + g.monto, 0);
        const saldoMensual = ingresosMes - gastosMes;

        document.getElementById('ingresos-dia').textContent = deps.formatearMoneda(ingresosDia);
        document.getElementById('egresos-dia').textContent = deps.formatearMoneda(gastosDia);
        document.getElementById('saldo-dia').textContent = deps.formatearMoneda(saldoDia);
        document.getElementById('saldo-dia').className = saldoDia >= 0 ? 'card-amount' : 'card-amount negative';

        document.getElementById('saldo-total').textContent = deps.formatearMoneda(saldoTotal);
        document.getElementById('saldo-semanal').textContent = deps.formatearMoneda(saldoSemanal);
        document.getElementById('saldo-mensual').textContent = deps.formatearMoneda(saldoMensual);

        mostrarTransaccionesRecientes(deps);
    }

    function mostrarTransaccionesRecientes(deps) {
        const contenedor = document.getElementById('transacciones-recientes');
        if (!contenedor) return;

        const ventas = deps.getVentas();
        const gastos = deps.getGastos();

        const todasTransacciones = [
            ...ventas.map((v) => ({
                ...v,
                tipo: 'ingreso',
                monto: deps.obtenerMontoIngreso(v)
            })),
            ...gastos.map((g) => ({ ...g, tipo: 'egreso', monto: g.monto }))
        ];

        todasTransacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const recientes = todasTransacciones.slice(0, 10);

        if (recientes.length === 0) {
            contenedor.innerHTML = '<p class="no-data">No hay transacciones registradas aún</p>';
            return;
        }

        contenedor.innerHTML = recientes
            .map((trans) => {
                const icono = trans.tipo === 'ingreso' ? '💰' : '💸';
                const signo = trans.tipo === 'ingreso' ? '+' : '-';
                const claseMontoColor = trans.tipo === 'ingreso' ? 'tw-text-emerald' : 'tw-text-ruby';
                return `
            <div class="transaction-item tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-white/10 tw-py-4 last:tw-border-b-0">
                <div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-3">
                    <div class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-white/10 tw-backdrop-blur-md tw-text-base leading-none" aria-hidden="true">${icono}</div>
                    <div class="tw-min-w-0 tw-flex-1">
                        <div class="tw-truncate tw-font-medium tw-text-slate-800">${trans.descripcion}</div>
                        <div class="tw-text-xs tw-text-slate-500/80">${deps.formatearFecha(trans.fecha)}</div>
                    </div>
                </div>
                <div class="tw-shrink-0 tw-text-right tw-text-base tw-font-bold ${claseMontoColor}">${signo}${deps.formatearMoneda(trans.monto)}</div>
            </div>
        `;
            })
            .join('');
    }

    function generarReporte(deps) {
        const fechaInicio = document.getElementById('reporte-fecha-inicio').value;
        const fechaFin = document.getElementById('reporte-fecha-fin').value;

        let ventasFiltradas = deps.getVentas();
        let gastosFiltrados = deps.getGastos();

        if (fechaInicio) {
            ventasFiltradas = ventasFiltradas.filter((v) => v.fecha >= fechaInicio);
            gastosFiltrados = gastosFiltrados.filter((g) => g.fecha >= fechaInicio);
        }

        if (fechaFin) {
            ventasFiltradas = ventasFiltradas.filter((v) => v.fecha <= fechaFin);
            gastosFiltrados = gastosFiltrados.filter((g) => g.fecha <= fechaFin);
        }

        const totalVentas = ventasFiltradas.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
        const gananciaNeta = totalVentas - totalGastos;
        const numVentas = ventasFiltradas.length;
        const promedioVentas = numVentas > 0 ? totalVentas / numVentas : 0;

        document.getElementById('total-ventas-reporte').textContent = deps.formatearMoneda(totalVentas);
        document.getElementById('numero-ventas-reporte').textContent = numVentas;
        document.getElementById('promedio-ventas-reporte').textContent = deps.formatearMoneda(promedioVentas);

        document.getElementById('total-gastos-reporte').textContent = deps.formatearMoneda(totalGastos);

        const gananciaElement = document.getElementById('ganancia-neta-texto');
        gananciaElement.textContent = `Ganancia Neta: ${deps.formatearMoneda(gananciaNeta)}`;
        gananciaElement.className = gananciaNeta >= 0 ? 'positive' : 'negative';

        generarGraficaVentas(deps, ventasFiltradas);
        generarGraficaGastos(deps, gastosFiltrados);
        generarGraficaGanancias(deps, totalVentas, totalGastos);
        generarGraficaMensual(deps);

        mostrarProductosMasVendidos(deps, ventasFiltradas);
    }

    function generarGraficaVentas(deps, ventasFiltradas) {
        const ctx = document.getElementById('grafica-ventas').getContext('2d');

        const ventasPorFecha = {};
        ventasFiltradas.forEach((v) => {
            if (!ventasPorFecha[v.fecha]) {
                ventasPorFecha[v.fecha] = 0;
            }
            ventasPorFecha[v.fecha] += deps.obtenerMontoIngreso(v);
        });

        const fechas = Object.keys(ventasPorFecha).sort();
        const montos = fechas.map((fecha) => ventasPorFecha[fecha]);

        if (graficaVentas) {
            graficaVentas.destroy();
        }

        graficaVentas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: fechas.map((f) => deps.formatearFecha(f)),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: montos,
                        borderColor: '#1B263B',
                        backgroundColor: 'rgba(27, 38, 59, 0.1)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Ingresos en el período analizado' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function generarGraficaGastos(deps, gastosFiltrados) {
        const ctx = document.getElementById('grafica-gastos').getContext('2d');
        const info = document.getElementById('gastos-categoria-info');

        const gastosPorCategoria = {};
        gastosFiltrados.forEach((g) => {
            const categoria = deps.normalizarCategoria(g.categoria);
            if (!categoria) return;
            if (!gastosPorCategoria[categoria]) {
                gastosPorCategoria[categoria] = 0;
            }
            gastosPorCategoria[categoria] += g.monto;
        });

        const categorias = Object.keys(gastosPorCategoria);
        const montos = categorias.map((cat) => gastosPorCategoria[cat]);

        if (graficaGastos) {
            graficaGastos.destroy();
        }

        if (categorias.length === 0) {
            if (info) info.style.display = 'block';
            graficaGastos = null;
            return;
        }
        if (info) info.style.display = 'none';

        graficaGastos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categorias.map((c) => deps.etiquetaCategoriaLista(c)),
                datasets: [
                    {
                        data: montos,
                        backgroundColor: [
                            'rgba(27, 38, 59, 0.8)',
                            'rgba(119, 141, 169, 0.8)',
                            'rgba(13, 27, 42, 0.8)',
                            'rgba(27, 38, 59, 0.6)',
                            'rgba(119, 141, 169, 0.6)',
                            'rgba(13, 27, 42, 0.6)',
                            'rgba(27, 38, 59, 0.4)',
                            'rgba(119, 141, 169, 0.4)'
                        ]
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' },
                    title: { display: true, text: 'Gastos por categoría' }
                }
            }
        });
    }

    function generarGraficaGanancias(deps, ingresos, egresos) {
        const ctx = document.getElementById('grafica-ganancias').getContext('2d');

        if (graficaGanancias) {
            graficaGanancias.destroy();
        }

        graficaGanancias = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ingresos vs Gastos'],
                datasets: [
                    {
                        label: 'Ingresos',
                        data: [ingresos],
                        backgroundColor: 'rgba(119, 141, 169, 0.8)'
                    },
                    {
                        label: 'Gastos',
                        data: [egresos],
                        backgroundColor: 'rgba(27, 38, 59, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Ingresos vs Gastos' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function generarGraficaMensual(deps) {
        const ctx = document.getElementById('grafica-mensual').getContext('2d');
        const ventas = deps.getVentas();
        const gastos = deps.getGastos();

        const meses = [];
        const ingresosMensuales = [];
        const egresosMensuales = [];

        const hoy = new Date();
        for (let i = 5; i >= 0; i--) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const mesNombre = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            meses.push(deps.capitalizar(mesNombre));

            const mes = fecha.getMonth();
            const año = fecha.getFullYear();

            const ingresos = ventas
                .filter((v) => {
                    const fechaVenta = new Date(v.fecha);
                    return fechaVenta.getMonth() === mes && fechaVenta.getFullYear() === año;
                })
                .reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);

            const egresos = gastos
                .filter((g) => {
                    const fechaGasto = new Date(g.fecha);
                    return fechaGasto.getMonth() === mes && fechaGasto.getFullYear() === año;
                })
                .reduce((sum, g) => sum + g.monto, 0);

            ingresosMensuales.push(ingresos);
            egresosMensuales.push(egresos);
        }

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
                        label: 'Gastos',
                        data: egresosMensuales,
                        backgroundColor: 'rgba(27, 38, 59, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Ingresos vs Gastos por mes' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function mostrarProductosMasVendidos(deps, ventasFiltradas) {
        const contenedor = document.getElementById('productos-mas-vendidos');
        if (!contenedor) return;

        const productos = {};
        ventasFiltradas.forEach((v) => {
            if (!productos[v.descripcion]) {
                productos[v.descripcion] = { cantidad: 0, total: 0 };
            }
            productos[v.descripcion].cantidad += 1;
            productos[v.descripcion].total += deps.obtenerMontoIngreso(v);
        });

        const productosArray = Object.entries(productos)
            .map(([desc, datos]) => ({ descripcion: desc, ...datos }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (productosArray.length === 0) {
            contenedor.innerHTML = '<p class="no-data">No hay ingresos en el período analizado</p>';
            return;
        }

        contenedor.innerHTML = productosArray
            .map((prod, index) => {
                const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📌';
                return `
            <div class="product-item">
                <div>
                    <strong>${medalla} ${prod.descripcion}</strong>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">
                        Registros: ${prod.cantidad} · Total acumulado: ${deps.formatearMoneda(prod.total)}
                    </div>
                </div>
            </div>
        `;
            })
            .join('');
    }

    global.ModReportes = {
        actualizarDashboard,
        mostrarTransaccionesRecientes,
        generarReporte
    };
})(typeof window !== 'undefined' ? window : globalThis);
