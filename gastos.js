/**
 * Gastos: UI y operaciones; datos vía deps (perfil activo en app).
 *
 * Responsabilidades:
 *   - Renderizar la tabla de gastos con filtros por fecha y categoría (mostrarGastos)
 *   - Aplicar y limpiar filtros combinados (filtrarGastos / limpiarFiltroGastos)
 *   - Validar, normalizar y persistir nuevos gastos (guardarGasto)
 *   - Eliminar gastos con confirmación (eliminarGasto)
 *
 * Dependencias: todas las funciones reciben `deps` (objeto inyectado por app.js)
 * No accede directamente a IndexedDB ni localStorage.
 */
(function (global) {
    /**
     * Valida los campos de un gasto antes de persistir.
     * Retorna null si todo es correcto, o un string con el mensaje de error.
     */
    function validarGasto(fecha, descripcion, monto) {
        if (!fecha) return 'La fecha es obligatoria';

        const fechaObj = new Date(fecha + 'T00:00:00');
        if (isNaN(fechaObj.getTime())) return 'La fecha no es válida';

        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        if (fechaObj > hoy) return 'La fecha no puede ser futura';

        if (!descripcion) return 'La descripción no puede estar vacía';
        if (!monto || monto <= 0) return 'El monto debe ser mayor a cero';

        return null;
    }
    function mostrarGastos(deps, filtroFecha, filtroCategoria) {
        const tbody = document.getElementById('tbody-gastos');
        if (!tbody) return;
        let gastosFiltrados = deps.getGastos();

        if (filtroFecha) {
            gastosFiltrados = gastosFiltrados.filter((g) => g.fecha === filtroFecha);
        }
        if (filtroCategoria) {
            gastosFiltrados = gastosFiltrados.filter(
                (g) => deps.normalizarCategoria(g.categoria) === filtroCategoria
            );
        }

        gastosFiltrados = [...gastosFiltrados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (gastosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay gastos registrados</td></tr>';
            if (typeof global.renderHistorialTarjetas === 'function') {
                global.renderHistorialTarjetas('gasto', [], deps);
            }
            return;
        }

        tbody.innerHTML = gastosFiltrados
            .map((gasto) => {
                const fechaFormateada = deps.formatearFecha(gasto.fecha);
                return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${gasto.descripcion}</td>
                <td>${deps.mostrarCategoria(gasto.categoria)}</td>
                <td><strong>$${gasto.monto.toFixed(2)}</strong></td>
                <td>${deps.mostrarTextoOpcional(gasto.metodoPago)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.eliminarGasto(${gasto.id})">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `;
            })
            .join('');

        if (typeof global.renderHistorialTarjetas === 'function') {
            global.renderHistorialTarjetas('gasto', gastosFiltrados, deps);
        }
    }

    function filtrarGastos(deps) {
        const elF = document.getElementById('filtro-fecha-gastos');
        const elC = document.getElementById('filtro-categoria-gastos');
        const filtroFecha = elF && elF.value ? elF.value : '';
        const filtroCategoria = elC && elC.value ? elC.value : '';
        mostrarGastos(deps, filtroFecha || null, filtroCategoria || null);
    }

    function limpiarFiltroGastos(deps) {
        const elF = document.getElementById('filtro-fecha-gastos');
        const elC = document.getElementById('filtro-categoria-gastos');
        if (elF) elF.value = '';
        if (elC) elC.value = '';
        mostrarGastos(deps);
    }

    async function guardarGasto(deps) {
        const fecha = document.getElementById('gasto-fecha').value;
        const descripcion = document.getElementById('gasto-descripcion').value.trim();
        const categoria = deps.obtenerCategoriaGastoFinal();
        const monto = parseFloat(document.getElementById('gasto-monto').value);
        const metodoPago = document.getElementById('gasto-metodo').value;

        const errorValidacion = validarGasto(fecha, descripcion, monto);
        if (errorValidacion) {
            deps.mostrarMensaje(errorValidacion, 'error');
            return;
        }

        const nuevoGasto = {
            id: Date.now(),
            fecha: fecha,
            descripcion: descripcion,
            categoria: categoria,
            monto: monto,
            metodoPago: metodoPago || ''
        };

        const gastos = deps.getGastos();
        gastos.push(nuevoGasto);
        deps.setGastos(gastos);

        await deps.guardarGastos();

        document.getElementById('form-gasto').reset();
        deps.actualizarCategoriaPersonalizada();

        const hoy = deps.obtenerFechaLocal();
        document.getElementById('gasto-fecha').value = hoy;

        mostrarGastos(deps);
        deps.actualizarDashboard();
        deps.mostrarMensaje('✅ Gasto registrado correctamente');
    }

    async function eliminarGasto(deps, id) {
        if (confirm('¿Eliminar este registro de gasto?')) {
            const gastos = deps.getGastos().filter((g) => g.id !== id);
            deps.setGastos(gastos);
            await deps.guardarGastos();
            mostrarGastos(deps);
            deps.actualizarDashboard();
            deps.mostrarMensaje('Gasto eliminado');
        }
    }

    global.ModGastos = {
        mostrarGastos,
        filtrarGastos,
        limpiarFiltroGastos,
        guardarGasto,
        eliminarGasto,
        validarGasto
    };
})(typeof window !== 'undefined' ? window : globalThis);
