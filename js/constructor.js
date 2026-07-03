// Экран "Конструктор": форма слева, живой предпросмотр КП справа.

let currentKp = null; // текущая редактируемая КП (объект-состояние)

// Стартовый шаблон блока "Условия работы" — целиком редактируется в левой
// панели (не в превью), поэтому дальше это просто обычные текстовые поля.
function defaultTerms() {
  return {
    sroki: 'Разовые работы — от 7 до 14 рабочих дней с момента согласования брифа. Ежемесячное сопровождение — на постоянной основе, по календарному плану.',
    pravki: 'В стоимость включено до 2 раундов правок на этапе реализации. Изменения сверх согласованного объёма обсуждаются отдельно.',
    oplata: 'Разовые работы — предоплата 50%, остаток после сдачи. Ежемесячное сопровождение — оплата в начале каждого месяца.',
    peredacha: 'После оплаты клиент получает доступ ко всем разработанным материалам в формате, пригодном для дальнейшего использования.'
  };
}

function blankKp() {
  return {
    id: null,
    number: nextKpNumber(),
    status: 'draft',
    client: '', niche: '', pain: '',
    items: [{ id: uid(), name: '', type: 'once', price: '' }],
    cases: { zhem: true, art: true, kit: true },
    goalHtml: null,
    terms: defaultTerms(),
    notes: '',
    createdAt: null, updatedAt: null
  };
}

function newKp() {
  currentKp = blankKp();
  document.getElementById('in-client').value = '';
  document.getElementById('in-niche').value = '';
  document.getElementById('in-pain').value = '';
  document.getElementById('c-zhem').checked = true;
  document.getElementById('c-art').checked = true;
  document.getElementById('c-kit').checked = true;
  fillTermFields(currentKp.terms);
  renderConstructor();
}

function loadKpIntoForm(record) {
  currentKp = JSON.parse(JSON.stringify(record));
  if (!currentKp.terms) currentKp.terms = defaultTerms(); // старые записи без этого поля
  document.getElementById('in-client').value = currentKp.client;
  document.getElementById('in-niche').value = currentKp.niche;
  document.getElementById('in-pain').value = currentKp.pain;
  document.getElementById('c-zhem').checked = !!currentKp.cases.zhem;
  document.getElementById('c-art').checked = !!currentKp.cases.art;
  document.getElementById('c-kit').checked = !!currentKp.cases.kit;
  fillTermFields(currentKp.terms);
  showTab('constructor');
  renderConstructor();
}

function fillTermFields(terms) {
  document.getElementById('in-term-sroki').value = terms.sroki;
  document.getElementById('in-term-pravki').value = terms.pravki;
  document.getElementById('in-term-oplata').value = terms.oplata;
  document.getElementById('in-term-peredacha').value = terms.peredacha;
}

function addItem() {
  currentKp.items.push({ id: uid(), name: '', type: 'once', price: '' });
  renderConstructor();
}
function removeItem(id) {
  currentKp.items = currentKp.items.filter(i => i.id !== id);
  if (currentKp.items.length === 0) currentKp.items.push({ id: uid(), name: '', type: 'once', price: '' });
  renderConstructor();
}
// Обновляет значение позиции без пересоздания строк ввода — иначе поле теряет
// фокус после каждого символа, т.к. пересобранный DOM создаёт новый <input>.
function updateItem(id, field, val) {
  const it = currentKp.items.find(i => i.id === id);
  if (it) it[field] = val;
  refreshPreview();
}

function renderItemRows() {
  const wrap = document.getElementById('items-wrap');
  wrap.innerHTML = currentKp.items.map(it => `
    <div class="item-row">
      <input type="text" placeholder="Название позиции" value="${escapeHtml(it.name)}"
        oninput="updateItem('${it.id}','name',this.value)">
      <select onchange="updateItem('${it.id}','type',this.value)">
        <option value="once" ${it.type === 'once' ? 'selected' : ''}>Разово</option>
        <option value="month" ${it.type === 'month' ? 'selected' : ''}>В мес.</option>
      </select>
      <div class="price-in">
        <input type="text" inputmode="numeric" placeholder="0" value="${it.price}"
          oninput="this.value=this.value.replace(/[^0-9]/g,''); updateItem('${it.id}','price',this.value)">
      </div>
      <button onclick="removeItem('${it.id}')" title="Удалить">✕</button>
    </div>
  `).join('');
}

function computeTotals(items) {
  let once = 0, month = 0;
  items.forEach(it => {
    const p = parseFloat(it.price) || 0;
    if (it.type === 'once') once += p; else month += p;
  });
  return { once, month, total: once + month };
}

function syncFormIntoState() {
  currentKp.client = document.getElementById('in-client').value.trim();
  currentKp.niche = document.getElementById('in-niche').value.trim();
  currentKp.pain = document.getElementById('in-pain').value.trim();
  currentKp.cases = {
    zhem: document.getElementById('c-zhem').checked,
    art: document.getElementById('c-art').checked,
    kit: document.getElementById('c-kit').checked
  };
  currentKp.terms = {
    sroki: document.getElementById('in-term-sroki').value,
    pravki: document.getElementById('in-term-pravki').value,
    oplata: document.getElementById('in-term-oplata').value,
    peredacha: document.getElementById('in-term-peredacha').value
  };
}

// Полная перерисовка: строки сметы + предпросмотр. Только для структурных
// изменений (новое/загруженное КП, добавление/удаление позиции) — иначе
// поле ввода, в котором печатает пользователь, будет пересоздано и потеряет фокус.
function renderConstructor() {
  renderItemRows();
  refreshPreview();
}

// Захватывает то, что пользователь вручную поправил в тексте "Цели
// сотрудничества" прямо в превью, чтобы следующая перерисовка не затёрла
// правку. "Условия работы" в отличие от цели редактируются в левой панели
// обычными textarea (см. syncFormIntoState), поэтому им такой захват не нужен.
function captureEditableState() {
  const g = document.getElementById('goal-edit');
  if (g) currentKp.goalHtml = g.innerHTML;
}

// Лёгкое обновление: суммы + документ-предпросмотр, без пересборки строк сметы.
// captureEditableState() здесь НЕ вызывается: она нужна только как прямая
// реакция на ввод в самих goal-edit/terms-edit (см. их oninput в шаблоне ниже).
// Если вызывать её здесь тоже, currentKp.goalHtml "замораживается" уже на первом
// же refreshPreview() и авто-текст цели перестаёт обновляться при смене ниши/сметы.
function refreshPreview() {
  syncFormIntoState();

  const t = computeTotals(currentKp.items);
  document.getElementById('sumOnce').textContent = fmtMoney(t.once);
  document.getElementById('sumMonth').textContent = fmtMoney(t.month) + (t.month ? '/мес' : '');
  document.getElementById('sumTotal').textContent = fmtMoney(t.total);

  const client = currentKp.client || 'Проект';
  const niche = currentKp.niche;
  const pain = currentKp.pain;

  const onceItems = currentKp.items.filter(i => i.type === 'once' && (i.name || i.price));
  const monthItems = currentKp.items.filter(i => i.type === 'month' && (i.name || i.price));
  const hasOnce = onceItems.length > 0;
  const hasMonth = monthItems.length > 0;

  const goalDefault = `Создание сильного digital-присутствия проекта${niche ? ' в нише «' + niche + '»' : ''}: ${hasMonth ? 'системное ежемесячное сопровождение' : ''}${hasMonth && hasOnce ? ' + ' : ''}${hasOnce ? 'разовая реализация ключевых задач' : ''}${!hasOnce && !hasMonth ? 'полное погружение в задачи маркетинга' : ''}.${pain ? '\n\nТекущая ситуация: ' + pain + '.' : ''}`;

  const kpDate = currentKp.createdAt ? new Date(currentKp.createdAt) : new Date();

  const doc = document.getElementById('kp-doc');
  doc.innerHTML = `
    <div class="kp-block">
      <div class="kp-header-row">
        <div>
          <div class="kp-logo">APEX</div>
          <div class="kp-logo-sub">Цифровое агентство</div>
        </div>
        <div class="stamp">
          <div class="num">№ ${currentKp.number}</div>
          <div class="date">${fmtDate(kpDate)}</div>
        </div>
      </div>
      <h1 class="cover-title">Коммерческое предложение</h1>
      <p class="cover-sub">для проекта «${escapeHtml(client)}»${niche ? ' &middot; ' + escapeHtml(niche) : ''}</p>
      <div class="cover-meta">Документ сформирован автоматически &middot; действителен 14 дней с даты выше</div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <div class="eyebrow">Цель сотрудничества</div>
      <div class="goal-text" contenteditable="true" id="goal-edit" oninput="captureEditableState()">${currentKp.goalHtml != null ? currentKp.goalHtml : escapeHtml(goalDefault).replace(/\n/g, '<br><br>')}</div>
      <div class="editable-note">✎ этот текст можно отредактировать прямо здесь перед экспортом</div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <h3 class="kp-h">Смета</h3>
      ${renderTable(onceItems, monthItems)}
      <div class="sum-line">
        ${hasOnce ? `<div class="sum-chip"><div class="lbl">Разово</div><div class="val">${fmtMoney(t.once)}</div></div>` : ''}
        ${hasMonth ? `<div class="sum-chip"><div class="lbl">Ежемесячно</div><div class="val">${fmtMoney(t.month)}/мес</div></div>` : ''}
      </div>
      <div class="footnote">Указанная стоимость действует при заказе описанного объёма работ. Изменения объёма обсуждаются отдельно.</div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <h3 class="kp-h">Как мы работаем</h3>
      <div class="steps">
        <div class="step"><div class="n">01</div><div class="t">Заявка и бриф</div><div class="d">Обсуждаем задачу, цели и объём. Фиксируем в смете, что и когда делаем.</div></div>
        <div class="step"><div class="n">02</div><div class="t">Реализация</div><div class="d">Команда собирает решение: дизайн, контент, ведение — по согласованному плану.</div></div>
        <div class="step"><div class="n">03</div><div class="t">Результат</div><div class="d">Передаём материалы${hasMonth ? ' и переходим на регулярное сопровождение' : ''}.</div></div>
      </div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <h3 class="kp-h">Наши кейсы</h3>
      <div class="cases">
        ${currentKp.cases.zhem ? caseCard('zhem') : ''}
        ${currentKp.cases.art ? caseCard('art') : ''}
        ${currentKp.cases.kit ? caseCard('kit') : ''}
      </div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <h3 class="kp-h">Условия работы</h3>
      <div class="terms-grid">
        <div class="term-block">
          <div class="tt">Сроки</div>
          <div class="td2">${escapeHtml(currentKp.terms.sroki).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="term-block">
          <div class="tt">Правки</div>
          <div class="td2">${escapeHtml(currentKp.terms.pravki).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="term-block">
          <div class="tt">Оплата</div>
          <div class="td2">${escapeHtml(currentKp.terms.oplata).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="term-block">
          <div class="tt">Передача материалов</div>
          <div class="td2">${escapeHtml(currentKp.terms.peredacha).replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    </div>

    <div class="perforation"></div>

    <div class="kp-block">
      <div class="contacts-block">
        <div>
          <div class="clabel">Telegram</div>
          <div class="cval">${CONTACTS.telegram}</div>
        </div>
        <div>
          <div class="clabel">Почта</div>
          <div class="cval">${CONTACTS.email}</div>
        </div>
        <div>
          <div class="clabel">Телефон</div>
          <div class="cval">${CONTACTS.phone}</div>
        </div>
        <div class="cta">APEX</div>
      </div>
    </div>
  `;
}

function renderTable(onceItems, monthItems) {
  if (onceItems.length === 0 && monthItems.length === 0) {
    return `<div class="footnote">Добавьте позиции сметы слева, чтобы увидеть таблицу.</div>`;
  }
  const rows = it => `
    <tr>
      <td class="tname">${escapeHtml(it.name) || '—'}</td>
      <td class="ttype">${it.type === 'once' ? 'разово' : 'в мес.'}</td>
      <td class="tprice">${fmtMoney(parseFloat(it.price) || 0)}${it.type === 'month' ? '/мес' : ''}</td>
    </tr>`;
  return `
    <table class="kp-table">
      <thead><tr><th>Позиция</th><th>Тип</th><th style="text-align:right;">Стоимость</th></tr></thead>
      <tbody>${[...onceItems, ...monthItems].map(rows).join('')}</tbody>
    </table>`;
}

function caseCard(key) {
  const c = CASES[key];
  return `
    <div class="case-card ${c.tone}">
      <div class="cname">${c.name}</div>
      <div class="crow"><b>Было:</b> ${c.before}</div>
      <div class="crow"><b>Сделали:</b> ${c.done}</div>
      <div class="crow cresult"><b>Результат:</b> ${c.result}</div>
    </div>`;
}

// Текстовое представление текущей КП — для отправки в Telegram/почту без PDF.
function buildKpPlainText() {
  syncFormIntoState();
  const t = computeTotals(currentKp.items);
  const client = currentKp.client || 'Проект';
  const niche = currentKp.niche;
  const kpDate = currentKp.createdAt ? new Date(currentKp.createdAt) : new Date();
  const goalEl = document.getElementById('goal-edit');
  const goalText = goalEl ? goalEl.innerText.trim() : '';

  const onceItems = currentKp.items.filter(i => i.type === 'once' && (i.name || i.price));
  const monthItems = currentKp.items.filter(i => i.type === 'month' && (i.name || i.price));

  const lines = [];
  lines.push(`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ №${currentKp.number} от ${fmtDate(kpDate)}`);
  lines.push(`Проект: «${client}»${niche ? ' · ' + niche : ''}`);
  lines.push('');
  if (goalText) {
    lines.push('ЦЕЛЬ СОТРУДНИЧЕСТВА');
    lines.push(goalText);
    lines.push('');
  }
  if (onceItems.length || monthItems.length) {
    lines.push('СМЕТА');
    [...onceItems, ...monthItems].forEach(it => {
      const price = fmtMoney(parseFloat(it.price) || 0) + (it.type === 'month' ? '/мес' : '');
      lines.push(`— ${it.name || '—'}: ${price}`);
    });
    if (t.once) lines.push(`Итого разово: ${fmtMoney(t.once)}`);
    if (t.month) lines.push(`Итого ежемесячно: ${fmtMoney(t.month)}/мес`);
    lines.push('');
  }
  lines.push('КОНТАКТЫ APEX');
  lines.push(`Telegram: ${CONTACTS.telegram.replace(/&nbsp;/g, ' ')}`);
  lines.push(`Почта: ${CONTACTS.email}`);
  lines.push(`Телефон: ${CONTACTS.phone}`);
  return lines.join('\n');
}

async function copyKpText() {
  const text = buildKpPlainText();
  try {
    await navigator.clipboard.writeText(text);
    toast('Текст КП скопирован в буфер обмена');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Текст КП скопирован в буфер обмена');
    } catch (e2) {
      alert('Не удалось скопировать автоматически. Текст КП:\n\n' + text);
    }
    document.body.removeChild(ta);
  }
}

// Сохраняет текущую КП в историю (создаёт запись или обновляет существующую)
function saveCurrentKp() {
  syncFormIntoState();
  const t = computeTotals(currentKp.items);
  currentKp.totals = t;
  if (!currentKp.id) currentKp.id = uid();
  const saved = upsertRecord(currentKp);
  currentKp = saved;
  renderHistoryIfVisible();
  return saved;
}

async function exportPDF() {
  const btn = document.getElementById('pdfBtn');
  btn.disabled = true; btn.textContent = 'Готовим PDF...';
  saveCurrentKp();
  const el = document.getElementById('kp-doc');
  // #kp-doc лежит в прокручиваемом .preview-wrap (overflow-y:auto). Если окно
  // ниже, чем весь документ, html2canvas без этих правок захватывает только
  // видимую прокрученную часть и обрезает остальное. Снимаем ограничение на
  // время захвата и восстанавливаем после.
  const wrap = el.closest('.preview-wrap');
  const prevOverflow = wrap ? wrap.style.overflowY : '';
  const prevMaxHeight = wrap ? wrap.style.maxHeight : '';
  const prevScrollTop = wrap ? wrap.scrollTop : 0;
  if (wrap) {
    wrap.style.overflowY = 'visible';
    wrap.style.maxHeight = 'none';
    wrap.scrollTop = 0;
  }
  try {
    // Каждый смысловой блок (.kp-block) захватывается и добавляется в PDF
    // отдельно, а не одним общим скриншотом всего документа — иначе нарезка
    // по высоте A4 может пройти прямо посередине блока (например, контактов
    // или карточки кейса), разрезав его между двумя страницами.
    const blocks = Array.from(el.querySelectorAll('.kp-block'));
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210, pageH = 297;
    let y = 0;
    let pageHasContent = false;

    for (const block of blocks) {
      const canvas = await html2canvas(block, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        // Подсказки редактирования ("этот текст можно отредактировать...")
        // нужны только на экране, в готовом КП их быть не должно.
        ignoreElements: node => node.classList && node.classList.contains('editable-note')
      });
      const imgW = pageW;
      const imgH = canvas.height * imgW / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (imgH > pageH) {
        // Сам блок выше страницы (например, смета с очень длинным списком
        // позиций) — резать всё равно негде, поэтому нарезаем по высоте
        // страницы только этот блок, начиная с чистой страницы.
        if (pageHasContent) { pdf.addPage(); y = 0; }
        let heightLeft = imgH;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
        y = imgH % pageH;
        pageHasContent = true;
        continue;
      }

      if (pageHasContent && y + imgH > pageH) {
        pdf.addPage();
        y = 0;
      }
      pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH);
      y += imgH;
      pageHasContent = true;
    }

    const clientName = currentKp.client || 'Проект';
    pdf.save(`APEX_KP_${currentKp.number}_${clientName.replace(/[^a-zA-Zа-яА-Я0-9]+/g, '_')}.pdf`);
    toast(`КП №${currentKp.number} сохранено в историю и выгружено в PDF`);
  } catch (e) {
    alert('Не получилось собрать PDF: ' + e.message);
  }
  if (wrap) {
    wrap.style.overflowY = prevOverflow;
    wrap.style.maxHeight = prevMaxHeight;
    wrap.scrollTop = prevScrollTop;
  }
  btn.disabled = false; btn.textContent = 'Скачать PDF';
}
