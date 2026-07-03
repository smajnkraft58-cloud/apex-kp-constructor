// Экран "История КП": сводка по статусам, фильтры, таблица, заметки, экспорт/бэкап.

let historyFilters = { q: '', status: 'all', from: '', to: '' };

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

function renderToolbar() {
  return `
    <div class="history-toolbar">
      <input type="text" class="htb-search" placeholder="Поиск по клиенту или нише…" value="${escapeHtml(historyFilters.q)}"
        oninput="updateHistoryFilter('q', this.value)">
      <select class="htb-select" onchange="updateHistoryFilter('status', this.value)">
        <option value="all" ${historyFilters.status === 'all' ? 'selected' : ''}>Все статусы</option>
        ${STATUS_ORDER.map(k => `<option value="${k}" ${historyFilters.status === k ? 'selected' : ''}>${STATUSES[k].label}</option>`).join('')}
      </select>
      <label class="htb-date-label">с <input type="date" value="${historyFilters.from}" onchange="updateHistoryFilter('from', this.value)"></label>
      <label class="htb-date-label">по <input type="date" value="${historyFilters.to}" onchange="updateHistoryFilter('to', this.value)"></label>
      <button class="btn btn-ghost htb-reset" onclick="resetHistoryFilters()">Сбросить</button>
      <div class="htb-spacer"></div>
      <button class="btn btn-ghost" onclick="exportHistoryCsv()">Экспорт CSV</button>
      <button class="btn btn-ghost" onclick="exportBackupFile()">Экспорт бэкапа</button>
      <button class="btn btn-ghost" onclick="document.getElementById('backup-file-input').click()">Импорт бэкапа</button>
    </div>`;
}

function updateHistoryFilter(field, val) {
  historyFilters[field] = val;
  refreshHistoryTable();
}

function resetHistoryFilters() {
  historyFilters = { q: '', status: 'all', from: '', to: '' };
  renderHistory();
}

function getFilteredRecords() {
  const q = historyFilters.q.trim().toLowerCase();
  const from = historyFilters.from ? new Date(historyFilters.from + 'T00:00:00') : null;
  const to = historyFilters.to ? new Date(historyFilters.to + 'T23:59:59') : null;
  return loadRecords().filter(r => {
    if (historyFilters.status !== 'all' && r.status !== historyFilters.status) return false;
    if (q) {
      const hay = ((r.client || '') + ' ' + (r.niche || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (from || to) {
      const created = r.createdAt ? new Date(r.createdAt) : null;
      if (!created) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }
    return true;
  });
}

function renderHistory() {
  const allRecords = loadRecords();
  const wrap = document.getElementById('history-wrap');

  if (allRecords.length === 0) {
    wrap.innerHTML = renderDashboard(allRecords) + `<div class="hint" style="margin-top:20px;">Пока нет сохранённых КП. Заполните конструктор и нажмите «Сохранить» или «Скачать PDF».</div>`;
    return;
  }

  wrap.innerHTML = renderDashboard(allRecords) + renderToolbar() + `<div id="history-table-wrap"></div>`;
  refreshHistoryTable();
}

// Перерисовывает только таблицу — чтобы поиск/фильтры не пересоздавали
// сами инпуты тулбара и не сбрасывали фокус при вводе (тот же баг, что
// раньше был с ценами в конструкторе).
function refreshHistoryTable() {
  const tableWrap = document.getElementById('history-table-wrap');
  if (!tableWrap) return;
  const records = getFilteredRecords();

  if (records.length === 0) {
    tableWrap.innerHTML = `<div class="hint" style="margin-top:12px;">Ничего не найдено по текущим фильтрам.</div>`;
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
        <td class="hnotes">
          <textarea placeholder="Заметка…" oninput="setRecordNote('${r.id}', this.value)">${escapeHtml(r.notes || '')}</textarea>
        </td>
        <td class="hactions">
          <button class="hbtn" onclick="openFromHistory('${r.id}')" title="Открыть в конструкторе">✎</button>
          <button class="hbtn" onclick="duplicateFromHistory('${r.id}')" title="Дублировать">⧉</button>
          <button class="hbtn danger" onclick="deleteFromHistory('${r.id}')" title="Удалить">✕</button>
        </td>
      </tr>`;
  }).join('');

  tableWrap.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>№</th><th>Дата</th><th>Клиент</th><th>Ниша</th><th>Сумма</th><th>Статус</th><th>Заметки</th><th>Действия</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function changeStatus(id, status) {
  setRecordStatus(id, status);
  refreshHistoryTable();
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
  copy.notes = '';
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

function csvEscape(val) {
  const s = String(val == null ? '' : val);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportHistoryCsv() {
  const records = getFilteredRecords();
  const header = ['№', 'Дата', 'Клиент', 'Ниша', 'Статус', 'Сумма разово', 'Сумма ежемесячно', 'Заметки'];
  const rows = records.map(r => [
    r.number,
    r.createdAt ? fmtDate(new Date(r.createdAt)) : '',
    r.client || '',
    r.niche || '',
    STATUSES[r.status] ? STATUSES[r.status].label : r.status,
    r.totals ? r.totals.once : 0,
    r.totals ? r.totals.month : 0,
    r.notes || ''
  ]);
  const csv = [header, ...rows].map(row => row.map(csvEscape).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `APEX_KP_история_${fmtDate(new Date())}.csv`);
}

function exportBackupFile() {
  const json = exportBackupJson();
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `apex-kp-backup_${fmtDate(new Date())}.json`);
  toast('Резервная копия скачана');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleBackupFileSelected(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!confirm('Импорт заменит всю текущую историю КП данными из файла. Продолжить?')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = importBackupJson(reader.result);
    if (result.ok) {
      renderHistory();
      toast('Резервная копия восстановлена');
    } else {
      alert('Не получилось импортировать: ' + result.error);
    }
  };
  reader.readAsText(file, 'utf-8');
}
