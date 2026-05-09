document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://127.0.0.1:5000/api';
  const userId = localStorage.getItem('fitdata_user_id');

  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

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
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const weight = weightInput.value.trim();
      const reps = repsInput.value.trim();

      if (!weight || !reps) return;

      try {
        await fetch(`${API_URL}/analytics/record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: Number(userId),
            name: exerciseName,
            weight: Number(weight),
            reps: Number(reps),
            date: toDateKey(new Date()),
          }),
        });

        closeModal();
        renderExerciseData();
      } catch (error) {
        alert('Ошибка добавления результата');
        console.error(error);
      }
    });
  }

  renderExerciseData();

  async function renderExerciseData() {
    try {
      const response = await fetch(
        `${API_URL}/analytics/exercise?user_id=${userId}&name=${encodeURIComponent(exerciseName)}`
      );

      const exerciseData = await response.json();

      if (!response.ok) {
        throw new Error(exerciseData.error || 'Ошибка загрузки аналитики');
      }

      renderHistory(exerciseData);
      renderStats(exerciseData);
    } catch (error) {
      console.error(error);
      renderHistory([]);
      renderStats([]);
    }
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
      const isBest = bestRecord && bestRecord.set_id === record.set_id;

      return `
        <div class="analitics-history-table__row analitics-history-table__row--item">
          <span>${escapeHtml(formatRusDate(parseDateKey(record.date)))}</span>
          <span class="analitics-history-table__value">
            ${isBest ? '🏆 ' : ''}${escapeHtml(record.weight)} кг
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
    const totalVolume = records.reduce((sum, record) => {
      return sum + Number(record.weight) * Number(record.reps);
    }, 0);

    lastResultElement.textContent = `${lastRecord.weight} кг × ${lastRecord.reps}`;
    bestResultElement.textContent = `${bestRecord.weight} кг × ${bestRecord.reps}`;
    volumeElement.textContent = `${totalVolume} кг`;
  }

  function getBestRecord(records) {
    return [...records].sort((a, b) => {
      if (Number(b.weight) !== Number(a.weight)) {
        return Number(b.weight) - Number(a.weight);
      }

      return Number(b.reps) - Number(a.reps);
    })[0];
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

    if (form) {
      form.reset();
    }
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
});