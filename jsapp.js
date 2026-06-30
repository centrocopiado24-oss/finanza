// ============================================================
// FinanzasPro v3.1 - Lógica Principal COMPLETA
// ============================================================

// BASE DE DATOS LOCAL
let DB = {
    config: {
        TasaBCV: 0,
        SaldoBinance_USD: 0,
        SaldoEmpresa_USD: 0,
        SaldoPersonal_USD: 0,
        SaldoEmpresa_Bs: 0,
        SaldoPersonal_Bs: 0,
        NombreNegocio: 'Mi Negocio'
    },
    ingresos: [],
    recordatorios: [],
    deudas: [],
    empleados: [],
    notas: ''
};

// ============================================================
// GOOGLE SHEETS - Conexión
// ============================================================
let GS_URL = localStorage.getItem('FinanzasPro_GS_URL') || '';
let GS_CONECTADO = false;

window.addEventListener('DOMContentLoaded', () => {
    // Fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    
    // Ingresos
    const ingresoFecha = document.getElementById('ingresoFecha');
    if (ingresoFecha) ingresoFecha.value = hoy;
    
    // Recordatorios
    const recFechaActual = document.getElementById('recordatorioFechaActual');
    if (recFechaActual) recFechaActual.value = hoy;
    const recFecha = document.getElementById('recordatorioFecha');
    if (recFecha) recFecha.value = hoy;
    
    // Deudas
    const deudaFecha = document.getElementById('deudaFecha');
    if (deudaFecha) deudaFecha.value = hoy;
    
    // Empleados
    const empFecha = document.getElementById('empleadoFecha');
    if (empFecha) empFecha.value = hoy;

    // Cargar datos locales
    cargarDesdeLocalStorage();

    // Auto-conectar a Google Sheets si hay URL guardada
    if (GS_URL) {
        const urlInput = document.getElementById('urlGoogleSheets');
        if (urlInput) urlInput.value = GS_URL;
        cambiarEstadoGS('cargando', 'Verificando conexión...');
        verificarConexion();
    }
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ============================================================
// CÁLCULOS - Separación de monedas
// ============================================================
function calcularTotales() {
    const efectivoUSD = parseFloat(document.getElementById('efectivoUSD').value) || 0;
    const zelle = parseFloat(document.getElementById('zelle').value) || 0;
    const binance = parseFloat(document.getElementById('binance').value) || 0;
    const tarjetaDebitoUSD = document.getElementById('tarjetaDebitoMoneda').value === 'USD' ? 
        (parseFloat(document.getElementById('tarjetaDebito').value) || 0) : 0;
    const tarjetaCreditoUSD = document.getElementById('tarjetaCreditoMoneda').value === 'USD' ? 
        (parseFloat(document.getElementById('tarjetaCredito').value) || 0) : 0;
    
    const totalUSD = efectivoUSD + zelle + binance + tarjetaDebitoUSD + tarjetaCreditoUSD;
    
    const efectivoBS = parseFloat(document.getElementById('efectivoBS').value) || 0;
    const pagoMovil = parseFloat(document.getElementById('pagoMovil').value) || 0;
    const transferencia = parseFloat(document.getElementById('transferencia').value) || 0;
    const tarjetaDebitoBS = document.getElementById('tarjetaDebitoMoneda').value === 'BS' ? 
        (parseFloat(document.getElementById('tarjetaDebito').value) || 0) : 0;
    const tarjetaCreditoBS = document.getElementById('tarjetaCreditoMoneda').value === 'BS' ? 
        (parseFloat(document.getElementById('tarjetaCredito').value) || 0) : 0;
    
    const totalBS = efectivoBS + pagoMovil + transferencia + tarjetaDebitoBS + tarjetaCreditoBS;
    
    document.getElementById('totalUSD').textContent = '$' + totalUSD.toFixed(2);
    document.getElementById('totalBS').textContent = 'Bs. ' + totalBS.toFixed(2);
}

function calcularMontoBSRecordatorio() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const montoUSD = parseFloat(document.getElementById('recordatorioMontoUSD').value) || 0;
    document.getElementById('recordatorioMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
}

function calcularMontoBSDeuda() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    document.getElementById('deudaMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
}

// ============================================================
// INGRESOS
// ============================================================
function guardarIngreso() {
    const ingreso = {
        ID: Date.now(),
        Fecha: document.getElementById('ingresoFecha').value,
        TasaBCV: parseFloat(document.getElementById('ingresoTasa').value) || 0,
        SaldoIni_USD: parseFloat(document.getElementById('saldoIniUSD').value) || 0,
        SaldoIni_Bs: parseFloat(document.getElementById('saldoIniBS').value) || 0,
        Efectivo_USD: parseFloat(document.getElementById('efectivoUSD').value) || 0,
        Efectivo_Bs: parseFloat(document.getElementById('efectivoBS').value) || 0,
        PagoMovil_Bs: parseFloat(document.getElementById('pagoMovil').value) || 0,
        TarjetaDebito: parseFloat(document.getElementById('tarjetaDebito').value) || 0,
        TarjetaDebitoMoneda: document.getElementById('tarjetaDebitoMoneda').value,
        TarjetaCredito: parseFloat(document.getElementById('tarjetaCredito').value) || 0,
        TarjetaCreditoMoneda: document.getElementById('tarjetaCreditoMoneda').value,
        Transferencia_Bs: parseFloat(document.getElementById('transferencia').value) || 0,
        Zelle_USD: parseFloat(document.getElementById('zelle').value) || 0,
        Binance_USD: parseFloat(document.getElementById('binance').value) || 0,
        Observacion: document.getElementById('observacion').value
    };
    
    ingreso.Total_USD = ingreso.Efectivo_USD + ingreso.Zelle_USD + ingreso.Binance_USD + 
        (ingreso.TarjetaDebitoMoneda === 'USD' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'USD' ? ingreso.TarjetaCredito : 0);
    
    ingreso.Total_Bs = ingreso.Efectivo_Bs + ingreso.PagoMovil_Bs + ingreso.Transferencia_Bs +
        (ingreso.TarjetaDebitoMoneda === 'BS' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'BS' ? ingreso.TarjetaCredito : 0);
    
    ingreso.SaldoFin_USD = ingreso.SaldoIni_USD + ingreso.Total_USD;
    ingreso.SaldoFin_Bs = ingreso.SaldoIni_Bs + ingreso.Total_Bs;
    
    DB.ingresos.push(ingreso);
    DB.config.TasaBCV = ingreso.TasaBCV;
    
    guardarEnLocalStorage();
    renderizarIngresos();
    limpiarIngreso();
    actualizarDashboard();
    alert('✅ Ingreso guardado correctamente');
}

function renderizarIngresos() {
    const tbody = document.querySelector('#tablaIngresos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    DB.ingresos.forEach(ing => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ing.Fecha}</td>
            <td>${ing.TasaBCV}</td>
            <td>${ing.SaldoIni_USD.toFixed(2)}</td>
            <td>${ing.SaldoIni_Bs.toFixed(2)}</td>
            <td>${ing.Efectivo_USD.toFixed(2)}</td>
            <td>${ing.Efectivo_Bs.toFixed(2)}</td>
            <td>${ing.PagoMovil_Bs.toFixed(2)}</td>
            <td>${ing.TarjetaDebito.toFixed(2)}</td>
            <td>${ing.TarjetaCredito.toFixed(2)}</td>
            <td>${ing.Transferencia_Bs.toFixed(2)}</td>
            <td>${ing.Zelle_USD.toFixed(2)}</td>
            <td>${ing.Binance_USD.toFixed(2)}</td>
            <td><strong>${ing.Total_USD.toFixed(2)}</strong></td>
            <td><strong>${ing.Total_Bs.toFixed(2)}</strong></td>
            <td>${ing.SaldoFin_USD.toFixed(2)}</td>
            <td>${ing.SaldoFin_Bs.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="eliminarIngreso(${ing.ID})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('totalTransacciones').textContent = DB.ingresos.length;
}

function eliminarIngreso(id) {
    if (confirm('¿Eliminar este registro?')) {
        DB.ingresos = DB.ingresos.filter(i => i.ID !== id);
        guardarEnLocalStorage();
        renderizarIngresos();
        actualizarDashboard();
    }
}

function limpiarIngreso() {
    document.getElementById('efectivoUSD').value = 0;
    document.getElementById('efectivoBS').value = 0;
    document.getElementById('pagoMovil').value = 0;
    document.getElementById('tarjetaDebito').value = 0;
    document.getElementById('tarjetaCredito').value = 0;
    document.getElementById('transferencia').value = 0;
    document.getElementById('zelle').value = 0;
    document.getElementById('binance').value = 0;
    document.getElementById('observacion').value = '';
    calcularTotales();
}

// ============================================================
// RECORDATORIOS
// ============================================================
function guardarRecordatorio() {
    const recordatorio = {
        ID: Date.now(),
        FechaCreacion: new Date().toISOString(),
        FechaRecordatorio: document.getElementById('recordatorioFecha').value,
        Descripcion: document.getElementById('recordatorioDescripcion').value,
        MontoUSD: parseFloat(document.getElementById('recordatorioMontoUSD').value) || 0,
        MontoBs: parseFloat(document.getElementById('recordatorioMontoBS').value) || 0,
        Detalle: document.getElementById('recordatorioDetalle').value,
        Prioridad: document.getElementById('recordatorioPrioridad').value,
        Completado: false
    };
    
    DB.recordatorios.push(recordatorio);
    guardarEnLocalStorage();
    renderizarRecordatorios();
    limpiarRecordatorio();
    actualizarDashboard();
    alert('✅ Recordatorio guardado correctamente');
}

function renderizarRecordatorios() {
    const tbody = document.querySelector('#tablaRecordatorios tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    DB.recordatorios.forEach(rec => {
        const tr = document.createElement('tr');
        const badgeClass = rec.Prioridad === 'Alta' ? 'badge-high' : rec.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
        tr.innerHTML = `
            <td>${rec.FechaRecordatorio}</td>
            <td>${rec.Descripcion}</td>
            <td>$${rec.MontoUSD.toFixed(2)}</td>
            <td>Bs. ${rec.MontoBs.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${rec.Prioridad}</span></td>
            <td>${rec.Detalle}</td>
            <td>${rec.Completado ? '✅ Completado' : '⏳ Pendiente'}</td>
            <td>
                <button class="btn btn-${rec.Completado ? 'warning' : 'success'}" onclick="toggleRecordatorio(${rec.ID})">
                    ${rec.Completado ? '↩️' : '✅'}
                </button>
                <button class="btn btn-danger" onclick="eliminarRecordatorio(${rec.ID})">️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleRecordatorio(id) {
    const rec = DB.recordatorios.find(r => r.ID === id);
    if (rec) {
        rec.Completado = !rec.Completado;
        guardarEnLocalStorage();
        renderizarRecordatorios();
        actualizarDashboard();
    }
}

function eliminarRecordatorio(id) {
    if (confirm('¿Eliminar este recordatorio?')) {
        DB.recordatorios = DB.recordatorios.filter(r => r.ID !== id);
        guardarEnLocalStorage();
        renderizarRecordatorios();
        actualizarDashboard();
    }
}

function limpiarRecordatorio() {
    document.getElementById('recordatorioDescripcion').value = '';
    document.getElementById('recordatorioMontoUSD').value = '';
    document.getElementById('recordatorioMontoBS').value = '';
    document.getElementById('recordatorioMontoBSCalculado').value = '';
    document.getElementById('recordatorioDetalle').value = '';
}

// ============================================================
// DEUDAS / PAGAR - ESTA ES LA FUNCIÓN QUE TE FALLA
// ============================================================
function guardarDeuda() {
    // Validar campos obligatorios
    const nombre = document.getElementById('deudaNombre').value.trim();
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    
    if (!nombre) {
        alert('⚠️ Debes ingresar el nombre del proveedor');
        return;
    }
    if (montoUSD <= 0) {
        alert('⚠️ Debes ingresar un monto mayor a 0');
        return;
    }
    
    const deuda = {
        ID: Date.now(),
        Fecha: document.getElementById('deudaFecha').value,
        TasaBCV: DB.config.TasaBCV,
        RIF: document.getElementById('deudaRIF').value,
        Nombre: nombre,
        Descripcion: document.getElementById('deudaDescripcion').value,
        NroFactura: document.getElementById('deudaFactura').value,
        MontoUSD: montoUSD,
        MontoBs: parseFloat(document.getElementById('deudaMontoBS').value) || (montoUSD * DB.config.TasaBCV) || 0,
        Etiqueta: document.getElementById('deudaEtiqueta').value,
        Prioridad: document.getElementById('deudaPrioridad').value,
        CuentaOrigen: document.getElementById('deudaCuentaOrigen').value,
        Pagado: false,
        TotalAbonado: 0,
        SaldoPendiente: montoUSD
    };
    
    DB.deudas.push(deuda);
    guardarEnLocalStorage();
    renderizarDeudas();
    limpiarDeuda();
    actualizarDashboard();
    alert('✅ Proveedor/Deuda guardado correctamente');
}

function renderizarDeudas() {
    const tbody = document.querySelector('#tablaDeudas tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let totalPendiente = 0;
    let totalPrioridadAlta = 0;
    let deudasActivas = 0;
    
    DB.deudas.forEach(deuda => {
        if (!deuda.Pagado) {
            deudasActivas++;
            totalPendiente += deuda.MontoUSD;
            if (deuda.Prioridad === 'Alta') totalPrioridadAlta += deuda.MontoUSD;
            
            const tr = document.createElement('tr');
            const badgeClass = deuda.Prioridad === 'Alta' ? 'badge-high' : deuda.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
            tr.innerHTML = `
                <td>${deuda.Fecha}</td>
                <td>${deuda.RIF}</td>
                <td>${deuda.Nombre}</td>
                <td>${deuda.Descripcion}</td>
                <td>${deuda.NroFactura}</td>
                <td>$${deuda.MontoUSD.toFixed(2)}</td>
                <td>Bs. ${deuda.MontoBs.toFixed(2)}</td>
                <td>${deuda.Etiqueta}</td>
                <td><span class="badge ${badgeClass}">${deuda.Prioridad}</span></td>
                <td>${deuda.CuentaOrigen || '-'}</td>
                <td>
                    <button class="btn btn-success" onclick="marcarPagada(${deuda.ID})"></button>
                    <button class="btn btn-danger" onclick="eliminarDeuda(${deuda.ID})">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
    
    const elTotalPendiente = document.getElementById('totalPendiente');
    if (elTotalPendiente) elTotalPendiente.textContent = totalPendiente.toFixed(2);
    
    const elTotalAlta = document.getElementById('totalPrioridadAlta');
    if (elTotalAlta) elTotalAlta.textContent = totalPrioridadAlta.toFixed(2);
    
    const elTotalDeudas = document.getElementById('totalDeudas');
    if (elTotalDeudas) elTotalDeudas.textContent = deudasActivas;
}

function marcarPagada(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (deuda && confirm(`¿Marcar deuda de $${deuda.MontoUSD} como PAGADA?`)) {
        deuda.Pagado = true;
        guardarEnLocalStorage();
        renderizarDeudas();
        actualizarDashboard();
        alert('✅ Deuda marcada como pagada');
    }
}

function eliminarDeuda(id) {
    if (confirm('¿Eliminar esta deuda?')) {
        DB.deudas = DB.deudas.filter(d => d.ID !== id);
        guardarEnLocalStorage();
        renderizarDeudas();
        actualizarDashboard();
    }
}

function limpiarDeuda() {
    document.getElementById('deudaRIF').value = '';
    document.getElementById('deudaNombre').value = '';
    document.getElementById('deudaDescripcion').value = '';
    document.getElementById('deudaFactura').value = '';
    document.getElementById('deudaMontoUSD').value = '';
    document.getElementById('deudaMontoBSCalculado').value = '';
    document.getElementById('deudaCuentaOrigen').value = '';
}

function actualizarSaldosCuentas() {
    DB.config.SaldoBinance_USD = parseFloat(document.getElementById('saldoBinance').value) || 0;
    DB.config.SaldoEmpresa_USD = parseFloat(document.getElementById('saldoEmpresa').value) || 0;
    DB.config.SaldoPersonal_USD = parseFloat(document.getElementById('saldoPersonal').value) || 0;
    guardarEnLocalStorage();
}

// ============================================================
// EMPLEADOS
// ============================================================
function guardarEmpleado() {
    const empleado = {
        ID: Date.now(),
        FechaIngreso: document.getElementById('empleadoFecha').value,
        Nombre: document.getElementById('empleadoNombre').value,
        Cedula: document.getElementById('empleadoCedula').value,
        TipoSueldo: document.getElementById('empleadoTipoSueldo').value,
        SueldoUSD: parseFloat(document.getElementById('empleadoSueldo').value) || 0,
        Status: 'Activo'
    };
    
    DB.empleados.push(empleado);
    guardarEnLocalStorage();
    renderizarEmpleados();
    limpiarEmpleado();
    actualizarDashboard();
    alert('✅ Empleado guardado correctamente');
}

function renderizarEmpleados() {
    const tbody = document.querySelector('#tablaEmpleados tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    DB.empleados.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.FechaIngreso}</td>
            <td>${emp.Nombre}</td>
            <td>${emp.Cedula}</td>
            <td>${emp.TipoSueldo}</td>
            <td>$${emp.SueldoUSD.toFixed(2)}</td>
            <td>${emp.Status}</td>
            <td><button class="btn btn-danger" onclick="eliminarEmpleado(${emp.ID})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarEmpleado(id) {
    if (confirm('¿Eliminar este empleado?')) {
        DB.empleados = DB.empleados.filter(e => e.ID !== id);
        guardarEnLocalStorage();
        renderizarEmpleados();
        actualizarDashboard();
    }
}

function limpiarEmpleado() {
    document.getElementById('empleadoNombre').value = '';
    document.getElementById('empleadoCedula').value = '';
    document.getElementById('empleadoSueldo').value = '';
}

// ============================================================
// BÚSQUEDA
// ============================================================
function realizarBusqueda() {
    const desde = document.getElementById('busqDesde').value;
    const hasta = document.getElementById('busqHasta').value;
    const filtro = document.getElementById('busqFiltro').value;
    const texto = document.getElementById('busqTexto').value.toLowerCase();
    
    let resultados = [];
    
    if (filtro === 'todos' || filtro === 'ingresos') {
        DB.ingresos.forEach(ing => {
            if (desde && ing.Fecha < desde) return;
            if (hasta && ing.Fecha > hasta) return;
            if (texto && !JSON.stringify(ing).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Ingreso', fecha: ing.Fecha, texto: `Total: $${ing.Total_USD} / Bs.${ing.Total_Bs}` });
        });
    }
    
    if (filtro === 'todos' || filtro === 'deudas') {
        DB.deudas.forEach(d => {
            if (desde && d.Fecha < desde) return;
            if (hasta && d.Fecha > hasta) return;
            if (texto && !JSON.stringify(d).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Deuda', fecha: d.Fecha, texto: `${d.Nombre} - $${d.MontoUSD}` });
        });
    }
    
    if (filtro === 'todos' || filtro === 'recordatorios') {
        DB.recordatorios.forEach(r => {
            if (desde && r.FechaRecordatorio < desde) return;
            if (hasta && r.FechaRecordatorio > hasta) return;
            if (texto && !JSON.stringify(r).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Recordatorio', fecha: r.FechaRecordatorio, texto: r.Descripcion });
        });
    }
    
    if (filtro === 'todos' || filtro === 'nomina') {
        DB.empleados.forEach(e => {
            if (texto && !JSON.stringify(e).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Empleado', fecha: e.FechaIngreso, texto: `${e.Nombre} - $${e.SueldoUSD}` });
        });
    }
    
    const cont = document.getElementById('resultadosBusqueda');
    if (resultados.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">Sin resultados</p>';
    } else {
        cont.innerHTML = `<p style="padding:10px;font-weight:600;">${resultados.length} resultado(s) encontrado(s)</p>` +
            resultados.map(r => `
                <div style="padding:10px;background:white;margin:5px 0;border-radius:6px;border-left:4px solid #667eea;">
                    <strong>${r.tipo}</strong> - ${r.fecha}<br>
                    ${r.texto}
                </div>
            `).join('');
    }
}

// ============================================================
// DASHBOARD
// ============================================================
function actualizarDashboard() {
    const totalIngresosUSD = DB.ingresos.reduce((sum, ing) => sum + ing.Total_USD, 0);
    const totalIngresosBS = DB.ingresos.reduce((sum, ing) => sum + ing.Total_Bs, 0);
    const totalDeudas = DB.deudas.filter(d => !d.Pagado).reduce((sum, d) => sum + d.MontoUSD, 0);
    const totalNomina = DB.empleados.reduce((sum, emp) => sum + emp.SueldoUSD, 0);
    const recordatoriosPendientes = DB.recordatorios.filter(r => !r.Completado).length;
    
    document.getElementById('dashIngresos').textContent = `$${totalIngresosUSD.toFixed(2)} / Bs. ${totalIngresosBS.toFixed(2)}`;
    document.getElementById('dashDeudas').textContent = `$${totalDeudas.toFixed(2)}`;
    document.getElementById('dashNumDeudas').textContent = DB.deudas.filter(d => !d.Pagado).length;
    document.getElementById('dashNomina').textContent = `$${totalNomina.toFixed(2)}`;
    document.getElementById('dashNumEmpleados').textContent = DB.empleados.length;
    document.getElementById('dashRecordatorios').textContent = recordatoriosPendientes;
    document.getElementById('dashBalance').textContent = `$${(totalIngresosUSD - totalDeudas - totalNomina).toFixed(2)}`;
}

// ============================================================
// UTILIDADES
// ============================================================
function actualizarTasa() {
    DB.config.TasaBCV = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const tasaInput = document.getElementById('recordatorioTasa');
    if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
    const ingresoTasa = document.getElementById('ingresoTasa');
    if (ingresoTasa) ingresoTasa.value = DB.config.TasaBCV;
    guardarEnLocalStorage();
}

function actualizarNegocio() {
    DB.config.NombreNegocio = document.getElementById('nombreNegocio').value;
    guardarEnLocalStorage();
}

function guardarNotas() {
    DB.notas = document.getElementById('notasRapidas').value;
    guardarEnLocalStorage();
    alert('✅ Notas guardadas');
}

// ============================================================
// LOCAL STORAGE
// ============================================================
function guardarEnLocalStorage() {
    localStorage.setItem('FinanzasProDB', JSON.stringify(DB));
}

function cargarDesdeLocalStorage() {
    const saved = localStorage.getItem('FinanzasProDB');
    if (saved) {
        DB = JSON.parse(saved);
        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        document.getElementById('notasRapidas').value = DB.notas || '';
        
        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        actualizarDashboard();
    }
}

// ============================================================
// EXCEL - CARGAR/GUARDAR
// ============================================================
function cargarExcelBtn() {
    document.getElementById('inputExcel').click();
}

function cargarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array'});
        
        DB.config = leerHojaConfig(wb, 'Config') || DB.config;
        DB.ingresos = leerHoja(wb, 'Ingresos') || [];
        DB.recordatorios = leerHoja(wb, 'Recordatorios') || [];
        DB.deudas = leerHoja(wb, 'Deudas') || [];
        DB.empleados = leerHoja(wb, 'Empleados') || [];
        
        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        
        guardarEnLocalStorage();
        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        actualizarDashboard();
        
        alert('✅ Excel cargado: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
}

function leerHojaConfig(wb, nombre) {
    if (!wb.SheetNames.includes(nombre)) return {};
    const sheet = wb.Sheets[nombre];
    const json = XLSX.utils.sheet_to_json(sheet, {defval:''});
    const obj = {};
    json.forEach(r => obj[r.Clave] = r.Valor);
    return obj;
}

function leerHoja(wb, nombre) {
    if (!wb.SheetNames.includes(nombre)) return [];
    const sheet = wb.Sheets[nombre];
    return XLSX.utils.sheet_to_json(sheet, {defval:''});
}

function guardarExcel() {
    const wb = XLSX.utils.book_new();
    
    const configArr = [['Clave','Valor']];
    Object.entries(DB.config).forEach(([k,v]) => configArr.push([k,v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configArr), 'Config');
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.ingresos), 'Ingresos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.recordatorios), 'Recordatorios');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.deudas), 'Deudas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.empleados), 'Empleados');
    
    const nombre = (DB.config.NombreNegocio || 'FinanzasPro').replace(/\s+/g,'_');
    XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================================
// PDF - Respaldo diario
// ============================================================
function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('FinanzasPro - Respaldo Diario', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Negocio: ${DB.config.NombreNegocio}`, 14, 38);
    doc.text(`Tasa BCV: ${DB.config.TasaBCV}`, 14, 46);
    
    const tableData = DB.ingresos.map(ing => [
        ing.Fecha, ing.Total_USD.toFixed(2), ing.Total_Bs.toFixed(2),
        ing.SaldoFin_USD.toFixed(2), ing.SaldoFin_Bs.toFixed(2)
    ]);
    
    doc.autoTable({
        startY: 55,
        head: [['Fecha', 'Total USD', 'Total Bs', 'Saldo Final USD', 'Saldo Final Bs']],
        body: tableData,
    });
    
    doc.save(`FinanzasPro_Respaldo_${new Date().toISOString().split('T')[0]}.pdf`);
    alert('✅ PDF generado');
}

// ============================================================
// GOOGLE SHEETS - Funciones completas
// ============================================================
function cambiarEstadoGS(estado, texto) {
    const dot = document.getElementById('estadoGS');
    const txt = document.getElementById('textoEstadoGS');
    
    dot.className = 'status-dot';
    
    if (estado === 'conectado') {
        dot.textContent = '🟢';
        txt.textContent = '✅ Cargado y Conectado';
        GS_CONECTADO = true;
    } else if (estado === 'desconectado') {
        dot.textContent = '🔴';
        txt.textContent = 'Desconectado - Pega tu URL para conectar';
        GS_CONECTADO = false;
    } else if (estado === 'cargando') {
        dot.textContent = '🟡';
        txt.textContent = texto || 'Conectando...';
        dot.classList.add('estado-cargando');
    } else if (estado === 'error') {
        dot.textContent = '⚠️';
        txt.textContent = 'Error: ' + texto;
        GS_CONECTADO = false;
    }
}

async function verificarConexion() {
    try {
        const res = await fetch(GS_URL + '?action=status');
        const data = await res.json();
        if (data.success) {
            cambiarEstadoGS('conectado');
        } else {
            cambiarEstadoGS('error', 'URL no válida');
        }
    } catch (err) {
        cambiarEstadoGS('error', 'No se puede conectar');
    }
}

function conectarGoogleSheets() {
    const url = document.getElementById('urlGoogleSheets').value.trim();
    if (!url) {
        alert('⚠️ Pega la URL de tu Apps Script (termina en /exec)');
        return;
    }
    if (!url.includes('/exec')) {
        alert('⚠️ La URL debe terminar en /exec');
        return;
    }
    
    GS_URL = url;
    localStorage.setItem('FinanzasPro_GS_URL', url);
    cambiarEstadoGS('cargando', 'Conectando...');
    verificarConexion();
}

function desconectarGoogleSheets() {
    if (confirm('¿Desconectar de Google Sheets? Los datos locales seguirán guardados.')) {
        GS_URL = '';
        GS_CONECTADO = false;
        localStorage.removeItem('FinanzasPro_GS_URL');
        document.getElementById('urlGoogleSheets').value = '';
        cambiarEstadoGS('desconectado');
    }
}

async function cargarDesdeSheets() {
    if (!GS_URL) {
        alert('⚠️ Primero conecta tu Google Sheet');
        return;
    }
    
    cambiarEstadoGS('cargando', 'Cargando datos...');
    
    try {
        const res = await fetch(GS_URL + '?action=load');
        const data = await res.json();
        
        if (data.success) {
            DB = data.data;
            
            if (DB.config) {
                document.getElementById('tasaBCV').value = DB.config.TasaBCV || 0;
                document.getElementById('nombreNegocio').value = DB.config.NombreNegocio || '';
                document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD || 0;
                document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD || 0;
                document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD || 0;
            }
            
            guardarEnLocalStorage();
            renderizarIngresos();
            renderizarRecordatorios();
            renderizarDeudas();
            renderizarEmpleados();
            actualizarDashboard();
            
            cambiarEstadoGS('conectado');
            alert('✅ Datos cargados desde Google Sheets correctamente');
        } else {
            cambiarEstadoGS('error', data.error || 'Error al cargar');
        }
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert('❌ Error al conectar: ' + err.message);
    }
}

async function guardarEnSheets() {
    if (!GS_URL) {
        alert('⚠️ Primero conecta tu Google Sheet');
        return;
    }
    
    cambiarEstadoGS('cargando', 'Guardando en la nube...');
    
    try {
        await fetch(GS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save',
                data: DB
            })
        });
        
        cambiarEstadoGS('conectado');
        alert('✅ Datos guardados en Google Sheets correctamente');
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert(' Error al guardar: ' + err.message);
    }
}
