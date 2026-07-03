// Инициализация приложения, переключение вкладок, обработчики верхних кнопок.

let activeTab = 'constructor';

function showTab(tab) {
  activeTab = tab;
  document.getElementById('tab-constructor').classList.toggle('active', tab === 'constructor');
  document.getElementById('tab-history').classList.toggle('active', tab === 'history');
  document.getElementById('view-constructor').style.display = tab === 'constructor' ? 'grid' : 'none';
  document.getElementById('view-history').style.display = tab === 'history' ? 'block' : 'none';
  if (tab === 'history') renderHistory();
}

function saveAndToast() {
  const rec = saveCurrentKp();
  toast(`КП №${rec.number} сохранено в историю`);
}

function init() {
  newKp();
  showTab('constructor');
}

init();
