/**
 * ModExportaciones — generación de reportes y respaldo de datos
 *
 * Responsabilidades:
 *   - exportarPDF: genera reporte A4 con jsPDF + autotable (resumen + detalle ingresos/gastos)
 *   - exportarExcel: genera .xlsx con ExcelJS; hojas Portada, Ingresos, Gastos, Resumen, Gráficas
 *   - exportarPowerPoint: genera .pptx con PptxGenJS; slides portada, resumen, ingresos y gastos
 *   - exportarDatosMejorado: descarga JSON de respaldo con schema/version y metadatos de perfil
 *   - importarDatosMejorado: importa JSON con opción reemplazar o combinar (deduplicación por id)
 *   - cargarDatosImportados: handler para input[type=file] en el DOM
 *
 * Dependencias externas (CDN): jsPDF, jspdf-autotable, ExcelJS, JSZip, PptxGenJS, Chart.js
 * Todas las funciones reciben `deps` (objeto inyectado por app.js); no acceden a storage directamente.
 *
 * Schema JSON: 'contabilidad-multi-perfil-v1', versión '3.0'
 * API expuesta para tests: TITULO_REPORTE, filtrarRegistrosPorFecha, obtenerTextoPeriodoPdf, construirPayloadBackupJSON
 */
(function (global) {
    const JSON_SCHEMA = 'contabilidad-multi-perfil-v1';
    const JSON_VERSION = '3.0';

    /** Título mostrado en PDF, Excel y PowerPoint (solo ASCII/Latin-1: jsPDF Helvetica no renderiza bien emoji/Unicode). */
    const TITULO_REPORTE = 'Reporte de Contabilidad';

    function dibujarIconoGraficaPdf(doc, x, y) {
        doc.setFillColor(27, 38, 59);
        doc.roundedRect(x, y, 16, 16, 2, 2, 'F');
        doc.setFillColor(224, 232, 240);
        const baseY = y + 13;
        doc.rect(x + 3.5, baseY - 4, 2, 4, 'F');
        doc.rect(x + 7, baseY - 7, 2, 7, 'F');
        doc.rect(x + 10.5, baseY - 5.5, 2, 5.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
    }

    function textoCategoriaPdf(deps, categoria) {
        const v = deps.normalizarCategoria(categoria);
        return v ? deps.etiquetaCategoriaLista(v) : 'Sin categoría';
    }

    function asegurarEspacioPdf(doc, yActual, alturaNecesariaMm) {
        const pageH = doc.internal.pageSize.getHeight();
        const margenInferior = 28;
        if (yActual + alturaNecesariaMm > pageH - margenInferior) {
            doc.addPage();
            return 18;
        }
        return yActual;
    }

    function aplicarPiePaginaPdf(doc, textoPie) {
        const totalPages = doc.internal.getNumberOfPages();
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(110, 110, 110);
            doc.setFont('helvetica', 'normal');
            doc.text(textoPie, 14, pageH - 8);
            if (totalPages > 1) {
                doc.text('Página ' + i + ' de ' + totalPages, pageW - 14, pageH - 8, { align: 'right' });
            }
        }
    }

    function celdaEsPlaceholderPdf(valor) {
        const s = String(valor);
        return s === 'Sin categoría' || s === 'Sin especificar';
    }

    function obtenerFiltrosReportePdf() {
        const elIni = document.getElementById('reporte-fecha-inicio');
        const elFin = document.getElementById('reporte-fecha-fin');
        const fechaInicio = elIni && elIni.value ? elIni.value.trim() : '';
        const fechaFin = elFin && elFin.value ? elFin.value.trim() : '';
        return { fechaInicio, fechaFin };
    }

    function filtrarRegistrosPorFecha(items, getFecha, fechaInicio, fechaFin) {
        return items.filter((item) => {
            const f = getFecha(item);
            if (fechaInicio && f < fechaInicio) return false;
            if (fechaFin && f > fechaFin) return false;
            return true;
        });
    }

    function obtenerTextoPeriodoPdf(deps, fechaInicio, fechaFin, ventasTotales, gastosTotales, ventasFiltradas, gastosFiltradas) {
        let ini = '';
        let fin = '';
        if (fechaInicio && fechaFin) {
            ini = fechaInicio;
            fin = fechaFin;
        } else if (fechaInicio && !fechaFin) {
            ini = fechaInicio;
            const fechas = [];
            ventasFiltradas.forEach((v) => fechas.push(v.fecha));
            gastosFiltradas.forEach((g) => fechas.push(g.fecha));
            fechas.sort();
            fin = fechas.length > 0 ? fechas[fechas.length - 1] : fechaInicio;
        } else if (!fechaInicio && fechaFin) {
            fin = fechaFin;
            const fechas = [];
            ventasFiltradas.forEach((v) => fechas.push(v.fecha));
            gastosFiltradas.forEach((g) => fechas.push(g.fecha));
            fechas.sort();
            ini = fechas.length > 0 ? fechas[0] : fechaFin;
        } else {
            const fechas = [];
            ventasTotales.forEach((v) => {
                if (v.fecha) fechas.push(v.fecha);
            });
            gastosTotales.forEach((g) => {
                if (g.fecha) fechas.push(g.fecha);
            });
            if (fechas.length === 0) {
                return 'Período: sin movimientos registrados';
            }
            fechas.sort();
            ini = fechas[0];
            fin = fechas[fechas.length - 1];
        }
        return 'Período: ' + deps.formatearFecha(ini) + ' a ' + deps.formatearFecha(fin);
    }

    function exportarPDF(deps) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            deps.mostrarMensaje('No se pudo cargar jsPDF.', 'error');
            return;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const fechaIso = new Date().toISOString().split('T')[0];
        const fechaTitulo = deps.formatearFecha(fechaIso);
        const { fechaInicio, fechaFin } = obtenerFiltrosReportePdf();

        const ventas = deps.getVentas();
        const gastos = deps.getGastos();
        const ventasPdf = filtrarRegistrosPorFecha(ventas, (v) => v.fecha, fechaInicio, fechaFin);
        const gastosPdf = filtrarRegistrosPorFecha(gastos, (g) => g.fecha, fechaInicio, fechaFin);

        const textoPeriodo = obtenerTextoPeriodoPdf(
            deps,
            fechaInicio,
            fechaFin,
            ventas,
            gastos,
            ventasPdf,
            gastosPdf
        );

        dibujarIconoGraficaPdf(doc, 14, 11);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.setTextColor(13, 27, 42);
        const alturaLineaTitulo = 7;
        const yTitulo = 19;
        doc.text(TITULO_REPORTE.trim(), 33, yTitulo);
        const ySubtitulo = yTitulo + alturaLineaTitulo + 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(82, 82, 82);
        doc.text('Generado el ' + fechaTitulo, 33, ySubtitulo);
        const perfilTxt = deps.getNombrePerfil ? deps.getNombrePerfil() : '';
        let yLinea = ySubtitulo + 7;
        if (perfilTxt) {
            doc.setFontSize(9.5);
            doc.setTextColor(70, 70, 70);
            doc.text('Perfil / tesorería: ' + perfilTxt, 33, yLinea);
            yLinea += 6;
        }
        const yPeriodo = yLinea;
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(textoPeriodo, 33, yPeriodo);
        const startYResumen = yPeriodo + 9;

        const totalIngresos = ventasPdf.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const totalGastos = gastosPdf.reduce((sum, g) => sum + g.monto, 0);
        const gananciaNeta = totalIngresos - totalGastos;

        if (typeof doc.autoTable !== 'function') {
            deps.mostrarMensaje('No se pudo cargar el plugin de tablas para PDF.', 'error');
            return;
        }

        const estiloLineaSuave = { lineColor: [218, 222, 230], lineWidth: 0.05 };

        doc.autoTable({
            startY: startYResumen,
            head: [['Concepto', 'Importe']],
            body: [
                ['Total de Ingresos', deps.formatearMoneda(totalIngresos)],
                ['Total de Gastos', deps.formatearMoneda(totalGastos)],
                ['Ganancia Neta', deps.formatearMoneda(gananciaNeta)]
            ],
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3.8,
                font: 'helvetica',
                textColor: [45, 45, 45],
                ...estiloLineaSuave
            },
            headStyles: {
                fillColor: [27, 38, 59],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left',
                fontSize: 10
            },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'normal' }
            },
            alternateRowStyles: { fillColor: [252, 253, 255] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.row.index === 2) {
                    data.cell.styles.fontStyle = 'bold';
                    const color = gananciaNeta >= 0 ? [16, 185, 129] : [239, 68, 68];
                    data.cell.styles.textColor = color;
                }
            },
            margin: { left: 14, right: 14, bottom: 24 }
        });

        let cursorY = doc.lastAutoTable.finalY + 12;

        const tablaOpts = {
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                font: 'helvetica',
                textColor: [45, 45, 45],
                ...estiloLineaSuave
            },
            headStyles: {
                fillColor: [27, 38, 59],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9
            },
            alternateRowStyles: { fillColor: [244, 247, 249] },
            didParseCell: function (data) {
                if (data.section === 'body' && celdaEsPlaceholderPdf(data.cell.raw)) {
                    data.cell.styles.textColor = [170, 170, 170];
                }
            },
            margin: { left: 14, right: 14, bottom: 24 }
        };

        cursorY = asegurarEspacioPdf(doc, cursorY, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(27, 38, 59);
        doc.text('Detalle de Ingresos', 14, cursorY);
        cursorY += 6;

        const filasIngresos = [...ventasPdf]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map((v) => [
                deps.formatearFecha(v.fecha),
                v.descripcion,
                deps.formatearMoneda(deps.obtenerMontoIngreso(v)),
                deps.mostrarTextoOpcional(v.metodoPago)
            ]);
        if (filasIngresos.length === 0) {
            filasIngresos.push(['—', 'Sin registros', '—', '—']);
        }

        doc.autoTable({
            ...tablaOpts,
            startY: cursorY,
            head: [['Fecha', 'Descripción', 'Monto', 'Método de Pago']],
            body: filasIngresos,
            columnStyles: {
                2: { halign: 'right' }
            }
        });

        cursorY = doc.lastAutoTable.finalY + 12;
        cursorY = asegurarEspacioPdf(doc, cursorY, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(27, 38, 59);
        doc.text('Detalle de Gastos', 14, cursorY);
        cursorY += 6;

        const filasGastos = [...gastosPdf]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map((g) => [
                deps.formatearFecha(g.fecha),
                g.descripcion,
                deps.formatearMoneda(g.monto),
                textoCategoriaPdf(deps, g.categoria),
                deps.mostrarTextoOpcional(g.metodoPago)
            ]);
        if (filasGastos.length === 0) {
            filasGastos.push(['—', 'Sin registros', '—', '—', '—']);
        }

        doc.autoTable({
            ...tablaOpts,
            startY: cursorY,
            head: [['Fecha', 'Descripción', 'Monto', 'Categoría', 'Método de Pago']],
            body: filasGastos,
            columnStyles: {
                2: { halign: 'right' }
            }
        });

        aplicarPiePaginaPdf(doc, deps.TEXTO_PIE_FORMAL_EXPORT);

        const slug = (deps.getPerfilId && deps.getPerfilId()) || 'perfil';
        doc.save(`reporte-contabilidad-${slug}-${fechaIso}.pdf`);
        deps.mostrarMensaje('✅ PDF generado correctamente');
    }

    function agregarLogoVectorialPptx(slide) {
        const fondo = '1B263B';
        const barra = 'E0E1DD';
        slide.addShape('rect', {
            x: 9.05,
            y: 0.38,
            w: 0.52,
            h: 0.52,
            fill: { color: fondo },
            line: { width: 0 }
        });
        slide.addShape('rect', {
            x: 9.14,
            y: 0.62,
            w: 0.07,
            h: 0.14,
            fill: { color: barra },
            line: { width: 0 }
        });
        slide.addShape('rect', {
            x: 9.235,
            y: 0.56,
            w: 0.07,
            h: 0.2,
            fill: { color: barra },
            line: { width: 0 }
        });
        slide.addShape('rect', {
            x: 9.33,
            y: 0.595,
            w: 0.07,
            h: 0.165,
            fill: { color: barra },
            line: { width: 0 }
        });
    }

    function celdaPptx(texto, fillHex, alinear, esPlaceholder) {
        const color = esPlaceholder ? 'AAAAAA' : '2D3748';
        return {
            text: String(texto),
            options: {
                fill: { color: fillHex },
                color,
                fontFace: 'Calibri',
                fontSize: 8,
                align: alinear || 'left',
                valign: 'middle',
                margin: [3, 5, 3, 5]
            }
        };
    }

    function celdaEncabezadoPptx(texto, alinear) {
        return {
            text: String(texto),
            options: {
                bold: true,
                fill: { color: '1B263B' },
                color: 'FFFFFF',
                fontFace: 'Calibri',
                fontSize: 9,
                align: alinear || 'left',
                valign: 'middle',
                margin: [4, 5, 4, 5]
            }
        };
    }

    function agregarPieFormalPptx(slide, textoPie) {
        slide.addText(textoPie, {
            x: 0.55,
            y: 5.2,
            w: 8.9,
            h: 0.35,
            fontSize: 8,
            color: '888888',
            fontFace: 'Calibri'
        });
    }

    async function exportarPowerPoint(deps) {
        const PptxCtor =
            typeof PptxGenJS !== 'undefined'
                ? PptxGenJS
                : typeof window !== 'undefined' && window.PptxGenJS
                  ? window.PptxGenJS
                  : null;
        if (!PptxCtor) {
            deps.mostrarMensaje('No se pudo cargar PptxGenJS. Revisa tu conexión.', 'error');
            return;
        }
        try {
            const pptx = new PptxCtor();
            pptx.layout = 'LAYOUT_16x9';
            pptx.author = 'Mi Contabilidad';
            pptx.title = TITULO_REPORTE;

            const fechaIso = new Date().toISOString().split('T')[0];
            const fechaTitulo = deps.formatearFecha(fechaIso);
            const { fechaInicio, fechaFin } = obtenerFiltrosReportePdf();
            const ventas = deps.getVentas();
            const gastos = deps.getGastos();
            const ventasPpt = filtrarRegistrosPorFecha(ventas, (v) => v.fecha, fechaInicio, fechaFin);
            const gastosPpt = filtrarRegistrosPorFecha(gastos, (g) => g.fecha, fechaInicio, fechaFin);
            const textoPeriodo = obtenerTextoPeriodoPdf(
                deps,
                fechaInicio,
                fechaFin,
                ventas,
                gastos,
                ventasPpt,
                gastosPpt
            );

            const totalIngresos = ventasPpt.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
            const totalGastos = gastosPpt.reduce((sum, g) => sum + g.monto, 0);
            const gananciaNeta = totalIngresos - totalGastos;
            const colorGanancia = gananciaNeta >= 0 ? '10B981' : 'EF4444';

            const slidePortada = pptx.addSlide();
            slidePortada.background = { color: 'F8FAFC' };
            agregarLogoVectorialPptx(slidePortada);
            slidePortada.addText(TITULO_REPORTE, {
                x: 0.55,
                y: 1.55,
                w: 8.9,
                h: 0.85,
                fontSize: 28,
                bold: true,
                color: '0D1B2A',
                fontFace: 'Calibri'
            });
            slidePortada.addText('Generado el ' + fechaTitulo, {
                x: 0.55,
                y: 2.45,
                w: 8.9,
                h: 0.4,
                fontSize: 14,
                color: '555555',
                fontFace: 'Calibri'
            });
            const nombreP = deps.getNombrePerfil ? deps.getNombrePerfil() : '';
            let yExtra = 2.88;
            if (nombreP) {
                slidePortada.addText('Perfil / tesorería: ' + nombreP, {
                    x: 0.55,
                    y: yExtra,
                    w: 8.9,
                    h: 0.4,
                    fontSize: 12,
                    color: '444444',
                    fontFace: 'Calibri'
                });
                yExtra += 0.42;
            }
            slidePortada.addText(textoPeriodo, {
                x: 0.55,
                y: yExtra,
                w: 8.9,
                h: 0.4,
                fontSize: 12,
                color: '666666',
                fontFace: 'Calibri'
            });
            agregarPieFormalPptx(slidePortada, deps.TEXTO_PIE_FORMAL_EXPORT);

            const slideResumen = pptx.addSlide();
            slideResumen.background = { color: 'FFFFFF' };
            slideResumen.addText('Resumen General', {
                x: 0.5,
                y: 0.35,
                w: 9,
                h: 0.45,
                fontSize: 20,
                bold: true,
                color: '1B263B',
                fontFace: 'Calibri'
            });
            const filasResumen = [
                [celdaEncabezadoPptx('Concepto'), celdaEncabezadoPptx('Importe', 'right')],
                [
                    celdaPptx('Total de Ingresos', 'FFFFFF', 'left', false),
                    celdaPptx(deps.formatearMoneda(totalIngresos), 'FFFFFF', 'right', false)
                ],
                [
                    celdaPptx('Total de Gastos', 'F4F7F9', 'left', false),
                    celdaPptx(deps.formatearMoneda(totalGastos), 'F4F7F9', 'right', false)
                ],
                [
                    {
                        text: 'Ganancia Neta',
                        options: {
                            bold: true,
                            fill: { color: 'FFFFFF' },
                            color: colorGanancia,
                            fontFace: 'Calibri',
                            fontSize: 9,
                            align: 'left',
                            valign: 'middle',
                            margin: [4, 5, 4, 5]
                        }
                    },
                    {
                        text: deps.formatearMoneda(gananciaNeta),
                        options: {
                            bold: true,
                            fill: { color: 'FFFFFF' },
                            color: colorGanancia,
                            fontFace: 'Calibri',
                            fontSize: 9,
                            align: 'right',
                            valign: 'middle',
                            margin: [4, 5, 4, 5]
                        }
                    }
                ]
            ];
            slideResumen.addTable(filasResumen, {
                x: 0.5,
                y: 1,
                w: 9,
                colW: [5.4, 3.6],
                border: { type: 'solid', color: 'DDE1E8', pt: 0.5 }
            });
            agregarPieFormalPptx(slideResumen, deps.TEXTO_PIE_FORMAL_EXPORT);

            const slideIngresos = pptx.addSlide();
            slideIngresos.background = { color: 'FFFFFF' };
            slideIngresos.addText('Detalle de Ingresos', {
                x: 0.5,
                y: 0.35,
                w: 9,
                h: 0.45,
                fontSize: 20,
                bold: true,
                color: '1B263B',
                fontFace: 'Calibri'
            });
            const cabIngresos = [
                celdaEncabezadoPptx('Fecha'),
                celdaEncabezadoPptx('Descripción'),
                celdaEncabezadoPptx('Monto', 'right'),
                celdaEncabezadoPptx('Método de Pago')
            ];
            const filasIngresos = [cabIngresos];
            const listaIngresos = [...ventasPpt].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            if (listaIngresos.length === 0) {
                filasIngresos.push([
                    celdaPptx('—', 'FFFFFF', 'left', false),
                    celdaPptx('Sin registros', 'FFFFFF', 'left', false),
                    celdaPptx('—', 'FFFFFF', 'right', false),
                    celdaPptx('—', 'FFFFFF', 'left', false)
                ]);
            } else {
                listaIngresos.forEach((v, i) => {
                    const fill = i % 2 === 0 ? 'FFFFFF' : 'F4F7F9';
                    const metodo = deps.mostrarTextoOpcional(v.metodoPago);
                    filasIngresos.push([
                        celdaPptx(deps.formatearFecha(v.fecha), fill, 'left', false),
                        celdaPptx(v.descripcion || '—', fill, 'left', false),
                        celdaPptx(deps.formatearMoneda(deps.obtenerMontoIngreso(v)), fill, 'right', false),
                        celdaPptx(metodo, fill, 'left', celdaEsPlaceholderPdf(metodo))
                    ]);
                });
            }
            slideIngresos.addTable(filasIngresos, {
                x: 0.5,
                y: 0.95,
                w: 9,
                colW: [1.15, 3.35, 1.35, 1.65],
                border: { type: 'solid', color: 'DDE1E8', pt: 0.5 }
            });
            agregarPieFormalPptx(slideIngresos, deps.TEXTO_PIE_FORMAL_EXPORT);

            const slideGastos = pptx.addSlide();
            slideGastos.background = { color: 'FFFFFF' };
            slideGastos.addText('Detalle de Gastos', {
                x: 0.5,
                y: 0.35,
                w: 9,
                h: 0.45,
                fontSize: 20,
                bold: true,
                color: '1B263B',
                fontFace: 'Calibri'
            });
            const cabGastos = [
                celdaEncabezadoPptx('Fecha'),
                celdaEncabezadoPptx('Descripción'),
                celdaEncabezadoPptx('Monto', 'right'),
                celdaEncabezadoPptx('Categoría'),
                celdaEncabezadoPptx('Método de Pago')
            ];
            const filasGastos = [cabGastos];
            const listaGastos = [...gastosPpt].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            if (listaGastos.length === 0) {
                filasGastos.push([
                    celdaPptx('—', 'FFFFFF', 'left', false),
                    celdaPptx('Sin registros', 'FFFFFF', 'left', false),
                    celdaPptx('—', 'FFFFFF', 'right', false),
                    celdaPptx('—', 'FFFFFF', 'left', false),
                    celdaPptx('—', 'FFFFFF', 'left', false)
                ]);
            } else {
                listaGastos.forEach((g, i) => {
                    const fill = i % 2 === 0 ? 'FFFFFF' : 'F4F7F9';
                    const cat = textoCategoriaPdf(deps, g.categoria);
                    const metodo = deps.mostrarTextoOpcional(g.metodoPago);
                    filasGastos.push([
                        celdaPptx(deps.formatearFecha(g.fecha), fill, 'left', false),
                        celdaPptx(g.descripcion || '—', fill, 'left', false),
                        celdaPptx(deps.formatearMoneda(g.monto), fill, 'right', false),
                        celdaPptx(cat, fill, 'left', celdaEsPlaceholderPdf(cat)),
                        celdaPptx(metodo, fill, 'left', celdaEsPlaceholderPdf(metodo))
                    ]);
                });
            }
            slideGastos.addTable(filasGastos, {
                x: 0.5,
                y: 0.95,
                w: 9,
                colW: [1.05, 2.65, 1.25, 1.45, 1.6],
                border: { type: 'solid', color: 'DDE1E8', pt: 0.5 }
            });
            agregarPieFormalPptx(slideGastos, deps.TEXTO_PIE_FORMAL_EXPORT);

            const slug = (deps.getPerfilId && deps.getPerfilId()) || 'perfil';
            await pptx.writeFile({ fileName: `reporte_contabilidad_${slug}.pptx` });
            deps.mostrarMensaje('✅ PowerPoint generado correctamente');
        } catch {
            deps.mostrarMensaje('No se pudo generar el archivo PowerPoint.', 'error');
        }
    }

    function obtenerExcelJS() {
        const candidatos = [];
        if (typeof ExcelJS !== 'undefined') candidatos.push(ExcelJS);
        if (typeof window !== 'undefined') {
            if (window.ExcelJS) candidatos.push(window.ExcelJS);
            if (window.exceljs) candidatos.push(window.exceljs);
        }
        for (let i = 0; i < candidatos.length; i++) {
            const lib = candidatos[i];
            if (lib && lib.Workbook) {
                return lib;
            }
            if (lib && lib.default && lib.default.Workbook) {
                return lib.default;
            }
        }
        return null;
    }

    function textoCategoriaExport(deps, categoria) {
        const v = deps.normalizarCategoria(categoria);
        return v ? deps.etiquetaCategoriaLista(v) : 'Sin especificar';
    }

    function canvasABase64PNG(canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const parts = dataUrl.split(',');
        return parts.length > 1 ? parts[1] : '';
    }

    async function esperarFrameRender() {
        await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
    }

    async function generarImagenIngresosVsGastos(deps) {
        const ventas = deps.getVentas();
        const gastos = deps.getGastos();
        const totalIngresos = ventas.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 320;
        canvas.style.position = 'fixed';
        canvas.style.left = '-9999px';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ingresos vs Gastos'],
                datasets: [
                    {
                        label: 'Ingresos',
                        data: [totalIngresos],
                        backgroundColor: 'rgba(119, 141, 169, 0.8)'
                    },
                    {
                        label: 'Gastos',
                        data: [totalGastos],
                        backgroundColor: 'rgba(27, 38, 59, 0.8)'
                    }
                ]
            },
            options: {
                responsive: false,
                animation: false,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Ingresos vs Gastos' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        await esperarFrameRender();
        const b64 = canvasABase64PNG(canvas);
        chart.destroy();
        canvas.remove();
        return b64;
    }

    async function generarImagenGastosPorCategoria(deps) {
        const gastos = deps.getGastos();
        if (gastos.length === 0) {
            return null;
        }
        const gastosPorCategoria = {};
        gastos.forEach((g) => {
            const cat = deps.normalizarCategoria(g.categoria);
            const key = cat || '__sin__';
            if (!gastosPorCategoria[key]) {
                gastosPorCategoria[key] = 0;
            }
            gastosPorCategoria[key] += g.monto;
        });
        const labels = Object.keys(gastosPorCategoria).map((k) =>
            k === '__sin__' ? 'Sin especificar' : deps.etiquetaCategoriaLista(k)
        );
        const data = Object.keys(gastosPorCategoria).map((k) => gastosPorCategoria[k]);
        const colors = [
            'rgba(27, 38, 59, 0.85)',
            'rgba(119, 141, 169, 0.85)',
            'rgba(13, 27, 42, 0.85)',
            'rgba(27, 38, 59, 0.65)',
            'rgba(119, 141, 169, 0.65)',
            'rgba(13, 27, 42, 0.65)',
            'rgba(27, 38, 59, 0.45)',
            'rgba(119, 141, 169, 0.45)'
        ];
        const bg = labels.map((_, i) => colors[i % colors.length]);
        const canvas = document.createElement('canvas');
        canvas.width = 520;
        canvas.height = 360;
        canvas.style.position = 'fixed';
        canvas.style.left = '-9999px';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: bg
                    }
                ]
            },
            options: {
                responsive: false,
                animation: false,
                plugins: {
                    legend: { display: true, position: 'right' },
                    title: { display: true, text: 'Gastos por categoría' }
                }
            }
        });
        await esperarFrameRender();
        const b64 = canvasABase64PNG(canvas);
        chart.destroy();
        canvas.remove();
        return b64;
    }

    async function exportarExcel(deps) {
        const ExcelJSlib = obtenerExcelJS();
        if (!ExcelJSlib) {
            deps.mostrarMensaje('No se pudo cargar la librería Excel. Revisa tu conexión.', 'error');
            return;
        }
        if (typeof Chart === 'undefined') {
            deps.mostrarMensaje('No se pudo cargar Chart.js para las gráficas.', 'error');
            return;
        }
        try {
            const wb = new ExcelJSlib.Workbook();
            wb.creator = 'Mi Contabilidad';
            wb.created = new Date();

            const ventas = deps.getVentas();
            const gastos = deps.getGastos();
            const fechaTituloExcel = deps.formatearFecha(new Date().toISOString().split('T')[0]);
            const textoPeriodoExcel = obtenerTextoPeriodoPdf(deps, '', '', ventas, gastos, ventas, gastos);
            const wsPortada = wb.addWorksheet('Portada');
            wsPortada.getCell('A1').value = TITULO_REPORTE;
            wsPortada.getCell('A1').font = { bold: true, size: 16 };
            wsPortada.getCell('A2').value = 'Generado el ' + fechaTituloExcel;
            const nombreP = deps.getNombrePerfil ? deps.getNombrePerfil() : '';
            if (nombreP) {
                wsPortada.getCell('A3').value = 'Perfil / tesorería: ' + nombreP;
                wsPortada.getCell('A4').value = textoPeriodoExcel;
                wsPortada.getCell('A5').value = deps.TEXTO_PIE_FORMAL_EXPORT;
            } else {
                wsPortada.getCell('A3').value = textoPeriodoExcel;
                wsPortada.getCell('A4').value = deps.TEXTO_PIE_FORMAL_EXPORT;
            }
            wsPortada.getColumn(1).width = 52;

            const totalIngresos = ventas.reduce((sum, v) => sum + deps.obtenerMontoIngreso(v), 0);
            const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
            const balance = totalIngresos - totalGastos;

            const wsIngresos = wb.addWorksheet('Ingresos');
            wsIngresos.columns = [
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Descripción', key: 'descripcion', width: 36 },
                { header: 'Monto', key: 'monto', width: 14 },
                { header: 'Método de Pago', key: 'metodo', width: 20 }
            ];
            wsIngresos.getRow(1).font = { bold: true };
            [...ventas]
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .forEach((v) => {
                    wsIngresos.addRow({
                        fecha: v.fecha,
                        descripcion: v.descripcion,
                        monto: deps.obtenerMontoIngreso(v),
                        metodo: deps.mostrarTextoOpcional(v.metodoPago)
                    });
                });
            wsIngresos.getColumn(3).numFmt = '#,##0.00';

            const wsGastos = wb.addWorksheet('Gastos');
            wsGastos.columns = [
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Descripción', key: 'descripcion', width: 36 },
                { header: 'Monto', key: 'monto', width: 14 },
                { header: 'Categoría', key: 'categoria', width: 22 },
                { header: 'Método de Pago', key: 'metodo', width: 20 }
            ];
            wsGastos.getRow(1).font = { bold: true };
            [...gastos]
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .forEach((g) => {
                    wsGastos.addRow({
                        fecha: g.fecha,
                        descripcion: g.descripcion,
                        monto: g.monto,
                        categoria: textoCategoriaExport(deps, g.categoria),
                        metodo: deps.mostrarTextoOpcional(g.metodoPago)
                    });
                });
            wsGastos.getColumn(3).numFmt = '#,##0.00';

            const wsResumen = wb.addWorksheet('Resumen');
            wsResumen.columns = [
                { header: 'Concepto', key: 'c', width: 36 },
                { header: 'Monto', key: 'm', width: 18 }
            ];
            wsResumen.getRow(1).font = { bold: true };
            wsResumen.addRow({ c: 'Total ingresos', m: totalIngresos });
            wsResumen.addRow({ c: 'Total gastos', m: totalGastos });
            wsResumen.addRow({ c: 'Balance (ingresos - gastos)', m: balance });
            wsResumen.getColumn(2).numFmt = '#,##0.00';

            const wsGraficas = wb.addWorksheet('Graficas');
            wsGraficas.mergeCells('A1:H1');
            const tituloGraf = wsGraficas.getCell('A1');
            tituloGraf.value = 'Anexos: Ingresos vs Gastos y desglose por categoría';
            tituloGraf.font = { bold: true, size: 14 };

            const img1 = await generarImagenIngresosVsGastos(deps);
            if (img1) {
                const id1 = wb.addImage({ base64: img1, extension: 'png' });
                wsGraficas.addImage(id1, {
                    tl: { col: 0, row: 2 },
                    ext: { width: 480, height: 280 }
                });
            }

            const img2 = await generarImagenGastosPorCategoria(deps);
            if (img2) {
                const id2 = wb.addImage({ base64: img2, extension: 'png' });
                wsGraficas.addImage(id2, {
                    tl: { col: 0, row: 22 },
                    ext: { width: 440, height: 300 }
                });
            } else {
                wsGraficas.getCell('A24').value =
                    'Sin categorías para desglose, se muestran solo totales; no se genera gráfico por categoría.';
            }

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const slug = (deps.getPerfilId && deps.getPerfilId()) || 'perfil';
            link.download = `contabilidad_${slug}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);

            deps.mostrarMensaje('✅ Excel descargado correctamente', 'success');
        } catch {
            deps.mostrarMensaje('No se pudo generar el archivo Excel.', 'error');
        }
    }

    /**
     * Construye el objeto JSON de respaldo (sin descargar). Útil para tests y validaciones.
     */
    function construirPayloadBackupJSON(deps) {
        const ventas = deps.getVentas();
        const gastos = deps.getGastos();
        const perfilId = deps.getPerfilId ? deps.getPerfilId() : '';
        const perfilNombre = deps.getNombrePerfil ? deps.getNombrePerfil() : '';
        return {
            ventas: ventas,
            gastos: gastos,
            exportadoEn: new Date().toISOString(),
            version: JSON_VERSION,
            schema: JSON_SCHEMA,
            perfilId: perfilId,
            perfilNombre: perfilNombre,
            totalVentas: ventas.length,
            totalGastos: gastos.length
        };
    }

    function exportarDatosMejorado(deps) {
        try {
            const datos = construirPayloadBackupJSON(deps);

            const json = JSON.stringify(datos, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const fecha = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = url;
            const slug = datos.perfilId || 'perfil';
            link.download = `contabilidad-backup-${slug}-${fecha}.json`;
            link.click();

            URL.revokeObjectURL(url);

            deps.mostrarMensaje('✅ Archivo de respaldo descargado. Consérvelo en un lugar seguro.', 'success');

            localStorage.setItem('last_backup_reminder', Date.now().toString());

            setTimeout(() => {
                alert(
                    '💡 Importante\n\n' +
                        '1. Este archivo contiene todos los registros de ingresos y gastos del perfil activo.\n' +
                        '2. Incluye metadatos de perfil para importar en el mismo u otro perfil.\n' +
                        '3. Consérvelo en un lugar seguro (nube o copia local).\n' +
                        '4. Se recomienda repetir el respaldo con periodicidad habitual.'
                );
            }, 500);
        } catch {
            deps.mostrarMensaje('❌ Error al exportar registros', 'error');
        }
    }

    function importarDatosMejorado(deps) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const datos = JSON.parse(text);

                if (!datos.ventas || !Array.isArray(datos.ventas) || !datos.gastos || !Array.isArray(datos.gastos)) {
                    throw new Error('Archivo inválido: formato incorrecto');
                }

                const origenNombre =
                    datos.perfilNombre || datos.perfilId
                        ? ` (origen: ${datos.perfilNombre || datos.perfilId})`
                        : '';

                const opcion = confirm(
                    '¿Cómo desea importar los registros?\n\n' +
                        'Aceptar = REEMPLAZAR todos los registros del perfil activo\n' +
                        'Cancelar = COMBINAR con los registros actuales\n\n' +
                        `El archivo contiene: ${datos.ventas.length} ingreso(s) y ${datos.gastos.length} gasto(s).${origenNombre}`
                );

                if (opcion) {
                    deps.setVentas(datos.ventas);
                    deps.setGastos(datos.gastos);
                    deps.mostrarMensaje('✅ Registros reemplazados por completo', 'success');
                } else {
                    const ventasAct = deps.getVentas();
                    const gastosAct = deps.getGastos();
                    const ventasIds = new Set(ventasAct.map((v) => v.id));
                    const gastosIds = new Set(gastosAct.map((g) => g.id));

                    const nuevasVentas = datos.ventas.filter((v) => !ventasIds.has(v.id));
                    const nuevosGastos = datos.gastos.filter((g) => !gastosIds.has(g.id));

                    deps.setVentas([...ventasAct, ...nuevasVentas]);
                    deps.setGastos([...gastosAct, ...nuevosGastos]);

                    deps.mostrarMensaje(
                        `✅ Registros combinados: ${nuevasVentas.length} ingreso(s) y ${nuevosGastos.length} gasto(s) añadidos`,
                        'success'
                    );
                }

                await deps.guardarVentas();
                await deps.guardarGastos();

                deps.actualizarDashboard();
                deps.mostrarVentas();
                deps.mostrarGastos();
            } catch (err) {
                deps.mostrarMensaje(
                    '❌ Error al importar. Verifique que el archivo sea válido: ' + err.message,
                    'error'
                );
            }
        };

        input.click();
    }

    async function cargarDatosImportados(deps, event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const datos = JSON.parse(text);

            if (!datos.ventas || !Array.isArray(datos.ventas) || !datos.gastos || !Array.isArray(datos.gastos)) {
                throw new Error('Archivo inválido');
            }

            const opcion = confirm(
                '¿Cómo desea importar los registros?\n\n' +
                    'Aceptar = REEMPLAZAR todos los registros del perfil activo\n' +
                    'Cancelar = COMBINAR con los registros actuales'
            );

            if (opcion) {
                deps.setVentas(datos.ventas);
                deps.setGastos(datos.gastos);
            } else {
                const ventasAct = deps.getVentas();
                const gastosAct = deps.getGastos();
                const ventasIds = new Set(ventasAct.map((v) => v.id));
                const gastosIds = new Set(gastosAct.map((g) => g.id));

                const nuevasVentas = datos.ventas.filter((v) => !ventasIds.has(v.id));
                const nuevosGastos = datos.gastos.filter((g) => !gastosIds.has(g.id));

                deps.setVentas([...ventasAct, ...nuevasVentas]);
                deps.setGastos([...gastosAct, ...nuevosGastos]);
            }

            await deps.guardarVentas();
            await deps.guardarGastos();

            deps.actualizarDashboard();
            deps.mostrarVentas();
            deps.mostrarGastos();

            deps.mostrarMensaje(
                `✅ Registros importados: ${datos.ventas.length} ingreso(s), ${datos.gastos.length} gasto(s)`,
                'success'
            );
        } catch {
            deps.mostrarMensaje('❌ Error al importar. Verifique que el archivo sea válido.', 'error');
        }
    }

    global.ModExportaciones = {
        JSON_SCHEMA,
        JSON_VERSION,
        TITULO_REPORTE,
        filtrarRegistrosPorFecha,
        obtenerTextoPeriodoPdf,
        construirPayloadBackupJSON,
        exportarPDF,
        exportarExcel,
        exportarPowerPoint,
        exportarDatosMejorado,
        importarDatosMejorado,
        cargarDatosImportados
    };
})(typeof window !== 'undefined' ? window : globalThis);
