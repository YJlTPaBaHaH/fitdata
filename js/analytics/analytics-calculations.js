function filterRecordsByPeriod(records, period) {
  if (period === 'all') {
    return records;
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - period);
  startDate.setHours(0, 0, 0, 0);

  return records.filter((record) => {
    const recordDate = parseDateKey(record.date);
    recordDate.setHours(12, 0, 0, 0);

    return recordDate >= startDate && recordDate <= now;
  });
}

function getPeriodValue(periodText) {
  if (periodText === '7 дней') return 7;
  if (periodText === '30 дней') return 30;
  if (periodText === '3 месяца') return 90;
  return 'all';
}

function getBestRecord(records) {
  return [...records].sort((a, b) => {
    if (Number(b.weight) !== Number(a.weight)) {
      return Number(b.weight) - Number(a.weight);
    }

    return Number(b.reps) - Number(a.reps);
  })[0];
}

function getTotalVolume(records) {
  return records.reduce((sum, record) => {
    return sum + Number(record.weight) * Number(record.reps);
  }, 0);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatRusDate(date) {
  const months = [
    'янв.',
    'фев.',
    'мар.',
    'апр.',
    'мая',
    'июн.',
    'июл.',
    'авг.',
    'сент.',
    'окт.',
    'нояб.',
    'дек.'
  ];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}