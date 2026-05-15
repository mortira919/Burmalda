import { format, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(date) {
  if (!date) return '—';
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd.MM.yyyy', { locale: ru });
}

export function formatMoney(amount, currency = '₸') {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export function daysUntil(date) {
  if (!date) return null;
  return differenceInDays(typeof date === 'string' ? parseISO(date) : date, new Date());
}

export const PROJECT_STATUS = {
  development: { label: 'В разработке',   color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  testing:     { label: 'Тестирование',   color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  revision:    { label: 'Правки',          color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  completed:   { label: 'Завершён',        color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  paused:      { label: 'Приостановлен',   color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
};

export const PROJECT_PRIORITY = {
  low:    { label: 'Низкий',  color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  medium: { label: 'Средний', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  high:   { label: 'Высокий', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  urgent: { label: 'Срочно',  color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
};

export const PROJECT_STAGE = {
  design:    { label: '🎨 UI Дизайн',       short: '1',  color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  frontend:  { label: '💻 Реализация UI',   short: '2',  color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  fullstack: { label: '🚀 Полная разработка', short: '3', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
};

export const LEAD_STATUS = {
  thinking:      { label: 'Обдумывает',         color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  needs_tz:      { label: 'Нужно ТЗ',           color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  waiting_prepay:{ label: 'Ждёт предоплату',    color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  rejected:      { label: 'Отказ',              color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  converted:     { label: 'Переведён',          color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
};

export const EMPLOYEE_ROLE = {
  backend:  'Бэкенд-разработчик',
  frontend: 'Фронтенд-разработчик',
  mobile:   'Мобильный разработчик',
  designer: 'UI/UX Дизайнер',
  manager:  'Менеджер',
  other:    'Другое',
};

export const EXPENSE_CATEGORY = {
  ads:      'Реклама',
  rent:     'Аренда',
  software: 'Программное обеспечение',
  salary:   'Зарплата',
  bonus:    'Бонус',
  other:    'Прочее',
};

export const ROLE_COLOR = {
  backend:  'bg-blue-500/20 text-blue-400',
  frontend: 'bg-cyan-500/20 text-cyan-400',
  mobile:   'bg-purple-500/20 text-purple-400',
  designer: 'bg-pink-500/20 text-pink-400',
  manager:  'bg-orange-500/20 text-orange-400',
  other:    'bg-gray-500/20 text-gray-400',
};
