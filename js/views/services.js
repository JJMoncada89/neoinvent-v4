/* ============================================================
   NEOINVENT ENTERPRISE — FASE 5: Servicios · Activos TI · Órdenes de Trabajo SLA
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;

  const def = {
    title: 'Servicios & TI',
    subtitle: 'Catálogo, activos TI y órdenes de trabajo con SLA',
    render() {
      const db = Store.get();
      const services = db.services || [];
      const assets = db.itAssets || [];
      const wos = (db.workOrders || []).slice().reverse();

      const svcRows = services.map(s => '<tr><td><strong>' + U.esc(s.nombre) + '</strong></td>' +
        '<td>' + U.esc(s.categoria || '—') + '</td><td class="num">' + U.money(s.precio) + '</td>' +
        '<td class="num">' + (s.duracion_estimada_horas || 0) + ' h</td></tr>').join('');

      const assetRows = assets.map(a => {
        const pill = a.status === 'OPERATIVO' ? 'pill-ok' : a.status === 'PRESTADO' ? 'pill-in' : 'pill-warn';
        return '<tr><td style="font-family:var(--font-mono);font-size:11px">' + U.esc(a.asset_tag) + '</td>' +
          '<td><strong>' + U.esc(a.nombre) + '</strong></td><td>' + U.esc(a.tipo) + '</td>' +
          '<td>' + U.esc(a.assigned_name || a.assignedTo || 'Sin asignar') + '</td>' +
          '<td><span class="pill ' + pill + '">' + U.esc(a.status) + '</span></td></tr>';
      }).join('');

      const woRows = wos.map(w => {
        const pPill = w.priority === 'CRITICA' ? 'pill-out' : w.priority === 'ALTA' ? 'pill-warn' : 'pill-in';
        const sPill = w.status === 'RESUELTA' || w.status === 'CERRADA' ? 'pill-ok' : w.slaBreached ? 'pill-out' : 'pill-in';
        return '<tr><td style="font-family:var(--font-mono);font-size:11px">' + U.esc(w.wo_number || w.id.slice(0, 8)) + '</td>' +
          '<td><strong>' + U.esc(w.title) + '</strong></td>' +
          '<td><span class="pill ' + pPill + '">' + U.esc(w.priority || 'NORMAL') + '</span></td>' +
          '<td>' + U.esc(w.assigned_name || w.assignedTo || '—') + '</td>' +
          '<td><span class="pill ' + sPill + '">' + U.esc(w.status || 'ABIERTA') + (w.slaBreached ? ' ⏰' : '') + '</span></td>' +
          '<td class="actions">' + (w.status !== 'RESUELTA' && w.status !== 'CERRADA' ? '<button class="icon-btn" data-wo-resolve="' + w.id + '" title="Resolver">✔</button>' : '') + '</td></tr>';
      }).join('');

      const abiertas = wos.filter(w => w.status !== 'RESUELTA' && w.status !== 'CERRADA').length;
      const breached = wos.filter(w => w.slaBreached).length;

      return '<div class="kpis">' +
        U.kpiCard({ label: 'Servicios en catálogo', value: services.length }) +
        U.kpiCard({ label: 'Activos TI', value: assets.length, tone: 'info' }) +
        U.kpiCard({ label: 'WO abiertas', value: abiertas, tone: abiertas > 0 ? 'neg' : 'pos' }) +
        U.kpiCard({ label: 'SLA vencidos', value: breached, tone: breached > 0 ? 'neg' : 'pos' }) +
        '</div>' +
        '<div class="toolbar"><div class="toolbar-left">' +
        '<button class="btn btn-primary" data-svc-new>+ Servicio</button>' +
        '<button class="btn btn-outline" data-asset-new>+ Activo TI</button>' +
        '<button class="btn btn-success" data-wo-new>+ Orden de trabajo</button></div></div>' +
        '<div class="card"><div class="card-title">Catálogo de servicios</div>' +
        U.table(['Servicio','Categoría','Precio','Duración'], svcRows ? [svcRows] : [], 'Sin servicios. Agrega el primero.') + '</div>' +
        '<div class="card"><div class="card-title">Activos TI (' + assets.length + ')</div>' +
        U.table(['Tag','Nombre','Tipo','Asignado a','Estado'], assetRows ? [assetRows] : [], 'Sin activos registrados') + '</div>' +
        '<div class="card"><div class="card-title">Órdenes de trabajo</div>' +
        U.table(['Nro','Título','Prioridad','Técnico','Estado/SLA',''], woRows ? [woRows] : [], 'Sin órdenes de trabajo') + '</div>';
    },
    mount(ctx, el) {
      el.querySelector('[data-svc-new]').addEventListener('click', () => serviceForm(ctx));
      el.querySelector('[data-asset-new]').addEventListener('click', () => assetForm(ctx));
      el.querySelector('[data-wo-new]').addEventListener('click', () => woForm(ctx));
      el.querySelectorAll('[data-wo-resolve]').forEach(b => b.addEventListener('click', () => resolveWO(ctx, b.dataset.woResolve)));
      Store.logEvent('VIEW', 'servicios-ti', 'Acceso a Servicios & TI', ctx.currentUser?.username);
    },
  };

  function serviceForm(ctx) {
    UI.modal('Nuevo servicio',
      '<form id="svc-form">' +
      U.field('Nombre', '<input type="text" name="nombre" required>') +
      '<div class="grid2">' +
      U.field('Categoría', '<select name="categoria" class="input"><option>soporte</option><option>consultoria</option><option>desarrollo</option><option>instalacion</option><option>mantenimiento</option><option>general</option></select>') +
      U.field('Precio', '<input type="number" name="precio" min="0" step="0.01" value="0">') +
      '</div>' +
      U.field('Duración estimada (h)', '<input type="number" name="duracion" min="0" step="0.5" value="1">') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>');
    document.querySelector('#svc-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('svc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const s = { id: K('svc'), nombre: f.get('nombre'), categoria: f.get('categoria'), precio: U.num(f.get('precio')), duracion_estimada_horas: U.num(f.get('duracion')) };
      const db = Store.get(); db.services = db.services || []; db.services.push(s);
      Store.persist(); Store.logEvent('CREATE', 'servicios', 'Servicio creado: ' + s.nombre, ctx.currentUser?.username);
      UI.closeModal(); UI.toast('Servicio creado', 'success'); ctx.reload();
    });
  }

  function assetForm(ctx) {
    const db = Store.get();
    const types = ['LAPTOP','DESKTOP','SERVER','MONITOR','PRINTER','PHONE','SOFTWARE','LICENCIA','RED','OTRO'];
    const emps = (db.employees || []).map(e => '<option value="' + e.id + '">' + U.esc(e.first_name + ' ' + e.last_name) + '</option>').join('');
    UI.modal('Registrar activo TI',
      '<form id="asset-form">' +
      '<div class="grid2">' + U.field('Nombre', '<input type="text" name="nombre" required>') +
      U.field('Tipo', '<select name="tipo" class="input">' + types.map(t => '<option>' + t + '</option>').join('') + '</select>') + '</div>' +
      '<div class="grid2">' + U.field('Marca', '<input type="text" name="marca">') + U.field('Modelo', '<input type="text" name="modelo">') + '</div>' +
      '<div class="grid2">' + U.field('Serial', '<input type="text" name="serial">') + U.field('Costo', '<input type="number" name="cost" min="0" step="0.01" value="0">') + '</div>' +
      U.field('Asignar a empleado', '<select name="assigned" class="input"><option value="">— Sin asignar —</option>' + emps + '</select>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button><button type="submit" class="btn btn-primary">Registrar activo</button></div></form>');
    document.querySelector('#asset-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('asset-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const tipo = f.get('tipo');
      const a = { id: K('asset'), asset_tag: 'TI-' + tipo.slice(0, 3) + '-' + Date.now().toString(36).toUpperCase().slice(-6), nombre: f.get('nombre'), tipo, marca: f.get('marca'), modelo: f.get('modelo'), serial: f.get('serial'), assignedTo: f.get('assigned') || null, purchase_cost: U.num(f.get('cost')), status: 'OPERATIVO' };
      const db = Store.get(); db.itAssets = db.itAssets || []; db.itAssets.push(a);
      Store.persist(); Store.logEvent('CREATE', 'it-activos', 'Activo TI registrado: ' + a.asset_tag + ' ' + a.nombre, ctx.currentUser?.username);
      UI.closeModal(); UI.toast('Activo registrado: ' + a.asset_tag, 'success'); ctx.reload();
    });
  }

  function woForm(ctx) {
    const db = Store.get();
    const clients = (db.customers || []).map(c => '<option value="' + c.id + '">' + U.esc(c.name) + '</option>').join('');
    const svcs = (db.services || []).map(s => '<option value="' + s.id + '">' + U.esc(s.nombre) + '</option>').join('');
    const emps = (db.employees || []).filter(e => e.status === 'ACTIVO').map(e => '<option value="' + e.id + '">' + U.esc(e.first_name + ' ' + e.last_name) + '</option>').join('');
    UI.modal('Nueva orden de trabajo',
      '<form id="wo-form">' +
      U.field('Título', '<input type="text" name="title" required>') +
      '<div class="grid2">' +
      U.field('Cliente', '<select name="client" class="input">' + clients + '</select>') +
      U.field('Servicio', '<select name="service" class="input"><option value="">—</option>' + svcs + '</select>') + '</div>' +
      '<div class="grid2">' +
      U.field('Prioridad', '<select name="priority" class="input"><option>NORMAL</option><option>BAJA</option><option>ALTA</option><option>CRITICA</option></select>') +
      U.field('Técnico asignado', '<select name="assigned" class="input"><option value="">—</option>' + emps + '</select>') + '</div>' +
      U.field('SLA resolución (horas)', '<input type="number" name="sla_h" min="1" value="24">') +
      U.field('Descripción', '<textarea name="description" rows="2" class="input"></textarea>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button><button type="submit" class="btn btn-success">Crear WO</button></div></form>');
    document.querySelector('#wo-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('wo-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const slaH = parseInt(f.get('sla_h')) || 24;
      const w = { id: K('wo'), wo_number: 'WO-' + Date.now().toString().slice(-8), title: f.get('title'), client_id: f.get('client'), service_id: f.get('service') || null, priority: f.get('priority'), assignedTo: f.get('assigned') || null, description: f.get('description'), sla_h: slaH, sla_due_at: new Date(Date.now() + slaH * 3600000).toISOString(), status: 'ABIERTA', opened: new Date().toISOString() };
      const db = Store.get(); db.workOrders = db.workOrders || []; db.workOrders.push(w);
      Store.persist(); Store.logEvent('CREATE', 'wo-trabajo', 'WO creada: ' + w.wo_number + ' — ' + w.title, ctx.currentUser?.username);
      UI.closeModal(); UI.toast('WO ' + w.wo_number + ' creada', 'success'); ctx.reload();
    });
  }

  function resolveWO(ctx, id) {
    const db = Store.get();
    const w = (db.workOrders || []).find(x => x.id === id);
    if (!w) return;
    const notes = prompt('Notas de resolución para ' + (w.wo_number || '') + ':');
    if (notes === null) return;
    w.status = 'RESUELTA'; w.resolved = new Date().toISOString(); w.resolution_notes = notes;
    const breached = w.sla_due_at && new Date(w.sla_due_at) < new Date();
    Store.persist();
    Store.logEvent('UPDATE', 'wo-trabajo', 'WO ' + (w.wo_number || '') + ' resuelta' + (breached ? ' (SLA VENCIDO)' : ' (dentro de SLA)'), ctx.currentUser?.username);
    UI.toast(breached ? 'WO resuelta — ⏰ SLA vencido' : 'WO resuelta dentro de SLA', breached ? 'warn' : 'success');
    ctx.reload();
  }

  App.register('services', def);
})();
