// ============================================
// SISTEMA DE CONTABILIDAD — ORQUESTADOR (multi-perfil)
// ============================================

let ventas = [];
let gastos = [];
let perfilActivoId = null;

const PM = window.PerfilManager;
const MI = window.ModIngresos;
const MG = window.ModGastos;
const MR = window.ModReportes;
const ME = window.ModExportaciones;

const ETIQUETAS_CATEGORIA_FORMAL = {
    inventario: 'Compras',
    sueldos: 'Nómina / honorarios',
    marketing: 'Publicidad'
};

const TEXTO_PIE_FORMAL_EXPORT = 'Generado con Sistema de Contabilidad — 100% offline';

const LS_LOG_ELIMINACIONES_PERFIL = 'contabilidad_log_eliminaciones_perfil';

let storageStatus = {
    indexedDB: false,
    localStorage: false,
    mode: 'unknown'
};

let deferredPrompt;

function obtenerNombrePerfilActivo() {
    const p = PM.perfilPorId(perfilActivoId);
    return p ? p.nombre : '';
}

function registrarLogEliminacionPerfil(perfilId, perfilNombre) {
    try {
        let arr = [];
        const raw = localStorage.getItem(LS_LOG_ELIMINACIONES_PERFIL);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) arr = parsed;
        }
        arr.push({
            perfilId,
            perfilNombre,
            fecha: new Date().toISOString()
        });
        if (arr.length > 100) {
            arr = arr.slice(-100);
        }
        localStorage.setItem(LS_LOG_ELIMINACIONES_PERFIL, JSON.stringify(arr));
    } catch {
        /* ignore */
    }
}

async function exportarBackupPerfilAntesEliminar(profileId) {
    const p = PM.perfilPorId(profileId);
    if (!p) return;
    const datos = await PM.cargarDatosPerfil(profileId, storageStatus);
    const payload = {
        ventas: datos.ventas,
        gastos: datos.gastos,
        exportadoEn: new Date().toISOString(),
        version: ME.JSON_VERSION,
        schema: ME.JSON_SCHEMA,
        perfilId: profileId,
        perfilNombre: p.nombre,
        totalVentas: datos.ventas.length,
        totalGastos: datos.gastos.length
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().split('T')[0];
    const slug = String(profileId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = `contabilidad-backup-${slug}-${fecha}.json`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarMensaje('✅ Respaldo descargado. Puede continuar o cancelar la eliminación.', 'success');
}

/**
 * Doble confirmación + nombre exacto. Resuelve true si el usuario confirmó; el borrado lo hace el llamador.
 */
function abrirModalEliminarPerfil(profileId) {
    const p = PM.perfilPorId(profileId);
    if (!p) return Promise.resolve(false);

    return PM.cargarDatosPerfil(profileId, storageStatus)
        .then(({ ventas: v, gastos: g }) => {
        const totalRegistros = v.length + g.length;
        const nombrePerfil = p.nombre;
        const nombreEsc = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/"/g, '&quot;');

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-eliminar-perfil-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'modal-eliminar-titulo');

            function onEscape(ev) {
                if (ev.key === 'Escape') {
                    cerrar(false);
                }
            }

            function cerrar(resultado) {
                document.removeEventListener('keydown', onEscape);
                overlay.remove();
                resolve(resultado);
            }

            overlay.innerHTML = `
                <div class="modal-eliminar-perfil">
                    <div class="modal-eliminar-paso" data-paso="1">
                        <h2 id="modal-eliminar-titulo" class="modal-eliminar-titulo">⚠️ Eliminar tesorería</h2>
                        <p class="modal-eliminar-irreversible">Acción irreversible</p>
                        <p class="modal-eliminar-texto">¿Eliminar la tesorería «<strong>${nombreEsc(
                            nombrePerfil
                        )}</strong>» y todos sus registros en este dispositivo? Esta acción no se puede deshacer.</p>
                        <p class="modal-eliminar-conteo">Registros en este perfil: <strong>${totalRegistros}</strong> (ingresos y gastos).</p>
                        ${
                            totalRegistros > 100
                                ? `<p class="modal-eliminar-alerta-grande">Este perfil contiene más de 100 registros. ¿Está seguro?</p>`
                                : ''
                        }
                        <div class="modal-eliminar-acciones-primarias">
                            <button type="button" class="btn btn-secondary btn-exportar-respaldo">📤 Exportar antes de eliminar</button>
                        </div>
                        <div class="modal-eliminar-botones">
                            <button type="button" class="btn btn-secondary modal-btn-cancelar">Cancelar</button>
                            <button type="button" class="btn btn-danger modal-btn-continuar">Continuar</button>
                        </div>
                    </div>
                    <div class="modal-eliminar-paso" data-paso="2" hidden>
                        <h2 class="modal-eliminar-titulo">⚠️ Confirmación final</h2>
                        <p class="modal-eliminar-irreversible">Acción irreversible</p>
                        <p class="modal-eliminar-texto">Para eliminar, escriba el nombre exacto de la tesorería:</p>
                        <p class="modal-eliminar-nombre-ref">«${nombreEsc(nombrePerfil)}»</p>
                        <label class="modal-eliminar-label-input" for="modal-eliminar-input-nombre">Nombre de la tesorería</label>
                        <input type="text" id="modal-eliminar-input-nombre" class="modal-eliminar-input-nombre" autocomplete="off" />
                        <div class="modal-eliminar-botones">
                            <button type="button" class="btn btn-secondary modal-btn-volver">Volver</button>
                            <button type="button" class="btn btn-danger modal-btn-eliminar-definitivo" disabled>Eliminar definitivamente</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const paso1 = overlay.querySelector('[data-paso="1"]');
            const paso2 = overlay.querySelector('[data-paso="2"]');
            const inputNombre = overlay.querySelector('#modal-eliminar-input-nombre');
            const btnEliminarDef = overlay.querySelector('.modal-btn-eliminar-definitivo');

            overlay.querySelector('.btn-exportar-respaldo').addEventListener('click', () => {
                exportarBackupPerfilAntesEliminar(profileId);
            });

            overlay.querySelector('.modal-btn-cancelar').addEventListener('click', () => cerrar(false));

            overlay.querySelector('.modal-btn-continuar').addEventListener('click', () => {
                paso1.hidden = true;
                paso2.hidden = false;
                inputNombre.focus();
            });

            overlay.querySelector('.modal-btn-volver').addEventListener('click', () => {
                paso2.hidden = true;
                paso1.hidden = false;
                inputNombre.value = '';
                btnEliminarDef.disabled = true;
            });

            function validarNombre() {
                const ok = inputNombre.value.trim() === nombrePerfil.trim();
                btnEliminarDef.disabled = !ok;
            }
            inputNombre.addEventListener('input', validarNombre);
            inputNombre.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !btnEliminarDef.disabled) {
                    btnEliminarDef.click();
                }
            });

            btnEliminarDef.addEventListener('click', () => {
                if (inputNombre.value.trim() !== nombrePerfil.trim()) {
                    mostrarMensaje('El nombre no coincide. Escríbalo exactamente como se muestra.', 'error');
                    return;
                }
                cerrar(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cerrar(false);
                }
            });

            document.addEventListener('keydown', onEscape);
        });
        })
        .catch(() => false);
}

async function ejecutarEliminacionPerfilConfirmada(id) {
    try {
        await PM.borrarDatosPerfilIndexedDB(id);
    } catch {
        /* ignore */
    }
    PM.borrarDatosPerfilLocalStorage(id);
    const p = PM.perfilPorId(id);
    const nombreLog = p ? p.nombre : id;
    PM.eliminarPerfilDeLista(id);
    registrarLogEliminacionPerfil(id, nombreLog);
    if (PM.obtenerPerfilActivoId() === id) {
        PM.establecerPerfilActivo('');
    }
    const restantes = PM.leerPerfiles();
    renderListaPerfiles();
    if (restantes.length === 0) {
        perfilActivoId = null;
        ventas = [];
        gastos = [];
        mostrarSoloVistaPerfil();
    } else if (perfilActivoId === id) {
        await entrarAppConPerfil(restantes[0].id);
    }
    mostrarMensaje('Tesorería eliminada.', 'success');
}

function notificarServiceWorkerPerfil() {
    if (!('serviceWorker' in navigator)) return;
    const enviar = () => {
        const ctrl = navigator.serviceWorker.controller;
        if (!ctrl) return;
        const p = PM.perfilPorId(perfilActivoId);
        const slug = PM.slugCachePerfil(perfilActivoId, p ? p.nombre : '');
        ctrl.postMessage({ type: 'SET_PERFIL_CACHE', slug: slug });
    };
    if (navigator.serviceWorker.controller) {
        enviar();
    } else {
        navigator.serviceWorker.ready.then(enviar);
    }
}

function crearDeps() {
    return {
        getVentas: () => ventas,
        setVentas: (v) => {
            ventas = v;
        },
        getGastos: () => gastos,
        setGastos: (g) => {
            gastos = g;
        },
        getPerfilId: () => perfilActivoId,
        getNombrePerfil: obtenerNombrePerfilActivo,
        TEXTO_PIE_FORMAL_EXPORT,
        storageStatus,
        obtenerFechaLocal,
        formatearMoneda,
        formatearFecha,
        capitalizar,
        obtenerMontoIngreso,
        mostrarMensaje,
        normalizarCategoria,
        etiquetaCategoriaLista,
        mostrarCategoria,
        mostrarTextoOpcional,
        actualizarCategoriaPersonalizada,
        obtenerCategoriaGastoFinal,
        actualizarDashboard: () => MR.actualizarDashboard(crearDeps()),
        mostrarVentas: () => MI.mostrarVentas(crearDeps()),
        mostrarGastos: () => MG.mostrarGastos(crearDeps()),
        guardarVentas: async () => {
            if (!perfilActivoId) return;
            await PM.guardarVentasPerfil(perfilActivoId, ventas, storageStatus);
        },
        guardarGastos: async () => {
            if (!perfilActivoId) return;
            await PM.guardarGastosPerfil(perfilActivoId, gastos, storageStatus);
        }
    };
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBanner = document.getElementById('install-banner');
    if (installBanner && !window.matchMedia('(display-mode: standalone)').matches) {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            installBanner.style.display = 'flex';
        }
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            navigator.serviceWorker
                .register('./service-worker.js')
                .then((reg) => {
                    // Verificar actualizaciones cada hora
                    setInterval(() => reg.update(), 3600000);

                    // Cuando hay un nuevo SW instalándose, escuchar cuando queda en espera
                    reg.addEventListener('updatefound', () => {
                        const nuevoSW = reg.installing;
                        if (!nuevoSW) return;
                        nuevoSW.addEventListener('statechange', () => {
                            if (nuevoSW.state === 'installed' && navigator.serviceWorker.controller) {
                                mostrarBannerActualizacion(nuevoSW);
                            }
                        });
                    });
                })
                .catch(() => {
                    mostrarAdvertenciaServidor();
                });

            // Cuando el SW activo nos notifica que ya tomó control (post-activación)
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_ACTUALIZADO') {
                    // El SW ya está activo; si la app no mostró el banner previo,
                    // simplemente ignoramos (la página ya es la versión nueva).
                }
            });
        } else {
            mostrarAdvertenciaServidor();
        }
    });
}

function mostrarBannerActualizacion(swEsperando) {
    if (document.getElementById('banner-actualizacion')) return;

    const banner = document.createElement('div');
    banner.id = 'banner-actualizacion';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute(
        'aria-label',
        'Nueva versión de la aplicación disponible. Actualice la página para cargar los cambios.'
    );
    banner.style.cssText = [
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%)',
        'background:#1e293b;color:white',
        'padding:14px 20px;border-radius:10px',
        'box-shadow:0 4px 20px rgba(0,0,0,0.35)',
        'z-index:10001;display:flex;align-items:center;gap:14px',
        'font-size:0.9rem;max-width:90%;white-space:nowrap'
    ].join(';');

    banner.innerHTML = `
        <span><span aria-hidden="true">🔄</span> Nueva versión disponible, refresque la página</span>
        <button type="button" id="btn-actualizar-sw"
            style="background:#10b981;color:white;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.85rem;"
            aria-label="Actualizar ahora y recargar la página">
            Actualizar ahora
        </button>
        <button type="button" id="btn-cerrar-banner-sw"
            style="background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:1.1rem;padding:0 4px;"
            aria-label="Cerrar aviso de actualización">✕</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('btn-actualizar-sw').addEventListener('click', () => {
        swEsperando.postMessage({ type: 'SKIP_WAITING' });
        banner.remove();
        window.location.reload();
    });

    document.getElementById('btn-cerrar-banner-sw').addEventListener('click', () => {
        banner.remove();
    });
}

function mostrarAdvertenciaServidor() {
    if (localStorage.getItem('servidor_advertencia_vista')) return;
    setTimeout(() => {
        const mensaje = document.createElement('div');
        mensaje.id = 'advertencia-servidor';
        mensaje.style.cssText = [
            'position:fixed;top:20px;left:50%;transform:translateX(-50%)',
            'background:linear-gradient(135deg,#ff6b6b 0%,#ee5a52 100%);color:white',
            'padding:20px 30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3)',
            'z-index:10000;max-width:90%;text-align:center'
        ].join(';');
        mensaje.innerHTML = `
            <h3 style="margin:0 0 10px 0;font-size:18px;">⚠️ Servidor Requerido</h3>
            <p style="margin:0 0 15px 0;font-size:14px;">
                Para instalar la PWA, necesitas usar un servidor local.<br>
                Abre <strong>servidor-local.html</strong> para ver las instrucciones.
            </p>
            <button type="button" onclick="this.parentElement.remove();localStorage.setItem('servidor_advertencia_vista','true');"
                    style="background:white;color:#ff6b6b;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;">
                Entendido
            </button>`;
        document.body.appendChild(mensaje);
        const style = document.createElement('style');
        style.textContent =
            '@keyframes slideDown{from{transform:translateX(-50%) translateY(-100%);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
        document.head.appendChild(style);
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    configurarInstalacionPWA();
});

async function inicializarApp() {
    PM.migrarListaPerfilesYLegacyLS();

    try {
        if (window.indexedDB) {
            const db = await PM.abrirOcrearDB();
            storageStatus.indexedDB = true;
            storageStatus.mode = 'indexeddb';
            db.close();
        }
    } catch {
        /* ignore */
    }

    try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        storageStatus.localStorage = true;
        if (storageStatus.mode === 'unknown') {
            storageStatus.mode = 'localstorage';
        }
    } catch {
        /* ignore */
    }

    perfilActivoId = PM.obtenerPerfilActivoId();
    const perfiles = PM.leerPerfiles();

    if (!perfilActivoId || !PM.perfilPorId(perfilActivoId)) {
        if (perfiles.length > 0) {
            PM.establecerPerfilActivo(perfiles[0].id);
            perfilActivoId = perfiles[0].id;
        }
    }

    renderListaPerfiles();
    configurarFormulariosPerfil();
    configurarNavegacion();
    configurarFormularios();
    configurarBorrarTodo();

    if (perfilActivoId && PM.perfilPorId(perfilActivoId)) {
        await entrarAppConPerfil(perfilActivoId);
    } else {
        mostrarSoloVistaPerfil();
    }
}

function mostrarSoloVistaPerfil() {
    const v = document.getElementById('vista-perfil');
    const m = document.getElementById('app-main');
    if (v) v.style.display = 'block';
    if (m) m.style.display = 'none';
}

function mostrarAppPrincipal() {
    const v = document.getElementById('vista-perfil');
    const m = document.getElementById('app-main');
    if (v) v.style.display = 'none';
    if (m) m.style.display = 'block';
}

async function entrarAppConPerfil(id) {
    if (!PM.perfilPorId(id)) return;
    perfilActivoId = id;
    PM.establecerPerfilActivo(id);

    const datos = await PM.cargarDatosPerfil(id, storageStatus);
    ventas = datos.ventas || [];
    gastos = datos.gastos || [];

    const elNombre = document.getElementById('perfil-activo-nombre');
    if (elNombre) elNombre.textContent = PM.perfilPorId(id).nombre;
    actualizarIndicadorEstado();

    MR.actualizarDashboard(crearDeps());
    MI.mostrarVentas(crearDeps());
    MG.mostrarGastos(crearDeps());

    const hoy = obtenerFechaLocal();
    const vf = document.getElementById('venta-fecha');
    const gf = document.getElementById('gasto-fecha');
    if (vf) vf.value = hoy;
    if (gf) gf.value = hoy;
    actualizarCategoriaPersonalizada();

    mostrarAppPrincipal();
    notificarServiceWorkerPerfil();
    verificarRecordatorioRespaldo();
}

function renderListaPerfiles() {
    const ul = document.getElementById('lista-perfiles');
    if (!ul) return;
    const perfiles = PM.leerPerfiles();
    if (perfiles.length === 0) {
        ul.innerHTML =
            '<li class="perfil-empty">No hay tesorerías registradas. Use el botón inferior para crear la primera.</li>';
        return;
    }
    ul.innerHTML = perfiles
        .map((p) => {
            const esc = (s) =>
                String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/"/g, '&quot;');
            const iconFolder =
                '<svg class="icon-svg-btn" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 7v11a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
            const iconTrash =
                '<svg class="icon-svg-btn" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            return `<li class="perfil-item" data-id="${esc(p.id)}">
                <span class="perfil-item-nombre">${esc(p.nombre)}</span>
                <div class="perfil-item-actions">
                    <button type="button" class="btn-perfil-abrir" data-action="abrir" data-id="${esc(p.id)}" aria-label="Abrir tesorería ${esc(
                        p.nombre
                    )}">${iconFolder}<span>Abrir</span></button>
                    <button type="button" class="btn-perfil-eliminar" data-action="eliminar" data-id="${esc(p.id)}" aria-label="Eliminar tesorería ${esc(
                        p.nombre
                    )}">${iconTrash}<span>Eliminar</span></button>
                </div>
            </li>`;
        })
        .join('');
}

function configurarFormulariosPerfil() {
    const btnNuevo = document.getElementById('btn-nuevo-perfil');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', async () => {
            const nombre = prompt('Nombre de la tesorería / perfil:', '');
            if (nombre === null) return;
            const perfil = PM.crearPerfil(nombre || 'Sin nombre');
            await PM.asegurarStoresPerfil(perfil.id);
            renderListaPerfiles();
            await entrarAppConPerfil(perfil.id);
        });
    }

    const lista = document.getElementById('lista-perfiles');
    if (lista) {
        lista.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (action === 'abrir') {
                await entrarAppConPerfil(id);
            } else if (action === 'eliminar') {
                if (!PM.perfilPorId(id)) return;
                const confirmado = await abrirModalEliminarPerfil(id);
                if (confirmado) {
                    await ejecutarEliminacionPerfilConfirmada(id);
                }
            }
        });
    }

    const btnCambiar = document.getElementById('btn-cambiar-perfil');
    if (btnCambiar) {
        btnCambiar.addEventListener('click', async () => {
            ventas = [];
            gastos = [];
            mostrarSoloVistaPerfil();
            renderListaPerfiles();
        });
    }
}

function configurarNavegacion() {
    const tabButtons = document.querySelectorAll('#app-main .tab-btn');
    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            tabButtons.forEach((btn) => btn.classList.remove('active'));
            document.querySelectorAll('#app-main .tab-content').forEach((c) => c.classList.remove('active'));
            button.classList.add('active');
            const el = document.getElementById(targetTab);
            if (el) el.classList.add('active');
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            const appMain = document.getElementById('app-main');
            if (appMain) appMain.scrollTop = 0;
        });
    });
}

function configurarFormularios() {
    const formVenta = document.getElementById('form-venta');
    const formGasto = document.getElementById('form-gasto');
    if (formVenta) {
        formVenta.addEventListener('submit', (e) => {
            e.preventDefault();
            MI.guardarVenta(crearDeps());
        });
    }
    if (formGasto) {
        formGasto.addEventListener('submit', (e) => {
            e.preventDefault();
            MG.guardarGasto(crearDeps());
        });
    }
    const gastoCategoria = document.getElementById('gasto-categoria');
    if (gastoCategoria) {
        gastoCategoria.addEventListener('change', actualizarCategoriaPersonalizada);
    }
}

function configurarBorrarTodo() {
    const btn = document.getElementById('btn-borrar-todo');
    if (btn) {
        btn.addEventListener('click', borrarTodosLosDatos);
    }
}

function actualizarIndicadorEstado() {
    const indicador = document.getElementById('storage-status');
    if (!indicador) return;
    if (storageStatus.indexedDB) {
        indicador.className = 'storage-status success';
        indicador.innerHTML = '✅ Registros guardados correctamente';
        indicador.title = 'IndexedDB funcionando correctamente';
    } else if (storageStatus.localStorage) {
        indicador.className = 'storage-status warning';
        indicador.innerHTML = '⚠️ Usando respaldo (localStorage)';
        indicador.title = 'No se pudo usar IndexedDB, usando localStorage';
    } else {
        indicador.className = 'storage-status error';
        indicador.innerHTML = '❌ No se pueden guardar los registros en este dispositivo';
        indicador.title = 'El almacenamiento está bloqueado.';
    }
}

async function borrarTodosLosDatos() {
    const confirm1 = confirm(
        '⚠️ Advertencia: va a eliminarse todo el historial de esta tesorería en esta aplicación.\n\n' +
            'Se borrarán todos los registros de ingresos y de gastos del perfil activo.\n\n' +
            '¿Desea continuar?'
    );
    if (!confirm1) return;

    const confirm2 = confirm(
        'Confirmación final\n\nEsta acción es irreversible y eliminará todos los registros de este perfil.\n\n' +
            'En el siguiente paso deberá escribir CONFIRMAR en mayúsculas para proceder.'
    );
    if (!confirm2) return;

    const confirm3 = prompt('Para confirmar, escribe exactamente: CONFIRMAR');
    if (confirm3 !== 'CONFIRMAR') {
        mostrarMensaje('Operación cancelada. Los registros no se modificaron.', 'info');
        return;
    }

    if (!perfilActivoId) return;

    try {
        ventas = [];
        gastos = [];
        await PM.guardarVentasPerfil(perfilActivoId, ventas, storageStatus);
        await PM.guardarGastosPerfil(perfilActivoId, gastos, storageStatus);

        MR.actualizarDashboard(crearDeps());
        MI.mostrarVentas(crearDeps());
        MG.mostrarGastos(crearDeps());
        mostrarMensaje('✅ Todos los registros de este perfil fueron eliminados.', 'success');
    } catch {
        mostrarMensaje('❌ No se pudieron eliminar los registros. Intente de nuevo.', 'error');
    }
}

function filtrarVentas() {
    MI.filtrarVentas(crearDeps());
}
function limpiarFiltroVentas() {
    MI.limpiarFiltroVentas(crearDeps());
}
function filtrarGastos() {
    MG.filtrarGastos(crearDeps());
}
function limpiarFiltroGastos() {
    MG.limpiarFiltroGastos(crearDeps());
}
function generarReporte() {
    MR.generarReporte(crearDeps());
}
function exportarPDF() {
    ME.exportarPDF(crearDeps());
}
function exportarExcel() {
    ME.exportarExcel(crearDeps());
}
function exportarPowerPoint() {
    ME.exportarPowerPoint(crearDeps());
}
function exportarDatos() {
    ME.exportarDatosMejorado(crearDeps());
}
function importarDatos() {
    ME.importarDatosMejorado(crearDeps());
}
function exportarDatosMejorado() {
    ME.exportarDatosMejorado(crearDeps());
}
function importarDatosMejorado() {
    ME.importarDatosMejorado(crearDeps());
}
async function cargarDatosImportados(event) {
    await ME.cargarDatosImportados(crearDeps(), event);
}
async function cargarDatosImportadosMejorado(event) {
    await ME.cargarDatosImportados(crearDeps(), event);
}

async function eliminarVenta(id) {
    await MI.eliminarVenta(crearDeps(), id);
}
async function eliminarGasto(id) {
    await MG.eliminarGasto(crearDeps(), id);
}

function obtenerFechaLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    const día = ahora.getDate();
    const mesStr = String(mes).padStart(2, '0');
    const díaStr = String(día).padStart(2, '0');
    return `${año}-${mesStr}-${díaStr}`;
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
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function etiquetaCategoriaLista(claveNormalizada) {
    if (!claveNormalizada) return '';
    return ETIQUETAS_CATEGORIA_FORMAL[claveNormalizada] || capitalizar(claveNormalizada);
}

function obtenerMontoIngreso(ingreso) {
    if (typeof ingreso.monto === 'number' && Number.isFinite(ingreso.monto)) {
        return ingreso.monto;
    }
    const monto = Number(ingreso.monto);
    if (Number.isFinite(monto)) {
        return monto;
    }
    const total = Number(ingreso.total);
    if (Number.isFinite(total)) {
        return total;
    }
    const cantidad = Number(ingreso.cantidad);
    const precio = Number(ingreso.precio);
    if (Number.isFinite(cantidad) && Number.isFinite(precio)) {
        return cantidad * precio;
    }
    return 0;
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

function actualizarCategoriaPersonalizada() {
    const select = document.getElementById('gasto-categoria');
    const group = document.getElementById('gasto-categoria-personalizada-group');
    const input = document.getElementById('gasto-categoria-personalizada');
    if (!select || !group || !input) return;
    const esPersonalizada = select.value === 'personalizada';
    group.style.display = esPersonalizada ? 'block' : 'none';
    input.required = esPersonalizada;
    if (!esPersonalizada) input.value = '';
}

function obtenerCategoriaGastoFinal() {
    const select = document.getElementById('gasto-categoria');
    const personalizada = document.getElementById('gasto-categoria-personalizada');
    if (!select) return '';
    if (select.value === 'personalizada') {
        return (personalizada && personalizada.value ? personalizada.value : '').trim().toLowerCase();
    }
    return (select.value || '').trim().toLowerCase();
}

function normalizarCategoria(categoria) {
    return (categoria || '').toString().trim().toLowerCase();
}

function mostrarCategoria(categoria) {
    const valor = normalizarCategoria(categoria);
    return valor ? etiquetaCategoriaLista(valor) : 'Sin categoría';
}

function mostrarTextoOpcional(valor) {
    const texto = (valor || '').toString().trim();
    return texto ? capitalizar(texto) : 'Sin especificar';
}

function configurarInstalacionPWA() {
    const installButton = document.getElementById('install-button');
    const installDismiss = document.getElementById('install-dismiss');

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                try {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        mostrarMensaje('✅ ¡App instalada! Ahora puedes abrirla desde tu pantalla de inicio.', 'success');
                    }
                    deferredPrompt = null;
                    const installBanner = document.getElementById('install-banner');
                    if (installBanner) installBanner.style.display = 'none';
                } catch {
                    mostrarMensaje('❌ Error al instalar. Verifica que uses un servidor HTTP.', 'error');
                }
            } else if (window.location.protocol === 'file:') {
                mostrarMensaje(
                    '⚠️ Para instalar, necesitas usar un servidor local. Abre servidor-local.html para instrucciones.',
                    'error'
                );
            } else {
                mostrarMensaje('💡 En iPhone: Toca el botón compartir → "Agregar a pantalla de inicio"', 'info');
            }
        });
    }

    if (installDismiss) {
        installDismiss.addEventListener('click', () => {
            const installBanner = document.getElementById('install-banner');
            if (installBanner) installBanner.style.display = 'none';
            localStorage.setItem('pwa_dismissed', Date.now().toString());
        });
    }

    const dismissed = localStorage.getItem('pwa_dismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
            const installBanner = document.getElementById('install-banner');
            if (installBanner) installBanner.style.display = 'none';
        }
    }
}

function verificarRecordatorioRespaldo() {
    const lastBackupReminder = localStorage.getItem('last_backup_reminder');
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    if (!lastBackupReminder || now - parseInt(lastBackupReminder, 10) > weekInMs) {
        setTimeout(() => {
            if (
                confirm(
                    '💾 ¿Realizó un respaldo de sus registros esta semana?\n\nSe recomienda exportar los registros con regularidad.\n\n¿Desea exportar ahora?'
                )
            ) {
                exportarDatosMejorado();
            }
            localStorage.setItem('last_backup_reminder', now.toString());
        }, 2000);
    }
}

function escHtmlHistorial(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Renderiza el historial en tarjetas (móvil). Misma fuente de datos que la tabla.
 * @param {'ingreso'|'gasto'} tipo
 * @param {Array} registros — filtrados y ordenados como en mostrarVentas / mostrarGastos
 * @param {object} deps — deps de crearDeps()
 */
function renderHistorialTarjetas(tipo, registros, deps) {
    const contId = tipo === 'ingreso' ? 'lista-ventas-cards' : 'lista-gastos-cards';
    const cont = document.getElementById(contId);
    if (!cont) return;

    if (!registros || registros.length === 0) {
        const msg = tipo === 'ingreso' ? 'No hay ingresos registrados' : 'No hay gastos registrados';
        cont.innerHTML = `<p class="historial-cards-vacio">${escHtmlHistorial(msg)}</p>`;
        return;
    }

    if (tipo === 'ingreso') {
        cont.innerHTML = registros
            .map((v) => {
                const monto = deps.obtenerMontoIngreso(v);
                const fechaTxt = deps.formatearFecha(v.fecha);
                const metodoTxt = deps.mostrarTextoOpcional(v.metodoPago);
                return (
                    '<article class="registro-card" data-id="' +
                    escHtmlHistorial(String(v.id)) +
                    '">' +
                    '<header class="registro-card__header">' +
                    '<span class="registro-card__icon" aria-hidden="true">📅</span>' +
                    '<span class="registro-card__fecha">' +
                    escHtmlHistorial(fechaTxt) +
                    '</span></header>' +
                    '<div class="registro-card__body">' +
                    '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">📝</span>' +
                    '<span class="registro-card__valor">' +
                    escHtmlHistorial(v.descripcion) +
                    '</span></div>' +
                    '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">💰</span>' +
                    '<span class="registro-card__valor registro-card__monto">' +
                    escHtmlHistorial(deps.formatearMoneda(monto)) +
                    '</span></div>' +
                    '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">💳</span>' +
                    '<span class="registro-card__valor">' +
                    escHtmlHistorial(metodoTxt) +
                    '</span></div></div>' +
                    '<footer class="registro-card__footer">' +
                    '<button type="button" class="btn btn-danger btn-small registro-card__eliminar" onclick="window.eliminarVenta(' +
                    v.id +
                    ')">🗑️ Eliminar</button></footer></article>'
                );
            })
            .join('');
        return;
    }

    cont.innerHTML = registros
        .map((g) => {
            const fechaTxt = deps.formatearFecha(g.fecha);
            const catTxt = deps.mostrarCategoria(g.categoria);
            const metodoTxt = deps.mostrarTextoOpcional(g.metodoPago);
            const montoTxt = deps.formatearMoneda(g.monto);
            return (
                '<article class="registro-card" data-id="' +
                escHtmlHistorial(String(g.id)) +
                '">' +
                '<header class="registro-card__header">' +
                '<span class="registro-card__icon" aria-hidden="true">📅</span>' +
                '<span class="registro-card__fecha">' +
                escHtmlHistorial(fechaTxt) +
                '</span></header>' +
                '<div class="registro-card__body">' +
                '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">📝</span>' +
                '<span class="registro-card__valor">' +
                escHtmlHistorial(g.descripcion) +
                '</span></div>' +
                '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">🏷️</span>' +
                '<span class="registro-card__valor">' +
                escHtmlHistorial(catTxt) +
                '</span></div>' +
                '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">💰</span>' +
                '<span class="registro-card__valor registro-card__monto">' +
                escHtmlHistorial(montoTxt) +
                '</span></div>' +
                '<div class="registro-card__fila"><span class="registro-card__icon" aria-hidden="true">💳</span>' +
                '<span class="registro-card__valor">' +
                escHtmlHistorial(metodoTxt) +
                '</span></div></div>' +
                '<footer class="registro-card__footer">' +
                '<button type="button" class="btn btn-danger btn-small registro-card__eliminar" onclick="window.eliminarGasto(' +
                g.id +
                ')">🗑️ Eliminar</button></footer></article>'
            );
        })
        .join('');
}

window.renderHistorialTarjetas = renderHistorialTarjetas;
window.eliminarVenta = eliminarVenta;
window.eliminarGasto = eliminarGasto;
window.filtrarVentas = filtrarVentas;
window.limpiarFiltroVentas = limpiarFiltroVentas;
window.filtrarGastos = filtrarGastos;
window.limpiarFiltroGastos = limpiarFiltroGastos;
window.generarReporte = generarReporte;
window.exportarPDF = exportarPDF;
window.exportarPowerPoint = exportarPowerPoint;
window.exportarExcel = exportarExcel;
window.exportarDatos = exportarDatos;
window.importarDatos = importarDatos;
window.exportarDatosMejorado = exportarDatosMejorado;
window.importarDatosMejorado = importarDatosMejorado;
window.cargarDatosImportados = cargarDatosImportados;
window.cargarDatosImportadosMejorado = cargarDatosImportadosMejorado;
