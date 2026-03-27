/**
 * PerfilManager — gestión de multi-perfil (tesorerías)
 *
 * Responsabilidades:
 *   - Mantener la lista de perfiles en localStorage (clave: contabilidad_perfiles)
 *   - Gestionar el perfil activo (clave: contabilidad_perfil_activo)
 *   - Abrir y versionar IndexedDB (ContabilidadDB); crear stores por perfil bajo demanda
 *   - Leer y escribir ventas/gastos por perfil en IndexedDB + localStorage (doble persistencia)
 *   - Migrar datos legacy (stores ventas/gastos sin prefijo de perfil) al perfil "default"
 *   - Proveer helpers de nombres: stores, claves LS, slug de caché para el SW
 *   - Borrar datos de un perfil (IndexedDB + localStorage) sin eliminar stores legacy
 *
 * Reglas de integridad:
 *   - NO borrar los stores legacy `ventas` / `gastos` — contienen datos históricos
 *   - Los IDs de perfil tienen formato `p_<timestamp>`; el perfil por defecto usa `"default"`
 *   - La migración se ejecuta solo una vez (flag: contabilidad_migracion_perfiles_v1)
 *
 * No tiene dependencias externas; expone la API como window.PerfilManager.
 */
(function (global) {
    const DB_NAME = 'ContabilidadDB';
    const DB_VERSION_TARGET = 2;

    const LEGACY_STORE_VENTAS = 'ventas';
    const LEGACY_STORE_GASTOS = 'gastos';

    const LS_PERFILES = 'contabilidad_perfiles';
    const LS_PERFIL_ACTIVO = 'contabilidad_perfil_activo';
    const LS_MIGRACION_PERFILES = 'contabilidad_migracion_perfiles_v1';

    function sanitizarIdStore(id) {
        return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
    }

    function nombreStoreVentas(profileId) {
        return 'ventas_perfil_' + sanitizarIdStore(profileId);
    }

    function nombreStoreGastos(profileId) {
        return 'gastos_perfil_' + sanitizarIdStore(profileId);
    }

    function claveLSVentas(profileId) {
        return 'contabilidad_ventas_perfil_' + sanitizarIdStore(profileId);
    }

    function claveLSGastos(profileId) {
        return 'contabilidad_gastos_perfil_' + sanitizarIdStore(profileId);
    }

    function slugCachePerfil(profileId, nombre) {
        const base = (nombre && String(nombre).trim()) || String(profileId);
        const s = base
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
        return s || 'default';
    }

    function leerPerfiles() {
        try {
            const raw = localStorage.getItem(LS_PERFILES);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    function guardarPerfiles(lista) {
        localStorage.setItem(LS_PERFILES, JSON.stringify(lista));
    }

    function obtenerPerfilActivoId() {
        return localStorage.getItem(LS_PERFIL_ACTIVO) || '';
    }

    function establecerPerfilActivo(id) {
        if (id) localStorage.setItem(LS_PERFIL_ACTIVO, id);
        else localStorage.removeItem(LS_PERFIL_ACTIVO);
    }

    function perfilPorId(id) {
        return leerPerfiles().find((p) => p.id === id) || null;
    }

    function crearPerfil(nombre) {
        const id = 'p_' + Date.now();
        const perfil = {
            id,
            nombre: (nombre && String(nombre).trim()) || 'Sin nombre',
            createdAt: new Date().toISOString()
        };
        const lista = leerPerfiles();
        lista.push(perfil);
        guardarPerfiles(lista);
        return perfil;
    }

    function eliminarPerfilDeLista(id) {
        const lista = leerPerfiles().filter((p) => p.id !== id);
        guardarPerfiles(lista);
    }

    function abrirDBConexionActual() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
        });
    }

    function obtenerVersionActual() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const v = req.result.version;
                req.result.close();
                resolve(v);
            };
        });
    }

    function copiarStoreEnTransaccion(tx, nombreOrigen, nombreDestino) {
        if (!tx.objectStoreNames.contains(nombreOrigen) || !tx.objectStoreNames.contains(nombreDestino)) {
            return;
        }
        const origen = tx.objectStore(nombreOrigen);
        const destino = tx.objectStore(nombreDestino);
        const req = origen.openCursor();
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                destino.put(cursor.value);
                cursor.continue();
            }
        };
    }

    function inicializarEsquemaBase(event) {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        if (oldVersion < 1) {
            if (!db.objectStoreNames.contains(LEGACY_STORE_VENTAS)) {
                db.createObjectStore(LEGACY_STORE_VENTAS, { keyPath: 'id', autoIncrement: false });
            }
            if (!db.objectStoreNames.contains(LEGACY_STORE_GASTOS)) {
                db.createObjectStore(LEGACY_STORE_GASTOS, { keyPath: 'id', autoIncrement: false });
            }
        }
        if (oldVersion < 2) {
            const sv = nombreStoreVentas('default');
            const sg = nombreStoreGastos('default');
            if (!db.objectStoreNames.contains(sv)) {
                db.createObjectStore(sv, { keyPath: 'id', autoIncrement: false });
            }
            if (!db.objectStoreNames.contains(sg)) {
                db.createObjectStore(sg, { keyPath: 'id', autoIncrement: false });
            }
        }
    }

    function migrarLegacyEnUpgrade(event) {
        const oldVersion = event.oldVersion;
        if (oldVersion >= 2) return;
        const tx = event.target.transaction;
        const db = event.target.result;
        const sv = nombreStoreVentas('default');
        const sg = nombreStoreGastos('default');
        if (db.objectStoreNames.contains(LEGACY_STORE_VENTAS) && db.objectStoreNames.contains(sv)) {
            copiarStoreEnTransaccion(tx, LEGACY_STORE_VENTAS, sv);
        }
        if (db.objectStoreNames.contains(LEGACY_STORE_GASTOS) && db.objectStoreNames.contains(sg)) {
            copiarStoreEnTransaccion(tx, LEGACY_STORE_GASTOS, sg);
        }
    }

    function abrirOcrearDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION_TARGET);
            req.onupgradeneeded = (event) => {
                inicializarEsquemaBase(event);
                migrarLegacyEnUpgrade(event);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                if (req.error && req.error.name === 'VersionError') {
                    const r2 = indexedDB.open(DB_NAME);
                    r2.onerror = () => reject(r2.error);
                    r2.onsuccess = () => resolve(r2.result);
                } else {
                    reject(req.error);
                }
            };
        });
    }

    function asegurarStoresPerfil(profileId) {
        const vName = nombreStoreVentas(profileId);
        const gName = nombreStoreGastos(profileId);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                const tieneV = db.objectStoreNames.contains(vName);
                const tieneG = db.objectStoreNames.contains(gName);
                const ver = db.version;
                db.close();
                if (tieneV && tieneG) {
                    resolve();
                    return;
                }
                const req2 = indexedDB.open(DB_NAME, ver + 1);
                req2.onerror = () => reject(req2.error);
                req2.onupgradeneeded = (e) => {
                    const db2 = e.target.result;
                    if (!db2.objectStoreNames.contains(vName)) {
                        db2.createObjectStore(vName, { keyPath: 'id', autoIncrement: false });
                    }
                    if (!db2.objectStoreNames.contains(gName)) {
                        db2.createObjectStore(gName, { keyPath: 'id', autoIncrement: false });
                    }
                };
                req2.onsuccess = () => {
                    req2.result.close();
                    resolve();
                };
            };
        });
    }

    function obtenerObjectStore(db, storeName, mode) {
        const transaction = db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    async function leerTodoStore(db, storeName) {
        const store = obtenerObjectStore(db, storeName, 'readonly');
        return new Promise((resolve) => {
            const r = store.getAll();
            r.onsuccess = () => resolve(r.result || []);
            r.onerror = () => resolve([]);
        });
    }

    async function escribirTodoStore(db, storeName, filas) {
        const store = obtenerObjectStore(db, storeName, 'readwrite');
        await new Promise((resolve, reject) => {
            const c = store.clear();
            c.onsuccess = () => resolve();
            c.onerror = () => reject(c.error);
        });
        for (const row of filas) {
            await new Promise((resolve, reject) => {
                const a = store.put(row);
                a.onsuccess = () => resolve();
                a.onerror = () => reject(a.error);
            });
        }
    }

    async function cargarDesdeIndexedDBPerfil(profileId) {
        await asegurarStoresPerfil(profileId);
        const db = await abrirDBConexionActual();
        try {
            const vName = nombreStoreVentas(profileId);
            const gName = nombreStoreGastos(profileId);
            const ventas = await leerTodoStore(db, vName);
            const gastos = await leerTodoStore(db, gName);
            return { ventas, gastos };
        } finally {
            db.close();
        }
    }

    function cargarDesdeLocalStoragePerfil(profileId) {
        try {
            const vRaw = localStorage.getItem(claveLSVentas(profileId));
            const gRaw = localStorage.getItem(claveLSGastos(profileId));
            const ventas = vRaw ? JSON.parse(vRaw) : [];
            const gastos = gRaw ? JSON.parse(gRaw) : [];
            return {
                ventas: Array.isArray(ventas) ? ventas : [],
                gastos: Array.isArray(gastos) ? gastos : []
            };
        } catch {
            return { ventas: [], gastos: [] };
        }
    }

    async function guardarVentasPerfil(profileId, ventas, storageStatus) {
        if (storageStatus.indexedDB) {
            await asegurarStoresPerfil(profileId);
            const db = await abrirDBConexionActual();
            try {
                await escribirTodoStore(db, nombreStoreVentas(profileId), ventas);
            } finally {
                db.close();
            }
        }
        if (storageStatus.localStorage) {
            localStorage.setItem(claveLSVentas(profileId), JSON.stringify(ventas));
        }
    }

    async function guardarGastosPerfil(profileId, gastos, storageStatus) {
        if (storageStatus.indexedDB) {
            await asegurarStoresPerfil(profileId);
            const db = await abrirDBConexionActual();
            try {
                await escribirTodoStore(db, nombreStoreGastos(profileId), gastos);
            } finally {
                db.close();
            }
        }
        if (storageStatus.localStorage) {
            localStorage.setItem(claveLSGastos(profileId), JSON.stringify(gastos));
        }
    }

    async function cargarDatosPerfil(profileId, storageStatus) {
        if (storageStatus.indexedDB) {
            try {
                const desdeIdb = await cargarDesdeIndexedDBPerfil(profileId);
                if (desdeIdb.ventas.length > 0 || desdeIdb.gastos.length > 0) {
                    return desdeIdb;
                }
                const desdeLs = cargarDesdeLocalStoragePerfil(profileId);
                if (desdeLs.ventas.length > 0 || desdeLs.gastos.length > 0) {
                    return desdeLs;
                }
                return desdeIdb;
            } catch {
                return cargarDesdeLocalStoragePerfil(profileId);
            }
        }
        if (storageStatus.localStorage) {
            return cargarDesdeLocalStoragePerfil(profileId);
        }
        return { ventas: [], gastos: [] };
    }

    function migrarListaPerfilesYLegacyLS() {
        if (localStorage.getItem(LS_MIGRACION_PERFILES) === '1') return;

        let perfiles = leerPerfiles();
        if (perfiles.length === 0) {
            perfiles = [
                {
                    id: 'default',
                    nombre: 'Principal',
                    createdAt: new Date().toISOString()
                }
            ];
            guardarPerfiles(perfiles);
        }

        const tieneLegacyVentas = localStorage.getItem('contabilidad_ventas');
        const tieneLegacyGastos = localStorage.getItem('contabilidad_gastos');
        if (tieneLegacyVentas || tieneLegacyGastos) {
            try {
                if (tieneLegacyVentas && !localStorage.getItem(claveLSVentas('default'))) {
                    localStorage.setItem(claveLSVentas('default'), tieneLegacyVentas);
                }
                if (tieneLegacyGastos && !localStorage.getItem(claveLSGastos('default'))) {
                    localStorage.setItem(claveLSGastos('default'), tieneLegacyGastos);
                }
            } catch {
                /* ignore */
            }
        }

        if (!obtenerPerfilActivoId()) {
            establecerPerfilActivo('default');
        }

        localStorage.setItem(LS_MIGRACION_PERFILES, '1');
    }

    async function borrarDatosPerfilIndexedDB(profileId) {
        await asegurarStoresPerfil(profileId);
        const db = await abrirDBConexionActual();
        try {
            const vName = nombreStoreVentas(profileId);
            const gName = nombreStoreGastos(profileId);
            await new Promise((resolve, reject) => {
                const tx = db.transaction([vName, gName], 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.objectStore(vName).clear();
                tx.objectStore(gName).clear();
            });
        } finally {
            db.close();
        }
    }

    function borrarDatosPerfilLocalStorage(profileId) {
        localStorage.removeItem(claveLSVentas(profileId));
        localStorage.removeItem(claveLSGastos(profileId));
    }

    const api = {
        DB_NAME,
        DB_VERSION_TARGET,
        LEGACY_STORE_VENTAS,
        LEGACY_STORE_GASTOS,
        LS_PERFILES,
        LS_PERFIL_ACTIVO,
        nombreStoreVentas,
        nombreStoreGastos,
        claveLSVentas,
        claveLSGastos,
        slugCachePerfil,
        sanitizarIdStore,
        leerPerfiles,
        guardarPerfiles,
        obtenerPerfilActivoId,
        establecerPerfilActivo,
        perfilPorId,
        crearPerfil,
        eliminarPerfilDeLista,
        abrirOcrearDB,
        asegurarStoresPerfil,
        obtenerVersionActual,
        cargarDatosPerfil,
        guardarVentasPerfil,
        guardarGastosPerfil,
        migrarListaPerfilesYLegacyLS,
        borrarDatosPerfilIndexedDB,
        borrarDatosPerfilLocalStorage
    };

    global.PerfilManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
