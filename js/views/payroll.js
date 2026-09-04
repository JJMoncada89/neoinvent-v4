/* NÓMINA VENEZOLANA — IVSS 4% · FAOV 2% · INCE 0.5% · ISLR progresivo UT */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;
  const TASAS = { ivss: 4, faov: 2, ince: 0.5, ut: 100 };

  function calcISLR(salarioMensual) {
    const utAnual = (salarioMensual * 12) / TASAS.ut;
    if (utAnual <= 1000) return { monto: 0, tramo: 'Exento hasta 1000 UT', utAnual };
    const base = utAnual - 1000;
    let imp = 0, tramo = '';
    if (utAnual <= 2000) { imp = base * 0.03; tramo = '3% exceso 1000 UT'; }
    else if (utAnual <= 3000) { imp = 30 + (base - 1000) * 0.06; tramo = '6% tramo 2001-3000'; }
    else if (utAnual <= 4000) { imp = 90 + (base - 2000) * 0.09; tramo = '9% tramo 3001-4000'; }
    else { imp = 180 + (base - 3000) * 0.12; tramo = '12% sobre 4000+'; }
    return { monto: (imp * TASAS.ut) / 12, tramo, utAnual };
  }

  function calcEmpleado(emp, dias) {
    const base = (emp.base_salary / 30) * dias;
    const ivss = +(base * 0.04).toFixed(2);
    const faov = +(base * 0.02).toFixed(2);
    const ince = +(base * 0.005).toFixed(2);
    const islr = calcISLR(base);
    const ded = +(ivss + faov + ince + islr.monto).toFixed(2);
    return { base: +base.toFixed(2), ivss, faov, ince, islr: islr.monto, tramoISLR: islr.tramo, ded, neto: +(base - ded).toFixed(2) };
  }

  const def = {
    title: 'Nómina',
    subtitle: 'Cálculo con retenciones venezolanas (referencia SENIAT)',
    render() {
      return '<div class="toolbar"><div class="toolbar-left">' +
        '<span class="pill pill-in">UT: Bs ' + TASAS.ut + '</span>' +
        '<span class="pill pill-warn">Tarifa ISLR referencia</span></div>' +
        '<div class="toolbar-left">' +
        '<input type="month" id="np-periodo" class="input" style="max-width:160px" value="' + new Date().toISOString().slice(0, 7) + '">' +
        '<select id="np-dias" class="input" style="max-width:110px"><option>15</option><option selected>30</option></select>' +
        '<button class="btn btn-primary" data-np-procesar>Calcular nómina</button></div></div>' +
        '<div class="card" id="np-results"><div class="empty">Seleccione periodo y presione Calcular nómina.</div></div>';
    },
    mount(ctx, el) {
      el.querySelector('[data-np-procesar]').addEventListener('click', () => {
        const periodo = el.querySelector('#np-periodo').value;
        const dias = parseInt(el.querySelector('#np-dias').value) || 30;
        const db = Store.get();
        const empleados = (db.employees || []).filter(e => e.status === 'ACTIVO');
        if (!empleados.length) return UI.toast('No hay empleados activos', 'warn');

        const rows = empleados.map(emp => {
          const c = calcEmpleado(emp, dias);
          return '<tr><td><strong>' + U.esc(emp.first_name + ' ' + emp.last_name) + '</strong></td>' +
            '<td class="num">' + U.money(emp.base_salary) + '</td><td class="num">' + dias + '</td>' +
            '<td class="num">' + U.money(c.ivss) + '</td><td class="num">' + U.money(c.faov) + '</td>' +
            '<td class="num">' + U.money(c.ince) + '</td>' +
            '<td class="num" title="' + U.esc(c.tramoISLR) + '">' + U.money(c.islr) + '</td>' +
            '<td class="num"><strong>' + U.money(c.neto) + '</strong></td>' +
            '<td class="actions"><button class="icon-btn" data-recibo="' + emp.id + '" title="Comprobante">🧾</button></td></tr>';
        }).join('');

        const totales = empleados.reduce((a, emp) => {
          const c = calcEmpleado(emp, dias);
          a.base += c.base; a.ded += c.ded; a.neto += c.neto; return a;
        }, { base: 0, ded: 0, neto: 0 });

        const tb = el.querySelector('#np-results');
        tb.innerHTML =
          '<div class="card-title">Nómina ' + (periodo || '') + ' — ' + dias + ' días</div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Empleado</th><th>Salario</th><th>Días</th><th>IVSS</th><th>FAOV</th><th>INCE</th><th>ISLR</th><th>Neto</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div class="kpis" style="margin-top:16px">' +
          U.kpiCard({ label: 'Total asignado', value: U.money(totales.base) }) +
          U.kpiCard({ label: 'Total deducciones', value: U.money(totales.ded), tone: 'neg' }) +
          U.kpiCard({ label: 'Total neto a pagar', value: U.money(totales.neto), tone: 'pos' }) +
          '</div>';

        db.payrolls = db.payrolls || [];
        db.payrolls.push({ id: K('pr'), periodo, dias, fecha: new Date().toISOString(), totales });
        Store.persist();
        Store.logEvent('CREATE', 'nomina', 'Nómina ' + periodo + ' calculada: neto ' + U.money(totales.neto), ctx.currentUser?.username);

        tb.querySelectorAll('[data-recibo]').forEach(b => b.addEventListener('click', () => recibo(Store.get().employees.find(e => e.id === b.dataset.recibo), dias)));
      });
    },
  };

  function recibo(emp, dias) {
    if (!emp) return;
    const c = calcEmpleado(emp, dias);
    const w = window.open('', '_blank', 'width=380,height=560');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Recibo ' + emp.first_name + '</title>' +
      '<style>body{font-family:monospace;font-size:12px;width:350px;margin:0 auto;padding:16px}.c{text-align:center}h3{margin:4px 0}.b{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0}td.r{text-align:right}.tot{font-size:15px;font-weight:700;border-top:2px solid #000;margin-top:6px;padding-top:6px}</style></head><body>' +
      '<div class="c"><h3>' + U.esc(Store.get().settings.businessName) + '</h3>' +
      '<div>Comprobante de Nómina</div><div>' + U.esc(emp.first_name + ' ' + emp.last_name) + '</div>' +
      '<div>' + U.esc(emp.position || '') + ' · ' + dias + ' días</div></div>' +
      '<div class="b"><table>' +
      '<tr><td>Salario asignado</td><td class="r">' + U.money(c.base) + '</td></tr>' +
      '<tr><td>IVSS (4%)</td><td class="r">−' + U.money(c.ivss) + '</td></tr>' +
      '<tr><td>FAOV (2%)</td><td class="r">−' + U.money(c.faov) + '</td></tr>' +
      '<tr><td>INCE (0.5%)</td><td class="r">−' + U.money(c.ince) + '</td></tr>' +
      '<tr><td>ISLR</td><td class="r">−' + U.money(c.islr) + '</td></tr>' +
      '<tr class="tot"><td>NETO A PAGAR</td><td class="r">' + U.money(c.neto) + '</td></tr>' +
      '</table></div>' +
      '<div class="c" style="margin-top:10px;font-size:10px;color:#666">Documento sin valor legal. Tarifa ISLR de referencia — verificar con SENIAT.<br>Generado: ' + new Date().toLocaleString('es') + '</div>' +
      '</body></html>');
    w.document.close();
  }

  App.register('payroll', def);
})();
