document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'fitdata_workouts';

  const titleElement = document.getElementById('analiticsExerciseTitle');
  const historyRows = document.getElementById('analiticsHistoryRows');

  const lastResultElement = document.getElementById('analiticsLastResult');
  const bestResultElement = document.getElementById('analiticsBestResult');
  const volumeElement = document.getElementById('analiticsVolume');

  const periodButtons = document.querySelectorAll('.analitics-periods__item');

  const modal = document.getElementById('analiticsModal');
  const openModalButton = document.getElementById('openAnaliticsModal');
  const closeModalButton = document.getElementById('closeAnaliticsModal');
  const cancelModalButton = document.getElementById('cancelAnaliticsModal');
  const form = document.getElementById('analiticsForm');

  const weightInput = document.getElementById('analiticsWeight');
  const repsInput = document.getElementById('analiticsReps');

  const params = new URLSearchParams(window.location.search);
  const exerciseName = params.get('name') || 'Упражнение';

  if (titleElement) {
    titleElement.textContent = exerciseName;
  }

  document.title = `FITDATA — ${exerciseName}`;

  periodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      periodButtons.forEach((item) => {
        item.classList.remove('analitics-periods__item--active');
      });
      button.classList.add('analitics-periods__item--active');
    });
  });

  if (openModalButton) {
    openModalButton.addEventListener('click', openModal);
  }

  if (closeModalButton) {
    closeModalButton.addEventListener('click', closeModal);
  }

  if (cancelModalButton) {
    cancelModalButton.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const weight = weightInput.value.trim();
      const reps = repsInput.value.trim();

      if (!weight || !reps) return;

      const allData = getStorageData();
      const today = new Date();

      const newRecord = {
        id: Date.now(),
        name: exerciseName,
        weight: Number(weight),
        reps: Number(reps),
        date: toDateKey(today),
        dateLabel: formatRusDate(today)
      };

      allData.push(newRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

      closeModal();
      renderExerciseData();
    });
  }

  renderExerciseData();

  function renderExerciseData() {
    const allData = getStorageData();
    const exerciseData = allData
      .filter((item) => item.name === exerciseName)
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

    renderHistory(exerciseData);
    renderStats(exerciseData);
  }

  function renderHistory(records) {
    if (!historyRows) return;

    if (records.length === 0) {
      historyRows.innerHTML = `
        <div class="analitics-history-table__row analitics-history-table__row--item">
          <span>—</span>
          <span>—</span>
          <span>—</span>
          <span class="analitics-history-table__arrow">›</span>
        </div>
      `;
      return;
    }

    const bestRecord = getBestRecord(records);

    historyRows.innerHTML = records.map((record) => {
      const isBest = bestRecord && bestRecord.id === record.id;

      return `
        <div class="analitics-history-table__row analitics-history-table__row--item">
          <span>${escapeHtml(record.dateLabel)}</span>
          <span class="analitics-history-table__value">
            ${isBest ? '🏆 ' : ''}${escapeHtml(record.weight)} кг · ${escapeHtml(record.reps)} раз
          </span>
          <span>${escapeHtml(record.reps)} раз</span>
          <span class="analitics-history-table__arrow">›</span>
        </div>
      `;
    }).join('');
  }

  function renderStats(records) {
    if (!records.length) {
      lastResultElement.textContent = '—';
      bestResultElement.textContent = '—';
      volumeElement.textContent = '—';
      return;
    }

    const lastRecord = records[0];
    const bestRecord = getBestRecord(records);
    const lastVolume = lastRecord.weight * lastRecord.reps;

    lastResultElement.textContent = `${lastRecord.weight} кг × ${lastRecord.reps}`;
    bestResultElement.textContent = `${bestRecord.weight} кг × ${bestRecord.reps}`;
    volumeElement.textContent = `${lastVolume}`;
  }

  function getBestRecord(records) {
    return [...records].sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.reps - a.reps;
    })[0];
  }

  function getStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      weightInput.focus();
    }, 0);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    form.reset();
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
});