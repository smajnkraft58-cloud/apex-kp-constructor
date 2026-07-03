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
