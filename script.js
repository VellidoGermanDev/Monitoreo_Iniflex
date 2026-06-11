// Configuración de la API Iniflex
const API_URL = "http://64.181.190.229/api/v1/runtime/endpoint/integracao/iniflex/json";
const API_KEY = "-7$-20$111$60$91$-89$81$-72$34$9$39$-20$-22$-64$24$-24$-83$-32$49$-78$67$-84$61$-49$-120$74$14$44$-126$-26$101$63$91$42$33$59$35$-55$22$105$-119$-101$-125$54$-111$124$-77$-99$30$-52$-7$47$-29$-46$-38$85$-8$-84$117$-49$8$-58$-44$7$-42$-45$-112$-66$126$-105$-54$-75$-47$-27$89$-26$63$-33$-48$81$97$-103$116$-38$102$17$37$-101$43$99$85$73$-41$91$18$30$115$57$-128$70$127$9$5$40$44$-51$-46$-112$40$-104$90$-47$-104$121$89$18$-60$23$-85$-118$98$62$-123$-18$9$45$-15$-74$96$-72$-108$61$-42$57$90$-106$114$22$81$-5$38$-10$81$28$-41$52$86$-123$-81$5$28$-4$120$-27$-89$-38$78$-116$72$-20$-6$-121$-116$-9$40$-22$-48$-117$29$-40$-121$-8$-43$61$-124$-43$-32$65$97$-31$89$39$-82$-91$126$105$-97$-59$65$105$-37$53$-55$78$-9$104$123$67$24$-54$44$-36$109$-70$94$112$33$-88$-75$72$10$124$5$10$91$-11$-15$-30$-66$103$105$-115$99$-63$-34$-68$-113$-89$45$113$127$54$-55$-55$113$94$-117$70$-21$-54$23$89$0$102$19$63$-94$102$-117$-2$95$-111$-67$-39$85$101$90$-115$-3$111$42$46$124$23$-86$23$55$111$66$-81$65$64$14$-99$-34$117$-81$-107$-32$38$-47$108$5$-2$39$46$-84$12$51$-101$0$104$-23$108$-35$-36$75$-6$-16$-27$57$82$-28$-44$22$-96$-28$39$-118$-25$119$115$-119$78$86$-43$73$29$-106$3$120$48$8$-73$-49$10$-88$121$63$70$-106$112$108$45$-33$-8$116$-44$-38$-68$55$-92$-26$84$80$-10$-116$108$-128$-73$100$-6$";

// Mapeo de Sectores y Máquinas
const sectorsConfig = [
    { id: 1, name: "Extrusión", machines: Array.from({ length: 16 }, (_, i) => ({ id: 101 + i, name: `Extrusora ${i + 1}` })) },
    { id: 2, name: "Impresión", machines: [{ id: 201, name: "TACHYS" }, { id: 202, name: "CHRONOS" }, { id: 203, name: "SIRIO" }, { id: 204, name: "VENUS 4" }] },
    { id: 3, name: "Laminado", machines: [{ id: 301, name: "SCHIAVI" }, { id: 302, name: "SUPER SIMPLEX" }] },
    { id: 4, name: "Refile", machines: [{ id: 401, name: "REFILADORA 1" }, { id: 402, name: "REFILADORA 2" }, { id: 403, name: "REFILADORA 3" }, { id: 404, name: "REFILADORA 4" }] },
    { id: 5, name: "Corte", machines: [{ id: 501, name: "RUDRA" }, { id: 502, name: "RUDRA 2" }, { id: 503, name: "DEBERNARDI" }, { id: 504, name: "HECCE" }, { id: 505, name: "HECCE 2" }, { id: 506, name: "HUDSON" }, { id: 509, name: "ELBA 4" }, { id: 510, name: "ELBA 5" }, { id: 511, name: "MOBERT" }, { id: 512, name: "MOLINO" }] },
    { id: 6, name: "Corte en Línea", machines: [{ id: 601, name: "ELBA 1" }, { id: 603, name: "ELBA 3" }, { id: 604, name: "POLIMAQUINA" }] },
    { id: 7, name: "Recuperado de Materia Prima", machines: [{ id: 701, name: "Recuperadora 1" }, { id: 702, name: "Recuperadora 2" }] }
];

// Estado global
let currentData = {};
let hourlyProduction = Array(24).fill(0); 
let productionChartInstance = null; 
let individualChartsInstances = {}; // Almacena las instancias de los gráficos individuales

// Etiquetas base de tiempo para los gráficos (25 puntos para cierre exacto)
const globalLabels = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", 
    "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", 
    "05:59"
];

// Función para procesar y formatear de forma limpia las cantidades físicas de Atiles
function obtenerRendimientoHTML(cantidadesPorUnidad) {
    if (!cantidadesPorUnidad || Object.keys(cantidadesPorUnidad).length === 0) {
        return `—`;
    }

    let partes = [];
    
    // 1. Si la máquina acumuló Metros (MT) -> Extrusión, Impresión, Laminado
    if (cantidadesPorUnidad["MT"] && cantidadesPorUnidad["MT"] > 0) {
        partes.push(`${Math.round(cantidadesPorUnidad["MT"]).toLocaleString('es-AR')} <span class="unit-badge" style="font-size: 0.85em; opacity: 0.8; margin-left: 2px; color: #f8cb38;">MT</span>`);
    }

    // 2. Si acumuló Unidades (UN) o Millares (MIL) -> Corte estándar
    let totalUnidades = (cantidadesPorUnidad["UN"] || 0) + ((cantidadesPorUnidad["MIL"] || 0) * 1000);
    if (totalUnidades > 0) {
        partes.push(`${Math.round(totalUnidades).toLocaleString('es-AR')} <span class="unit-badge" style="font-size: 0.85em; opacity: 0.8; margin-left: 2px; color: #f8cb38;">UN</span>`);
    }

    // 3. ¡EL CASO CLAVE!: Si la unidad de cantidad vino como KG en Corte/Corte en línea
    // Significa que 'quantidade' son los bultos/paquetes físicos procesados.
    if (cantidadesPorUnidad["KG"] && cantidadesPorUnidad["KG"] > 0) {
        partes.push(`${Math.round(cantidadesPorUnidad["KG"]).toLocaleString('es-AR')} <span class="unit-badge" style="font-size: 0.85em; opacity: 0.8; margin-left: 2px; color: #f8cb38;">UN</span>`);
    }

    // 4. Resguardo por si aparece otra unidad rara
    Object.keys(cantidadesPorUnidad).forEach(uni => {
        if (uni !== "MT" && uni !== "UN" && uni !== "MIL" && uni !== "KG" && cantidadesPorUnidad[uni] > 0) {
            partes.push(`${Math.round(cantidadesPorUnidad[uni]).toLocaleString('es-AR')} <span class="unit-badge" style="font-size: 0.85em; opacity: 0.8; margin-left: 2px;">${uni}</span>`);
        }
    });

    return partes.length > 0 ? partes.join(" / ") : `—`;
}

document.addEventListener("DOMContentLoaded", () => {
    initDatePicker();
    updateDateTime();
    setupTabs();
    
    // Verificamos si esta pestaña ya estaba activa consultando los datos
    const yaEstabaCargado = sessionStorage.getItem("panel_iniciado");
    
    if (yaEstabaCargado === "true") {
        // Si el panel ya se había usado (o se autorefrescó), mantiene los datos vivos
        fetchDashboardData();
    } else {
        // Si la pestaña se abre de cero por primera vez, NO CARGA NADA.
        // Se queda quieto esperando a que presiones el botón.
        console.log("Panel en espera. Presione 'Actualizar' para iniciar el monitoreo.");
    }
    
    // Al presionar el botón "Actualizar" a mano, marcamos que el panel ya inició el ciclo
    document.getElementById("btn-refresh").addEventListener("click", () => {
        sessionStorage.setItem("panel_iniciado", "true");
        fetchDashboardData();
    });
});

function initDatePicker() {
    const datePicker = document.getElementById("production-date");
    const today = new Date();
    
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedToday = `${year}-${month}-${day}`;
    
    datePicker.value = formattedToday;
    datePicker.max = formattedToday;
}

function updateDateTime() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById("current-date").innerText = today.toLocaleDateString('es-AR', options);
}

function getSelectedDateRange() {
    const dateInput = document.getElementById("production-date").value;
    const [year, month, day] = dateInput.split('-').map(Number);
    
    // Límites estrictos de la jornada de producción en Atiles (06:00 hs a 05:59 hs del día siguiente)
    window.currentLimites = {
        estrictoInicio: new Date(year, month - 1, day, 6, 0, 0).getTime(),
        estrictoFin: new Date(year, month - 1, day + 1, 5, 59, 59).getTime()
    };

    // Devolvemos objetos Date puros para que fetchMachineData pueda calcular los deltas fácilmente
    const fechaSeleccionada = new Date(year, month - 1, day);
    const fechaFinConsulta = new Date(year, month - 1, day + 1);

    const endDay = String(fechaFinConsulta.getDate()).padStart(2, '0');
    const endMonth = String(fechaFinConsulta.getMonth() + 1).padStart(2, '0');

    // Actualizamos el texto del filtro en la interfaz
    const startDayActual = String(fechaSeleccionada.getDate()).padStart(2, '0');
    const startMonthActual = String(fechaSeleccionada.getMonth() + 1).padStart(2, '0');
    document.getElementById("time-range").innerText = `Filtro OP: ${startDayActual}/${startMonthActual} 06:00 hs al ${endDay}/${endMonth} 05:59 hs`;

    // =========================================================================
    // ACTUALIZACIÓN DE FECHA SELECCIONADA (EVITA EL BUG DEL USO HORARIO)
    // =========================================================================
    const txtFechaActual = document.getElementById('current-date');
    if (txtFechaActual) {
        // Forzamos la fecha a mediodía (12:00) antes de pedir el formato local.
        // Esto previene que los navegadores resten horas por zona horaria y cambien el día de la semana.
        const fechaSegura = new Date(year, month - 1, day, 12, 0, 0);
        
        const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        let fechaFormateada = fechaSegura.toLocaleDateString('es-AR', opciones);
        
        // Capitalizamos la primera letra (ej: "Lunes, 1 de junio de 2026")
        fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        
        // Pisamos el texto con el día seleccionado real
        txtFechaActual.innerText = fechaFormateada;
    }
    // =========================================================================

    return {
        fechaBase: fechaSeleccionada,
        fechaFinStr: `${endDay}/${endMonth}/${fechaFinConsulta.getFullYear()} 05:59:59`
    };
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchDashboardData() {
    const overlay = document.getElementById("loading-overlay");
    const refreshBtn = document.getElementById("btn-refresh");
    const loadingText = document.getElementById("loading-text");

    if (overlay) overlay.classList.add("active");
    if (refreshBtn) refreshBtn.classList.add("loading");

    console.log("=== INICIANDO CARGA GENERAL DEL DASHBOARD ===");
    const infoFechas = getSelectedDateRange();
    currentData = {}; 
    hourlyProduction = Array(24).fill(0); 

    // Limpiamos la lista flotante antes de empezar la nueva carga
    if (loadingText) loadingText.innerHTML = "";

    try {
        for (const sector of sectorsConfig) {
            console.log(`Cargando datos para el sector: ${sector.name} (ID: ${sector.id})...`);
            
            // 1. Creamos la línea para este sector en la pantalla y la agregamos al contenedor
            let sectorLineId = `loading-line-${sector.id}`;
            if (loadingText) {
                loadingText.innerHTML += `<div id="${sectorLineId}" class="loading-line">Actualizando datos de ${sector.name.toLowerCase()}...</div>`;
            }
            
            // Variable para controlar si el sector falla
            let sectorConError = false;

            for (const machine of sector.machines) {
                try {
                    await fetchMachineData(machine.id, infoFechas.fechaBase, infoFechas.fechaFinStr);
                    await delay(45); 
                } catch (machErr) {
                    console.error(`Error en máquina ${machine.id}:`, machErr);
                    sectorConError = true;
                }
            }
            
            // 2. Cuando termina el sector, buscamos su línea y le clavamos el OK o ERROR con color
            const lineElement = document.getElementById(sectorLineId);
            if (lineElement) {
                if (!sectorConError) {
                    lineElement.innerHTML = `Actualizando datos de ${sector.name.toLowerCase()}: <span class="status-ok" style="color: #2ecc71; font-weight: bold;">OK</span>`;
                } else {
                    lineElement.innerHTML = `Actualizando datos de ${sector.name.toLowerCase()}: <span class="status-error" style="color: #e74c3c; font-weight: bold;">ERROR</span>`;
                }
            }

            // Mantenemos tus logs de consola intactos
            console.log(`%cSector ${sector.name} cargado completamente`, "color: #2ecc71; font-weight: bold;");
            console.log("-----------------------------------------");
        }
        
        // Agregar un aviso final en la lista flotante antes de cerrar
        if (loadingText) {
            loadingText.innerHTML += `<div class="loading-line final" style="color: #00f2fe; font-weight: bold; margin-top: 10px;">Procesando totales...</div>`;
        }
        
        console.log("Procesando totales globales...");
        calculateGlobalTotals();
        
        const activeTab = document.querySelector(".tab-btn.active").dataset.sector;
        renderDashboard(activeTab);
        initGlobalChart(); 
        
        console.log("%c=== TRABAJO COMPLETADO: TODO EL DASHBOARD ACTUALIZADO ===", "color: #00f2fe; font-weight: bold;");
        
        // Dejamos un segundo de delay para que llegues a ver el reporte final con todos los OK en pantalla antes de ocultar el overlay
        await new Promise(resolve => setTimeout(resolve, 1200));

    } catch (err) {
        console.error("%cError crítico en la actualización general:", "color: #e74c3c; font-weight: bold;", err);
    } finally {
        if (overlay) overlay.classList.remove("active");
        if (refreshBtn) refreshBtn.classList.remove("loading");
    }
}

function parseIniflexDate(dateStr) {
    // Supone formato "DD/MM/YYYY HH:mm:ss" o "YYYY-MM-DD HH:mm:ss"
    // Forzamos el parseo posicional para evitar que el motor de JS aplique desfases UTC
    const partes = dateStr.split(/[\s/:\-]+/);
    if (partes.length >= 5) {
        // Si viene en formato DD/MM/YYYY
        if (partes[0].length === 2) {
            return new Date(partes[2], partes[1] - 1, partes[0], partes[3], partes[4], partes[5] || 0).getTime();
        }
        // Si viene en formato YYYY-MM-DD
        return new Date(partes[0], partes[1] - 1, partes[2], partes[3], partes[4], partes[5] || 0).getTime();
    }
    return Date.parse(dateStr);
}

async function fetchMachineData(recursoId, fechaBaseObj, dataFimStr) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", "Bearer " + API_KEY);

    // 1. Identificar a qué sector pertenece este recurso
    const idNumerico = Number(recursoId);
    const sectorAsociado = sectorsConfig.find(s => s.machines.some(m => m.id === idNumerico));
    const sectorId = sectorAsociado ? sectorAsociado.id : 0;

    let dataInicioCalculadaStr = "";

    // 2. Aplicar estrategia de ventanas de red optimizada
    if (sectorId === 2 || sectorId === 3 || sectorId === 4) {
        // SECTORES AUTOFLEX: Impresión (2), Laminado (3), Refile (4)
        // Calculamos un colchón de 5 días hacia atrás desde la fecha seleccionada para capturar bobinas puente
        const fechaVariasHorasAtras = new Date(fechaBaseObj.getTime());
        fechaVariasHorasAtras.setDate(fechaVariasHorasAtras.getDate() - 5);
        
        const backDay = String(fechaVariasHorasAtras.getDate()).padStart(2, '0');
        const backMonth = String(fechaVariasHorasAtras.getMonth() + 1).padStart(2, '0');
        const backYear = fechaVariasHorasAtras.getFullYear();
        
        dataInicioCalculadaStr = `${backDay}/${backMonth}/${backYear} 06:00:00`;
    } else {
        // SECTORES INIFLEX TRADICIONALES: Extrusión, Corte, Corte en Línea, Recuperadora
        // Consulta ultra liviana: desde las 00:00:00 hs del mismo día elegido
        const startDay = String(fechaBaseObj.getDate()).padStart(2, '0');
        const startMonth = String(fechaBaseObj.getMonth() + 1).padStart(2, '0');
        const startYear = fechaBaseObj.getFullYear();
        
        dataInicioCalculadaStr = `${startDay}/${startMonth}/${startYear} 00:00:00`;
    }

    const bodyProd = {
        "tipoComando": "ASDCOMANDOJSONTMP",
        "grupoComando": "EXP_AP_PRODUCAO_V1",
        "empresa": 1,
        "data_inicio": dataInicioCalculadaStr, // Rango dinámico según sector
        "data_fim": dataFimStr,
        "recurso": recursoId
    };

    const bodyScrap = {
        "tipoComando": "ASDCOMANDOJSONTMP",
        "grupoComando": "EXP_AP_PERDA_V1",
        "empresa": 1,
        "data_inicio": dataInicioCalculadaStr, 
        "data_fim": dataFimStr,
        "recurso": recursoId
    };

    const { estrictoInicio, estrictoFin } = window.currentLimites;

    const requestOptionsProd = { method: "POST", headers: myHeaders, body: JSON.stringify(bodyProd), redirect: "follow" };
    const requestOptionsScrap = { method: "POST", headers: myHeaders, body: JSON.stringify(bodyScrap), redirect: "follow" };

    try {
        const [resProd, resScrap] = await Promise.all([
            fetch(API_URL, requestOptionsProd),
            fetch(API_URL, requestOptionsScrap)
        ]);

        const dataProd = resProd.ok ? await resProd.json() : [];
        const dataScrap = resScrap.ok ? await resScrap.json() : [];

        let totalProdKilos = 0;
        let listaOPs = new Set();
        let listaOperadores = new Set();
        let machineHourlyHistory = Array(24).fill(0);
        let machineHourlyVolumeHistory = Array(24).fill(0); // Para los metros/unidades
        let machineHourlyScrapHistory = Array(24).fill(0);  // <-- NUEVO: Historial real de scrap por hora

        // 3. Procesamiento de Producción con Filtro por Cierre/Pesada
        let cantidadesAcumuladas = {}; 

        if (Array.isArray(dataProd) && dataProd.length > 0) {
            dataProd.forEach(item => {
                const fechaReferenciaStr = item.data_hora_fim || item.data_registro;
                
                if (fechaReferenciaStr) {
                    const timestampReferencia = parseIniflexDate(fechaReferenciaStr);
                    
                    if (timestampReferencia >= estrictoInicio && timestampReferencia <= estrictoFin) {
                        const pesoItem = (Number(item.peso_bruto) || Number(item.peso_neto) || Number(item.peso) || 0);
                        totalProdKilos += pesoItem;
                        
                        // Ubicación exacta de la hora
                        const dtRef = new Date(timestampReferencia);
                        const horaRef = dtRef.getHours();
                        let indexCasillero = horaRef - 6;
                        if (indexCasillero < 0) indexCasillero += 24; 
                        
                        if (item.unidade) {
                            const uni = item.unidade.toString().trim().toUpperCase();
                            let qtyItem = Number(item.quantidade) || 0;
                            
                            if (qtyItem === 0 && Array.isArray(item.ap_lote) && item.ap_lote.length > 0) {
                                item.ap_lote.forEach(lote => {
                                    qtyItem += (Number(lote.quantidade) || 0);
                                });
                            }
                            
                            if (qtyItem > 0) {
                                if (!cantidadesAcumuladas[uni]) {
                                    cantidadesAcumuladas[uni] = 0;
                                }
                                cantidadesAcumuladas[uni] += qtyItem;
                                
                                // Guardamos el volumen en su hora
                                if (indexCasillero >= 0 && indexCasillero < 24) {
                                    machineHourlyVolumeHistory[indexCasillero] += qtyItem;
                                }
                            }
                        }
                        
                        if (item.op) listaOPs.add(item.op.toString().trim());
                        if (item.nome_operador) listaOperadores.add(item.nome_operador.trim());

                        if (indexCasillero >= 0 && indexCasillero < 24) {
                            hourlyProduction[indexCasillero] += pesoItem;
                            machineHourlyHistory[indexCasillero] += pesoItem;
                        }
                    }
                }
            });
        }

        // 4. Procesamiento de Scrap REAL Hora por Hora
        let totalScrapKilos = 0;
        if (Array.isArray(dataScrap) && dataScrap.length > 0) {
            dataScrap.forEach(item => {
                // Prioridad de fechas que envía la API de mermas
                const fechaReferenciaStr = item.data_hora_fim || item.data_hora_ini || item.data_hora;
                if (fechaReferenciaStr) {
                    const timestampScrap = parseIniflexDate(fechaReferenciaStr);
                    if (timestampScrap >= estrictoInicio && timestampScrap <= estrictoFin) {
                        const pesoScrap = (Number(item.peso) || 0);
                        totalScrapKilos += pesoScrap;

                        // Calculamos la hora exacta en la que se registró la merma
                        const dtScrap = new Date(timestampScrap);
                        const horaScrap = dtScrap.getHours();
                        let indexCasilleroScrap = horaScrap - 6;
                        if (indexCasilleroScrap < 0) indexCasilleroScrap += 24;

                        // Lo acumulamos en su casillero real del turno
                        if (indexCasilleroScrap >= 0 && indexCasilleroScrap < 24) {
                            machineHourlyScrapHistory[indexCasilleroScrap] += pesoScrap;
                        }
                    }
                }
            });
        }

        const totalProcesado = totalProdKilos + totalScrapKilos;
        const porcScrap = totalProcesado > 0 ? ((totalScrapKilos / totalProcesado) * 100).toFixed(1) : "0.0";

        // Exportamos los tres historiales para que los lea el Render
        currentData[recursoId] = {
            production: totalProdKilos,
            quantities: cantidadesAcumuladas,
            scrap: totalScrapKilos,
            percentage: porcScrap,
            operadores: listaOperadores.size > 0 ? Array.from(listaOperadores).join(", ") : "Sin datos",
            ops: listaOPs.size > 0 ? Array.from(listaOPs).join(", ") : "Sin datos",
            hourlyHistory: machineHourlyHistory,
            hourlyVolumeHistory: machineHourlyVolumeHistory,
            hourlyScrapHistory: machineHourlyScrapHistory // <-- ENVIAMOS EL HISTORIAL REAL
        };

    } catch (error) {
        console.error(`Error consultando recurso ${recursoId}:`, error);
        currentData[recursoId] = { production: 0, scrap: 0, percentage: "0.0", operadores: "Error de red", ops: "—", hourlyHistory: Array(24).fill(0) };
    }
}

function calculateGlobalTotals() {
    let totalProd = 0;
    let totalScrap = 0;

    const sectorTotals = {};
    sectorsConfig.forEach(sector => {
        // Añadimos 'quantities' para consolidar los metros/unidades de todo el sector
        sectorTotals[sector.id] = { name: sector.name, production: 0, scrap: 0, quantities: {} };
    });

    Object.keys(currentData).forEach(recursoId => {
        const machineData = currentData[recursoId];
        totalProd += machineData.production;
        totalScrap += machineData.scrap;

        const idNumerico = Number(recursoId);
        const sectorAsociado = sectorsConfig.find(s => s.machines.some(m => m.id === idNumerico));
        
        if (sectorAsociado) {
            const secObj = sectorTotals[sectorAsociado.id];
            secObj.production += machineData.production;
            secObj.scrap += machineData.scrap;

            // CONSOLIDACIÓN EN LOTE DE RENDIMIENTO POR SECTOR
            if (machineData.quantities) {
                Object.keys(machineData.quantities).forEach(uni => {
                    if (!secObj.quantities[uni]) {
                        secObj.quantities[uni] = 0;
                    }
                    secObj.quantities[uni] += machineData.quantities[uni];
                });
            }
        }
    });

    const totalsContainer = document.getElementById("sector-totals-container");
    if (totalsContainer) {
        totalsContainer.innerHTML = ""; 

        Object.values(sectorTotals).forEach(sec => {
                const secTotal = sec.production + sec.scrap;
                const secPct = secTotal > 0 ? ((sec.scrap / secTotal) * 100).toFixed(1) : "0.0";

                // Reutilizamos tu función para formatear el acumulado del sector de forma limpia
                const rendimientoSectorHTML = obtenerRendimientoHTML(sec.quantities);

                const card = document.createElement("div");
                card.className = "sector-total-card";
                card.innerHTML = `
                    <div class="sector-name">TOTAL ${sec.name}</div>
                    <div class="sector-stat">
                        <span>Producción Peso:</span>
                        <span class="sector-val-prod">${Math.round(sec.production).toLocaleString('es-AR')} kg</span>
                    </div>
                    <div class="sector-stat">
                        <span>Volumen Total:</span>
                        <span class="sector-val-qty" style="color: #f8cb38; font-weight: bold;">${rendimientoSectorHTML}</span>
                    </div>
                    <div class="sector-stat">
                        <span>Scrap Sector:</span>
                        <span class="sector-val-scrap">${Math.round(sec.scrap).toLocaleString('es-AR')} kg</span>
                    </div>
                    <div class="sector-stat">
                        <span>% Scrap:</span>
                        <span class="sector-val-pct">${secPct}%</span>
                    </div>
                `;
                totalsContainer.appendChild(card);
        });
    }

    const globalTotal = totalProd + totalScrap;
    const globalScrapPercent = globalTotal > 0 ? ((totalScrap / globalTotal) * 100).toFixed(1) : "0.0";

    document.getElementById("global-prod").innerHTML = `${totalProd.toLocaleString('es-AR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span class="unit">kg</span>`;
    document.getElementById("global-scrap").innerHTML = `${totalScrap.toLocaleString('es-AR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span class="unit">kg</span>`;
    document.getElementById("global-scrap-percentage").innerText = `${globalScrapPercent}%`;
}

// Generador de degradados de fondo para turnos (Reutilizable para optimizar rendimiento)
function createShiftsGradient(ctx, width) {
    const backgroundGradient = ctx.createLinearGradient(0, 0, width, 0);
    // Turno Mañana: 0% al 35% -> Verde
    backgroundGradient.addColorStop(0, 'rgba(46, 204, 113, 0.12)');   
    backgroundGradient.addColorStop(0.35, 'rgba(46, 204, 113, 0.12)'); 
    // Turno Tarde: 35% al 66.66% -> Azul
    backgroundGradient.addColorStop(0.35, 'rgba(52, 152, 219, 0.12)'); 
    backgroundGradient.addColorStop(0.6666, 'rgba(52, 152, 219, 0.12)'); 
    // Turno Noche: 66.66% al 100% -> Rojo
    backgroundGradient.addColorStop(0.6666, 'rgba(231, 76, 60, 0.12)');  
    backgroundGradient.addColorStop(1, 'rgba(231, 76, 60, 0.12)');     
    return backgroundGradient;
}

// Plugin personalizado para pintar los fondos de los turnos de forma exacta
const shiftsBackgroundPlugin = {
    id: 'shiftsBackground',
    beforeDraw: (chart) => {
        const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
        
        // Definimos los cortes exactos según los índices de las etiquetas (0 a 24)
        // Índice 0 = 06:00, Índice 8 = 14:00, Índice 16 = 22:00, Índice 24 = 05:59
        const turnos = [
            { startIdx: 0, endIdx: 8, color: 'rgba(60, 255, 141, 0.05)' },  // Mañana (Verde sutil)
            { startIdx: 8, endIdx: 16, color: 'rgba(62, 178, 255, 0.05)' }, // Tarde (Azul sutil)
            { startIdx: 16, endIdx: 24, color: 'rgba(255, 86, 68, 0.05)' }  // Noche (Rojo sutil)
        ];

        ctx.save();
        turnos.forEach(turno => {
            const left = x.getPixelForValue(turno.startIdx);
            const right = x.getPixelForValue(turno.endIdx);
            
            ctx.fillStyle = turno.color;
            ctx.fillRect(left, top, right - left, bottom - top);
        });
        ctx.restore();
    }
};

function initGlobalChart() {
    const canvas = document.getElementById('productionChart');
    if (!canvas) return; 
    const ctx = canvas.getContext('2d');
    
    if (productionChartInstance) {
        productionChartInstance.destroy();
    }

    const chartDataExtended = [...hourlyProduction, hourlyProduction[23]];

    productionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: globalLabels,
            datasets: [{
                label: 'Producción Total Planta (kg/h)',
                data: chartDataExtended, 
                borderColor: '#00f2fe', 
                backgroundColor: 'rgba(0, 242, 254, 0.06)', // Relleno sutil que acompaña la altura
                borderWidth: 2, // <--- Línea más gruesa para que destaque en el gráfico grande
                tension: 0.35, 
                pointBackgroundColor: '#00f2fe',
                pointRadius: 2.5, // <--- Puntos más grandes en cada hora
                pointHoverRadius: 8, // <--- Efecto hover más marcado al pasar el mouse
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#ffffff', font: { size: 12 } } },
                tooltip: {
                    backgroundColor: '#111',
                    titleColor: '#00f2fe',
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            let index = context.dataIndex > 23 ? 23 : context.dataIndex;
                            let turnoInfo = index < 8 ? " (T. Mañana)" : (index < 16 ? " (T. Tarde)" : " (T. Noche)");
                            return ` ${context.parsed.y.toLocaleString('es-AR', {maximumFractionDigits: 1})} kg${turnoInfo}`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { color: '#222' }, 
                    ticks: { color: '#888', font: { size: 11 } } // Letras de horas un toque más grandes
                },
                y: { 
                    grid: { color: '#222' }, 
                    ticks: { 
                        color: '#888', 
                        font: { size: 11 },
                        callback: v => v.toLocaleString('es-AR') + ' kg' 
                    }, 
                    beginAtZero: true 
                }
            }
        },
        plugins: [shiftsBackgroundPlugin] // Mantiene el plugin de los fondos matemáticos
    });
}

function renderDashboard(filterSector) {
    const container = document.getElementById("machines-container");
    container.innerHTML = "";

    // Destruimos instancias anteriores de gráficos de máquinas para liberar memoria
    Object.keys(individualChartsInstances).forEach(id => {
        if (individualChartsInstances[id]) individualChartsInstances[id].destroy();
    });
    individualChartsInstances = {};

    sectorsConfig.forEach(sector => {
        if (filterSector !== "all" && sector.id.toString() !== filterSector) return;

        const sectorBlock = document.createElement("section");
        sectorBlock.className = "sector-block";
        
        const title = document.createElement("h2");
        title.className = "sector-title";
        title.innerText = sector.name;
        sectorBlock.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "machines-grid";

        sector.machines.forEach(machine => {
            // Incorporamos el mapa dinámico 'quantities' y los historiales horarios completos en el fallback de seguridad
            const data = currentData[machine.id] || { 
                production: 0, 
                quantities: {}, 
                scrap: 0, 
                percentage: "0.0", 
                operadores: "—", 
                ops: "—", 
                hourlyHistory: Array(24).fill(0),
                hourlyScrapHistory: Array(24).fill(0),
                hourlyVolumeHistory: Array(24).fill(0)
            };
            
            const isNoSession = (data.production === 0 && data.scrap === 0);
            const sessionClass = isNoSession ? "machine-row no-session" : "machine-row";
            
            let opsHTML = `<span class="no-data-badge">Sin OPs</span>`;
            if (!isNoSession && data.ops && data.ops !== "Sin datos" && data.ops !== "—") {
                opsHTML = data.ops.split(", ").map(op => `<span class="op-chip">${op}</span>`).join("");
            } else if (isNoSession) {
                opsHTML = `<span class="no-data-badge">Sin Sesión</span>`;
            }

            let operHTML = `<span class="no-data-badge">—</span>`;
            if (!isNoSession && data.operadores && data.operadores !== "Sin datos" && data.operadores !== "—") {
                operHTML = data.operadores.split(", ").map(op => `<span class="user-chip">${op}</span>`).join("");
            }

            // Procesamos dinámicamente el metraje / unidades acumuladas de esta máquina
            const rendimientoHTML = obtenerRendimientoHTML(data.quantities);

            // =========================================================================
            // CÁLCULO DE TURNOS EN BASE A DATOS REALES REGISTRADOS (06:00 a 05:59)
            // =========================================================================
            let prodManana = 0; let prodTarde  = 0; let prodNoche  = 0;
            let volManana  = 0; let volTarde   = 0; let volNoche   = 0;
            let scrapManana = 0; let scrapTarde = 0; let scrapNoche = 0;

            // 1. Sumamos la producción real por turno
            if (data.hourlyHistory && data.hourlyHistory.length === 24) {
                for (let i = 0; i < 24; i++) {
                    if (i >= 0 && i < 8)       prodManana += data.hourlyHistory[i];
                    else if (i >= 8 && i < 16)  prodTarde  += data.hourlyHistory[i];
                    else                        prodNoche  += data.hourlyHistory[i];
                }
            }

            // 2. Sumamos el volumen real (Mts/Bls) por turno
            const histVol = data.hourlyVolumeHistory || Array(24).fill(0);
            for (let i = 0; i < 8; i++)   volManana += histVol[i];
            for (let i = 8; i < 16; i++)  volTarde  += histVol[i];
            for (let i = 16; i < 24; i++) volNoche  += histVol[i];

            // Ajuste por millares (MIL) para el sector Corte
            let esMillar = false;
            if (data.quantities) {
                const unidadesDisponibles = Object.keys(data.quantities).map(u => u.trim().toUpperCase());
                if (unidadesDisponibles.includes("MIL")) esMillar = true;
            }
            if (esMillar) {
                volManana *= 1000; volTarde *= 1000; volNoche *= 1000;
            }

            // 3. Sumamos el SCRAP REAL cargado por hora en cada turno (Auditoría Estricta)
            const histScrap = data.hourlyScrapHistory || Array(24).fill(0);
            for (let i = 0; i < 8; i++)   scrapManana += histScrap[i];
            for (let i = 8; i < 16; i++)  scrapTarde  += histScrap[i];
            for (let i = 16; i < 24; i++) scrapNoche  += histScrap[i];
            // =========================================================================

            const row = document.createElement("div");
            row.className = sessionClass;
            row.innerHTML = `
                <div class="machine-data-cell">
                    <div class="machine-header">
                        <span class="machine-name">${machine.name}</span>
                        <span class="machine-id">ID ${machine.id}</span>
                    </div>
                    
                    <div class="machine-history-container">
                        <div class="history-section">
                            <span class="history-label">OPs Procesadas</span>
                            <div class="chips-wrapper">${opsHTML}</div>
                        </div>
                        <div class="history-section">
                            <span class="history-label">Personal del Día</span>
                            <div class="chips-wrapper">${operHTML}</div>
                        </div>
                    </div>

                    <div class="machine-stats">
                        <div class="stat-row">
                            <span class="stat-label">Producción KG:</span>
                            <span class="stat-value prod">${data.production.toLocaleString('es-AR', {maximumFractionDigits: 1})} kg</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Producción Mts/Bls:</span>
                            <span class="stat-value qty" style="color: #f8cb38; font-weight: bold;">${rendimientoHTML}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Scrap Total:</span>
                            <span class="stat-value scrap">${data.scrap.toLocaleString('es-AR', {maximumFractionDigits: 1})} kg</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">% Scrap:</span>
                            <span class="stat-value">${data.percentage}%</span>
                        </div>
                    </div>

                    <div class="turnos-container" style="margin-top: 12px; font-size: 0.9em;">
                        <div class="turno-row header-turno" style="display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; font-weight: bold; padding-bottom: 4px; border-bottom: 2px solid #334155; text-align: right; color: #94a3b8;">
                            <span style="text-align: left;">Turno</span>
                            <span>Prod (Kg)</span>
                            <span>Volumen</span>
                            <span>Scrap (Kg)</span>
                        </div>
                        <div class="turno-row" style="display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; padding: 5px 0; border-bottom: 1px solid #1e293b; text-align: right; align-items: center;">
                            <span class="turno-name" style="text-align: left;"><i class="fas fa-sun text-amber"></i> Mañana</span>
                            <span>${prodManana.toLocaleString('es-AR', {maximumFractionDigits: 1})}</span>
                            <span style="color: #f8cb38; font-weight: 500;">${volManana > 0 ? Math.round(volManana).toLocaleString('es-AR') : '—'}</span>
                            <span class="${scrapManana > 0 ? 'text-red' : ''}">${scrapManana > 0 ? scrapManana.toLocaleString('es-AR', {maximumFractionDigits: 1}) : '—'}</span>
                        </div>
                        <div class="turno-row" style="display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; padding: 5px 0; border-bottom: 1px solid #1e293b; text-align: right; align-items: center;">
                            <span class="turno-name" style="text-align: left;"><i class="fas fa-cloud-sun text-blue"></i> Tarde</span>
                            <span>${prodTarde.toLocaleString('es-AR', {maximumFractionDigits: 1})}</span>
                            <span style="color: #f8cb38; font-weight: 500;">${volTarde > 0 ? Math.round(volTarde).toLocaleString('es-AR') : '—'}</span>
                            <span class="${scrapTarde > 0 ? 'text-red' : ''}">${scrapTarde > 0 ? scrapTarde.toLocaleString('es-AR', {maximumFractionDigits: 1}) : '—'}</span>
                        </div>
                        <div class="turno-row" style="display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; padding: 5px 0; text-align: right; align-items: center;">
                            <span class="turno-name" style="text-align: left;"><i class="fas fa-moon text-purple"></i> Noche</span>
                            <span>${prodNoche.toLocaleString('es-AR', {maximumFractionDigits: 1})}</span>
                            <span style="color: #f8cb38; font-weight: 500;">${volNoche > 0 ? Math.round(volNoche).toLocaleString('es-AR') : '—'}</span>
                            <span class="${scrapNoche > 0 ? 'text-red' : ''}">${scrapNoche > 0 ? scrapNoche.toLocaleString('es-AR', {maximumFractionDigits: 1}) : '—'}</span>
                        </div>
                    </div>

                    <div class="scrap-bar-container" style="margin-top: 10px;">
                        <div class="scrap-bar" style="width: ${Math.min(parseFloat(data.percentage) * 4, 100)}%"></div>
                    </div>
                </div>

                <div class="machine-chart-cell">
                    <canvas id="sparkline-${machine.id}"></canvas>
                </div>
            `;
            grid.appendChild(row);
        });

        sectorBlock.appendChild(grid);
        container.appendChild(sectorBlock);
    });

    // Fase 3: Una vez inyectado todo el HTML en la pantalla, inicializamos los gráficos uno por uno
    initIndividualCharts(filterSector);
}

// Inicializador en lote de los gráficos de cada máquina (Versión con Plugin de Turnos)
function initIndividualCharts(filterSector) {
    sectorsConfig.forEach(sector => {
        if (filterSector !== "all" && sector.id.toString() !== filterSector) return;

        sector.machines.forEach(machine => {
            const canvas = document.getElementById(`sparkline-${machine.id}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const data = currentData[machine.id] || { hourlyHistory: Array(24).fill(0) };
            
            // Extendemos el historial copiando el último casillero para el cierre visual exacto
            const machineDataExtended = [...data.hourlyHistory, data.hourlyHistory[23]];

            individualChartsInstances[machine.id] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: globalLabels,
                    datasets: [{
                        label: 'Prod (kg/h)',
                        data: machineDataExtended,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.02)', // Relleno mínimo bajo la línea
                        borderWidth: 2,
                        tension: 0.35,
                        pointBackgroundColor: '#00f2fe',
                        pointRadius: 1.5,
                        pointHoverRadius: 5,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, // Ocultamos leyendas para maximizar espacio
                        tooltip: {
                            backgroundColor: '#111',
                            titleColor: '#00f2fe',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    let index = context.dataIndex > 23 ? 23 : context.dataIndex;
                                    let turnoInfo = index < 8 ? " (T. Mañana)" : (index < 16 ? " (T. Tarde)" : " (T. Noche)");
                                    return ` ${context.parsed.y.toLocaleString('es-AR', {maximumFractionDigits: 1})} kg${turnoInfo}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false },
                            ticks: { color: '#ffffff', font: { size: 9 } }
                        },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false },
                            ticks: { 
                                color: '#ffffff', 
                                font: { size: 9 },
                                callback: v => v.toLocaleString('es-AR') + ' kg'
                            },
                            beginAtZero: true
                        }
                    }
                },
                plugins: [shiftsBackgroundPlugin] // <--- Inyectamos también acá el fondo matemático por turnos
            });
        });
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            tabs.forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            renderDashboard(e.target.dataset.sector);
        });
    });
}

// ==========================================
// MÓDULO DE AUTO-ACTUALIZACIÓN INTELIGENTE
// ==========================================

(function() {
    let countdownInterval = null;

    // 1. Crear e inyectar el TIMER FLOTANTE (abajo a la derecha)
    const timerFlotante = document.createElement("div");
    timerFlotante.id = "timer-flotante-planta";
    timerFlotante.innerHTML = `
        <span class="timer-label">Actualización de Datos</span>
        <span id="timer-reloj-cuenta">--:--</span>
    `;
    document.body.appendChild(timerFlotante);

    // 2. Crear e inyectar el MODAL del conteo regresivo de 10s
    const modal = document.createElement("div");
    modal.id = "auto-refresh-modal";
    modal.style.display = "none";
    modal.innerHTML = `
        <div class="refresh-modal-content">
            <div class="refresh-spinner"></div>
            <h2>ACTUALIZANDO DATOS DE LA PLANTA</h2>
            <div id="refresh-countdown">20</div>
        </div>
    `;
    document.body.appendChild(modal);

    // Función del modal de los últimos 10 segundos
    function iniciarCuentaRegresiva() {
        let segundos = 10;
        const countdownEl = document.getElementById("refresh-countdown");
        
        modal.style.display = "flex";
        countdownEl.innerText = segundos;

        countdownInterval = setInterval(() => {
            segundos--;
            countdownEl.innerText = segundos;

            if (segundos <= 0) {
                clearInterval(countdownInterval);
                
                // Ejecuta tu función de carga general o recarga la página
                if (typeof tuFuncionDeCargaGeneral === "function") {
                    tuFuncionDeCargaGeneral(); 
                } else {
                    location.reload(); 
                }

                setTimeout(() => {
                    modal.style.display = "none";
                }, 2000);
            }
        }, 1000);
    }

    // RELOJ PRINCIPAL: Corre cada 1 segundo
    setInterval(() => {
        const relojFlotanteEl = document.getElementById("timer-reloj-cuenta");

        // --- VALIDACIÓN ESTRICTA POR FECHA SELECCIONADA ---
        const selectorFecha = document.getElementById("production-date");
        
        if (selectorFecha) {
            const fechaSeleccionada = selectorFecha.value; // Formato YYYY-MM-DD
            
            // Obtenemos la fecha de HOY en formato local estricto YYYY-MM-DD
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            const hoyFormateado = `${yyyy}-${mm}-${dd}`;

            // Si el usuario cambió de día para auditar (no es hoy), clavamos el freno de mano
            if (fechaSeleccionada && fechaSeleccionada !== hoyFormateado) {
                if (relojFlotanteEl) {
                    relojFlotanteEl.innerText = "PAUSADO";
                    relojFlotanteEl.style.color = "#ef4444"; // Rojo industrial de detención
                }
                return; // Corta la ejecución de este segundo. Evita el timer y el modal.
            }
        }

        // --- SI ES HOY: RESTAURAMOS EL COLOR CIAN ORIGINAL ---
        if (relojFlotanteEl) {
            relojFlotanteEl.style.color = "#f8cb38"; 
        }

        const ahora = new Date();
        const minutos = ahora.getMinutes();
        const segundos = ahora.getSeconds();

        // --- CÁLCULO DEL MINUTERO DECRECIENTE (Cada 20 min) ---
        let restoMinutos = 19 - (minutos % 20);
        let restoSegundos = 59 - segundos;

        let minFormateado = restoMinutos.toString().padStart(2, '0');
        let segFormateado = restoSegundos.toString().padStart(2, '0');

        // Actualizamos el relojito flotante en pantalla
        if (relojFlotanteEl) {
            relojFlotanteEl.innerText = `${minFormateado}:${segFormateado}`;
        }

        // --- CONTROL DEL MODAL (10s antes del corte) ---
        const minutosDeCorte = [19, 39, 59]; 
        if (minutosDeCorte.includes(minutos) && segundos === 50) {
            if (modal.style.display === "none") {
                iniciarCuentaRegresiva();
            }
        }
    }, 1000);
})();

// --- FUNCIÓN PARA DESCARGAR LA PÁGINA ACTUAL TAL CUAL SE VE EN PANTALLA ---
function capturarPantallaAPDF() {
    // Buscamos el contenedor principal de toda tu aplicación
    const contenedorApp = document.querySelector('.app-container');
    if (!contenedorApp) return;

    // Capturamos la fecha seleccionada para usarla en el nombre del archivo
    const fechaSeleccionada = document.getElementById("production-date").value || new Date().toISOString().split('T')[0];

    // Cambiamos temporalmente el cursor para avisar que está procesando los gráficos
    document.body.style.cursor = 'wait';
    const boton = document.getElementById('btn-export-pdf');
    if (boton) boton.disabled = true;

    // Configuramos html2canvas para que clone el contenedor con alta calidad
    html2canvas(contenedorApp, {
        scale: 2,             // Duplica la resolución para que los textos y gráficos no salgan pixelados
        useCORS: true,        // Permite procesar recursos externos si los hubiera
        backgroundColor: '#0f111a', // Forzamos el color de fondo oscuro original de Atiles
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        
        // Importamos jsPDF de sus módulos globales
        const { jsPDF } = window.jspdf;
        
        // Calculamos dimensiones para que se adapte de forma proporcional a una hoja A4
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // Ancho A4 en mm
        const pageHeight = 295; // Alto A4 en mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Primera página
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        // Si tu panel es muy largo y no entra en una sola hoja, genera páginas extra automáticamente
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;
        }

        // Descarga el archivo con la identidad visual intacta
        pdf.save(`Panel_Iniflex_Captura_${fechaSeleccionada}.pdf`);
        
        // Restauramos los controles
        document.body.style.cursor = 'default';
        if (boton) boton.disabled = false;
    }).catch(err => {
        console.error("Error al generar la captura:", err);
        document.body.style.cursor = 'default';
        if (boton) boton.disabled = false;
    });
}

// Vinculamos la acción al botón de la cabecera
document.getElementById('btn-export-pdf').addEventListener('click', capturarPantallaAPDF);