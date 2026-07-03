// Локальное хранилище КП: список записей + сквозной счётчик номеров.
// Всё живёт в localStorage браузера — без сервера, подходит для статического хостинга (GitHub Pages).
const LS_RECORDS = 'apex-kp-records';
const LS_COUNTER = 'apex-kp-counter';
const COUNTER_START = 48;

function loadRecords() {
  try {
    const raw = localStorage.getItem(LS_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(LS_RECORDS, JSON.stringify(records));
}

function nextKpNumber() {
  const last = parseInt(localStorage.getItem(LS_COUNTER), 10);
  const next = isNaN(last) ? COUNTER_START : last + 1;
  localStorage.setItem(LS_COUNTER, String(next));
  return next;
}

// Создаёт запись или обновляет существующую (по id). Возвращает сохранённую запись.
function upsertRecord(record) {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === record.id);
  record.updatedAt = new Date().toISOString();
  if (idx === -1) {
    record.createdAt = record.createdAt || record.updatedAt;
    records.unshift(record);
  } else {
    records[idx] = record;
  }
  saveRecords(records);
  return record;
}

function getRecord(id) {
  return loadRecords().find(r => r.id === id) || null;
}

function deleteRecord(id) {
  saveRecords(loadRecords().filter(r => r.id !== id));
}

function setRecordStatus(id, status) {
  const records = loadRecords();
  const rec = records.find(r => r.id === id);
  if (rec) {
    rec.status = status;
    rec.updatedAt = new Date().toISOString();
    saveRecords(records);
  }
  return rec;
}

// Обновляет заметку без пересчёта updatedAt — иначе запись "прыгала" бы по
// дате правки, что мешало бы истории и фильтрам по дате.
function setRecordNote(id, notes) {
  const records = loadRecords();
  const rec = records.find(r => r.id === id);
  if (rec) {
    rec.notes = notes;
    saveRecords(records);
  }
  return rec;
}

function exportBackupJson() {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    records: loadRecords(),
    counter: parseInt(localStorage.getItem(LS_COUNTER), 10) || COUNTER_START
  }, null, 2);
}

// Возвращает {ok:true} или {ok:false, error} — вызывающий код сам решает, как сообщить об ошибке.
function importBackupJson(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { ok: false, error: 'Файл повреждён или это не JSON.' };
  }
  if (!data || !Array.isArray(data.records)) {
    return { ok: false, error: 'В файле нет списка КП (records).' };
  }
  saveRecords(data.records);
  if (data.counter) localStorage.setItem(LS_COUNTER, String(data.counter));
  return { ok: true };
}
