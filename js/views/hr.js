/* ============================================================
   NEOINVENT ENTERPRISE — RRHH (Empleados · Contratos · Despidos)
   Cálculo de prestaciones según LOTTT venezolana
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;

  const def = {
    title: 'RRHH',
    subtitle: 'Empleados, contratos y despidos (LOTTT)',
    render() {
      const db = Store.get();
      const employees = db.employees || [];
      const rows = employees.map(e => {
        const statusPill = e.status === 'ACTIVO' ? 'pill-ok'
          : e.status === 'VACACIONES' ? 'pill-in'
          : (e.status === 'RENUNCIA' || e.status === 'DESPIDIDO') ? 'pill-out' : 'pill-warn';
        return '<tr><td><strong>' + U.esc(e.first_name + ' ' + e.last_name) + '</strong></td>' +
          '<td>' + U.esc(e.position || '—') + '</td>' +
          '<td>' + U.esc(e.department || '—') + '</td>' +
          '<td class="num">' + U.money(e.base_salary || 0) + '</td>' +
          '<td><span class="pill ' + statusPill + '">' + U.esc(e.status || 'ACTIVO') + '</span></td>' +
          '<td class="actions">' +
          '<button class="icon-btn" data-emp-detail="' + e.id + '" title="Ver">👁</button>' +
          '<button class="icon-btn" data-emp-contract="' + e.id + '" title="Contrato">📄</button>' +
          '<button class="icon-btn danger" data-emp-term="' + e.id + '" title="Terminación">✕</button>' +
          '</td></tr>';
      }).join('');
      return '<div class="toolbar"><div class="toolbar-left"><span class="pill pill-ok">ACTIVOS: ' + employees.length + '</span></div>' +
        '<button class="btn btn-primary" data-emp-add>+ Nuevo empleado</button></div>' +
        U.table(['Empleado','Cargo','Departamento','Salario base','Estado',''], rows ? [rows] : [], 'Sin empleados');
    },
    mount(ctx, el) {
      el.querySelector('[data-emp-add]').addEventListener('click', () => employeeForm(ctx));
      el.querySelectorAll('[data-emp-detail]').forEach(b => b.addEventListener('click', () => employeeDetail(ctx, b.dataset.empDetail)));
      el.querySelectorAll('[data-emp-contract]').forEach(b => b.addEventListener('click', () => contractForm(ctx, b.dataset.empContract)));
      el.querySelectorAll('[data-emp-term]').forEach(b => b.addEventListener('click', () => terminationForm(ctx, b.dataset.empTerm)));
      Store.logEvent('VIEW', 'rrhh', 'Acceso a módulo RRHH', ctx.currentUser?.username);
    },
  };

  // ----- Formulario empleado -----
  function employeeForm(ctx, emp) {
    const db = Store.get();
    UI.modal(emp ? 'Editar empleado' : 'Nuevo empleado',
      '<form id="emp-form">' +
      '<div class="grid2">' +
      U.field('Nombre', '<input type="text" name="first_name" value="' + (emp ? U.esc(emp.first_name) : '') + '" required>') +
      U.field('Apellido', '<input type="text" name="last_name" value="' + (emp ? U.esc(emp.last_name) : '') + '" required>') +
      '</div><div class="grid2">' +
      U.field('Cédula', '<input type="text" name="cedula" value="' + (emp ? U.esc(emp.cedula) : '') + '" required>') +
      U.field('Departamento', '<input type="text" name="department" value="' + (emp ? U.esc(emp.department) : '') + '" required>') +
      '</div><div class="grid2">' +
      U.field('Cargo', '<input type="text" name="position" value="' + (emp ? U.esc(emp.position) : '') + '" required>') +
      U.field('Salario base', '<input type="number" name="base_salary" min="0" step="0.01" value="' + (emp ? emp.base_salary : 0) + '" required>') +
      '</div>' +
      U.field('Email', '<input type="email" name="email" value="' + (emp ? U.esc(emp.email) : '') + '">') +
      U.field('Teléfono', '<input type="tel" name="phone" value="' + (emp ? U.esc(emp.phone) : '') + '">') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Guardar empleado</button></div></form>');
    document.querySelector('#emp-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('emp-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (emp) {
        Object.assign(emp, { first_name: f.get('first_name'), last_name: f.get('last_name'), cedula: f.get('cedula'), department: f.get('department'), position: f.get('position'), base_salary: U.num(f.get('base_salary')), email: f.get('email'), phone: f.get('phone') });
        Store.logEvent('UPDATE', 'rrhh', 'Empleado actualizado: ' + emp.first_name + ' ' + emp.last_name, ctx.currentUser?.username);
      } else {
        db.employees = db.employees || [];
        db.employees.push({
          id: K('emp'), first_name: f.get('first_name'), last_name: f.get('last_name'),
          cedula: f.get('cedula'), department: f.get('department'), position: f.get('position'),
          base_salary: U.num(f.get('base_salary')), email: f.get('email'), phone: f.get('phone'),
          hire_date: new Date().toISOString().split('T')[0], status: 'ACTIVO',
        });
        Store.logEvent('CREATE', 'rrhh', 'Empleado registrado: ' + f.get('first_name') + ' ' + f.get('last_name'), ctx.currentUser?.username);
      }
      Store.persist(); UI.closeModal(); UI.toast('Empleado guardado', 'success'); ctx.reload();
    });
  }// ----- Detalle empleado -----
function employeeDetail(ctx, id) {
  const emp = (Store.get().employees || []).find(e => e.id === id);
  if (!emp) return;
  const yrs = emp.hire_date ? Math.max(0, Math.floor((new Date() - new Date(emp.hire_date)) / (365.25 * 864e5))) : 0;
  UI.modal('Empleado: ' + U.esc(emp.first_name + ' ' + emp.last_name),
    '<p><strong>Cargo:</strong> ' + U.esc(emp.position || '—') + '<br>' +
    '<strong>Departamento:</strong> ' + U.esc(emp.department || '—') + '<br>' +
    '<strong>Cédula:</strong> ' + U.esc(emp.cedula || '—') + '<br>' +
    '<strong>Salario:</strong> ' + U.money(emp.base_salary) + '<br>' +
    '<strong>Antigüedad:</strong> ' + yrs + ' año(s)</p>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-cancel>Cerrar</button></div>');
  document.querySelector('#modal-body [data-cancel]').addEventListener('click', UI.closeModal);
}

// ----- Contrato laboral -----
function contractForm(ctx, id) {
  const db = Store.get();
  const emp = (db.employees || []).find(e => e.id === id);
  if (!emp) return;
  const types = ['FIJO','TEMPORAL','OBRA','PASANTIA','TERCERIZADO','SUPERNUMERARIO'];
  UI.modal('Contrato laboral — ' + U.esc(emp.first_name + ' ' + emp.last_name),
    '<form id="contract-form">' +
    U.field('Tipo de contrato', '<select name="contract_type">' + types.map(t => '<option>' + t + '</option>').join('') + '</select>') +
    '<div class="grid2">' +
    U.field('Inicio', '<input type="date" name="start_date" value="' + new Date().toISOString().split('T')[0] + '">') +
    U.field('Fin (si aplica)', '<input type="date" name="end_date">') +
    '</div>' +
    U.field('Salario', '<input type="number" name="salary" value="' + emp.base_salary + '" min="0" step="0.01">') +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
    '<button type="submit" class="btn btn-primary">Crear contrato</button></div></form>');
  document.querySelector('#contract-form [data-cancel]').addEventListener('click', UI.closeModal);
  document.getElementById('contract-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const c = { id: K('ct'), employee_id: emp.id, contract_type: f.get('contract_type'),
      start_date: f.get('start_date'), end_date: f.get('end_date'), salary: U.num(f.get('salary')),
      status: 'VIGENTE', signed_date: new Date().toISOString().split('T')[0] };
    db.contracts = db.contracts || [];
    db.contracts.push(c);
    Store.logEvent('CREATE', 'rrhh-contratos', 'Contrato ' + c.contract_type + ' para ' + emp.first_name + ' ' + emp.last_name, ctx.currentUser?.username);
    Store.persist(); UI.closeModal(); UI.toast('Contrato creado', 'success'); ctx.reload();
  });
}

// ----- Terminación / Despido -----
function terminationForm(ctx, id) {
  const db = Store.get();
  const emp = (db.employees || []).find(e => e.id === id);
  if (!emp) return;
  const types = ['RENUNCIA','DESPIDO_JUSTIFICADO','DESPIDO_NO_JUSTIFICADO','MUTUO_ACUERDO','FIN_CONTRATO','JUBILACION'];
  UI.modal('Terminación laboral — ' + U.esc(emp.first_name + ' ' + emp.last_name),
    '<form id="term-form">' +
    U.field('Tipo', '<select name="termination_type">' + types.map(t => '<option>' + t + '</option>').join('') + '</select>') +
    U.field('Fecha de cese', '<input type="date" name="termination_date" value="' + new Date().toISOString().split('T')[0] + '">') +
    U.field('Motivo', '<textarea name="reason" rows="3" class="input"></textarea>') +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
    '<button type="submit" class="btn btn-danger">Procesar terminación</button></div></form>');
  document.querySelector('#term-form [data-cancel]').addEventListener('click', UI.closeModal);
  document.getElementById('term-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    emp.status = f.get('termination_type') === 'RENUNCIA' ? 'RENUNCIA' : 'DESPIDIDO';
    const t = { id: K('term'), employee_id: emp.id, termination_type: f.get('termination_type'),
      termination_date: f.get('termination_date'), reason: f.get('reason'), status: 'PROCESADA' };
    db.terminations = db.terminations || [];
    db.terminations.push(t);
    Store.logEvent('CREATE', 'rrhh-despidos', 'Terminación ' + t.termination_type + ' para ' + emp.first_name + ' ' + emp.last_name, ctx.currentUser?.username);
    Store.persist(); UI.closeModal(); UI.toast('Terminación procesada', 'success'); ctx.reload();
  });
}

App.register('hr', def);
})();
