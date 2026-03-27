/**
 * Ingresos (ventas): UI y operaciones; datos vía deps (perfil activo en app).
 *
 * Responsabilidades:
 *   - Renderizar la tabla de ingresos (mostrarVentas)
 *   - Aplicar y limpiar filtros por fecha (filtrarVentas / limpiarFiltroVentas)
 *   - Validar, normalizar y persistir nuevos ingresos (guardarVenta)
 *   - Eliminar ingresos con confirmación (eliminarVenta)
 *
 * Dependencias: todas las funciones reciben `deps` (objeto inyectado por app.js)
 * No accede directamente a IndexedDB ni localStorage.
 */
(function (global) {
    /**
     * Valida los campos de un ingreso antes de persistir.
     * Retorna null si todo es correcto, o un string con el mensaje de error.
     */
    function validarIngreso(fecha, descripcion, monto) {
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
    function mostrarVentas(deps, filtroFecha) {
        const tbody = document.getElementById('tbody-ventas');
        if (!tbody) return;
        let ventasFiltradas = deps.getVentas();

        if (filtroFecha) {
            ventasFiltradas = ventasFiltradas.filter((v) => v.fecha === filtroFecha);
        }

        ventasFiltradas = [...ventasFiltradas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (ventasFiltradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay ingresos registrados</td></tr>';
            if (typeof global.renderHistorialTarjetas === 'function') {
                global.renderHistorialTarjetas('ingreso', [], deps);
            }
            return;
        }

        tbody.innerHTML = ventasFiltradas
            .map((venta) => {
                const fechaFormateada = deps.formatearFecha(venta.fecha);
                const monto = deps.obtenerMontoIngreso(venta);
                return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${venta.descripcion}</td>
                <td><strong>${deps.formatearMoneda(monto)}</strong></td>
                <td>${deps.mostrarTextoOpcional(venta.metodoPago)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.eliminarVenta(${venta.id})">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `;
            })
            .join('');

        if (typeof global.renderHistorialTarjetas === 'function') {
            global.renderHistorialTarjetas('ingreso', ventasFiltradas, deps);
        }
    }

    function filtrarVentas(deps) {
        const el = document.getElementById('filtro-fecha-ventas');
        const filtroFecha = el && el.value ? el.value : '';
        mostrarVentas(deps, filtroFecha || null);
    }

    function limpiarFiltroVentas(deps) {
        const el = document.getElementById('filtro-fecha-ventas');
        if (el) el.value = '';
        mostrarVentas(deps);
    }

    async function guardarVenta(deps) {
        const fecha = document.getElementById('venta-fecha').value;
        const descripcion = document.getElementById('venta-descripcion').value.trim();
        const monto = parseFloat(document.getElementById('venta-monto').value);
        const metodoPago = document.getElementById('venta-metodo').value;

        const errorValidacion = validarIngreso(fecha, descripcion, monto);
        if (errorValidacion) {
            deps.mostrarMensaje(errorValidacion, 'error');
            return;
        }

        const nuevaVenta = {
            id: Date.now(),
            fecha: fecha,
            descripcion: descripcion,
            cantidad: 1,
            precio: monto,
            total: monto,
            metodoPago: metodoPago || ''
        };

        const ventas = deps.getVentas();
        ventas.push(nuevaVenta);
        deps.setVentas(ventas);

        await deps.guardarVentas();

        document.getElementById('form-venta').reset();
        const hoy = deps.obtenerFechaLocal();
        document.getElementById('venta-fecha').value = hoy;

        mostrarVentas(deps);
        deps.actualizarDashboard();
        deps.mostrarMensaje('✅ Ingreso registrado correctamente');
    }

    async function eliminarVenta(deps, id) {
        if (confirm('¿Eliminar este registro de ingreso?')) {
            const ventas = deps.getVentas().filter((v) => v.id !== id);
            deps.setVentas(ventas);
            await deps.guardarVentas();
            mostrarVentas(deps);
            deps.actualizarDashboard();
            deps.mostrarMensaje('Ingreso eliminado');
        }
    }

    global.ModIngresos = {
        mostrarVentas,
        filtrarVentas,
        limpiarFiltroVentas,
        guardarVenta,
        eliminarVenta,
        validarIngreso
    };
})(typeof window !== 'undefined' ? window : globalThis);
