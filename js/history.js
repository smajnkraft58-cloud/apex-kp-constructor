// Экран "История КП": сводка по статусам + таблица всех сохранённых КП.

function renderHistoryIfVisible() {
  if (activeTab === 'history') renderHistory();
}

function statusBadge(status) {
  const s = STATUSES[status] || STATUSES.draft;
  return `<span class="status-badge" style="--sc:${s.color}">${s.label}</span>`;
}

function renderDashboard(records) {
  const counts = {};
  STATUS_ORDER.forEach(k => counts[k] = 0);
  let sumOnce = 0, sumMonth = 0;
  records.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.totals) { sumOnce += r.totals.once || 0; sumMonth += r.totals.month || 0; }
  });
  const cards = STATUS_ORDER.map(k => `
    <div class="dash-card" style="--sc:${STATUSES[k].color}">
      <div class="dash-n">${counts[k]}</div>
      <div class="dash-l">${STATUSES[k].label}</div>
    </div>`).join('');
  return `
    <div class="dashboard">
      <div class="dash-card total">
        <div class="dash-n">${records.length}</div>
        <div class="dash-l">Всего КП</div>
      </div>
      ${cards}
      <div class="dash-card sum">
        <div class="dash-n">${fmtMoney(sumOnce)}</div>
        <div class="dash-l">Разово (сумма всех КП)</div>
      </div>
      <div class="dash-card sum">
        <div class="dash-n">${fmtMoney(sumMonth)}</div>
        <div class="dash-l">Ежемесячно (сумма всех КП)</div>
      </div>
    </div>`;
}

function renderHistory() {
  const records = loadRecords();
  const wrap = document.getElementById('history-wrap');

  const dashboardHtml = renderDashboard(records);

  if (records.length === 0) {
    wrap.innerHTML = dashboardHtml + `<div class="hint" style="margin-top:20px;">Пока нет сохранённых КП. Заполните конструктор и нажмите «Сохранить» или «Скачать PDF».</div>`;
    return;
  }

  const rows = records.map(r => {
    const t = r.totals || { once: 0, month: 0 };
    return `
      <tr>
        <td class="hnum">№ ${r.number}</td>
        <td>${r.createdAt ? fmtDate(new Date(r.createdAt)) : '—'}</td>
        <td class="hclient">${escapeHtml(r.client || 'Проект')}</td>
        <td class="hniche">${escapeHtml(r.niche || '—')}</td>
        <td class="hsum">${t.once ? fmtMoney(t.once) : '—'}${t.month ? '<br>' + fmtMoney(t.month) + '/мес' : ''}</td>
        <td>
          <select class="status-select" style="--sc:${STATUSES[r.status].color}" onchange="changeStatus('${r.id}', this.value)">
            ${STATUS_ORDER.map(k => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${STATUSES[k].label}</option>`).join('')}
          </select>
        </td>
        <td class="hactions">
          <button class="hbtn" onclick="openFromHistory('${r.id}')" title="Открыть в конструкторе">✎</button>
          <button class="hbtn" onclick="duplicateFromHistory('${r.id}')" title="Дублировать">⧉</button>
          <button class="hbtn danger" onclick="deleteFromHistory('${r.id}')" title="Удалить">✕</button>
        </td>
      </tr>`;
  }).join('');

  wrap.innerHTML = dashboardHtml + `
    <table class="history-table">
      <thead>
        <tr>
          <th>№</th><th>Дата</th><th>Клиент</th><th>Ниша</th><th>Сумма</th><th>Статус</th><th>Действия</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function changeStatus(id, status) {
  setRecordStatus(id, status);
  renderHistory();
}

function openFromHistory(id) {
  const rec = getRecord(id);
  if (rec) loadKpIntoForm(rec);
}

function duplicateFromHistory(id) {
  const rec = getRecord(id);
  if (!rec) return;
  const copy = JSON.parse(JSON.stringify(rec));
  copy.id = uid();
  copy.number = nextKpNumber();
  copy.status = 'draft';
  copy.createdAt = null;
  copy.updatedAt = null;
  upsertRecord(copy);
  renderHistory();
  toast(`Создан дубликат — КП №${copy.number}`);
}

function deleteFromHistory(id) {
  if (!confirm('Удалить это КП из истории? Действие необратимо.')) return;
  deleteRecord(id);
  renderHistory();
}
