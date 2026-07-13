// Конфиг витрины и админки. Значения-плейсхолдеры — заменит владелец.
window.SALE_CONFIG = {
  // Шапка
  title: 'Распродажа личных вещей',
  subtitle: 'Проверенные вещи в отличном состоянии. Цена ниже новой — торг уместен.',
  city: 'Астана',
  currency: '₸',

  // Контакты. Телефон — в межд. формате без плюса для tel/wa ссылок.
  contacts: {
    phone: '77018336550',       // → tel:+7701...  и wa.me/7701...
    whatsapp: '77018336550',    // номер WhatsApp (тот же номер)
    telegram: '',               // без @ → t.me/username; пусто = кнопка скрыта
  },

  // Админка: PIN — простой гейт (клиентский, не банковская защита). ЗАМЕНИТЬ.
  adminPin: '2026',

  // Supabase overlay статусов. null → работает fallback на localStorage.
  // Заполнить после создания таблицы sale_item_status (см. README).
  supabase: {
    url: null,        // 'https://xxxx.supabase.co'
    anonKey: null,    // 'eyJhbGciOi...'
    table: 'sale_item_status',
  },
};
