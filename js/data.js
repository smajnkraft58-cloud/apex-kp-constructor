// Статические данные агентства APEX: кейсы и контакты
const CASES = {
  zhem: {
    name: 'Жемчужина', tone: 'dark',
    desc: 'Ресторан с невысоким рейтингом и слабым присутствием на Яндекс.Картах. Взяли на полное сопровождение: карточки, ответы на отзывы, работа над оптимизацией.',
    result: 'Рейтинг доведён до 4.9 · органический трафик с Карт'
  },
  art: {
    name: 'АртВитрина', tone: 'light',
    desc: 'Долгосрочный клиент на полном цифровом сопровождении: соцсети, сайт, видео-контент — полноценная digital-экосистема бренда.',
    result: 'Долгосрочный контракт · сильные результаты на YouTube'
  },
  kit: {
    name: 'КИТ', tone: 'dark',
    desc: 'Крупнейшая сделка агентства — пришла через личную презентацию проекта на нетворкинг-мероприятии, что подтверждает силу продукта и репутации APEX.',
    result: 'Самая крупная сделка агентства'
  }
};

const CONTACTS = {
  telegram: '@agency_apex &nbsp;·&nbsp; @MILOVANOVV',
  email: 'agency.apex@yandex.ru',
  phone: '+7 (977) 973-97-81'
};

// Статусы КП: ключ -> { label, color }
const STATUSES = {
  draft:    { label: 'Черновик',       color: '#8B90BE' },
  sent:     { label: 'Отправлено',     color: '#2E43FF' },
  review:   { label: 'На согласовании',color: '#C48A1E' },
  accepted: { label: 'Принято',        color: '#1F9254' },
  rejected: { label: 'Отклонено',      color: '#C13333' }
};
const STATUS_ORDER = ['draft', 'sent', 'review', 'accepted', 'rejected'];
