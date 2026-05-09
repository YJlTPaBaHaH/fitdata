document.addEventListener('DOMContentLoaded', () => {
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

  const modalTitle = document.getElementById('analiticsModalTitle');
  const submitButton = form?.querySelector('.analitics-form__submit');

  const weightInput = document.getElementById('analiticsWeight');
  const repsInput = document.getElementById('analiticsReps');

  const params = new URLSearchParams(window.location.search);
  const exerciseName = params.get('name') || 'Упражнение';

  let editingSetId = null;
  let progressChart = null;
  let currentPeriod = 30;

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
      currentPeriod = getPeriodValue(button.textContent.trim());
      renderExerciseData();
    });
  });

  if (openModalButton) {
    openModalButton.addEventListener('click', () => {
      openCreateModal();
    });
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
        if (editingSetId) {
          await updateSetRequest(editingSetId, weight, reps);
        } else {
          await createAnalyticsRecord(
            userId,
            exerciseName,
            weight,
            reps,
            toDateKey(new Date())
          );
        }

        closeModal();
        renderExerciseData();
      } catch (error) {
        alert(error.message);
        console.error(error);
      }
    });
  }

  if (historyRows) {
    historyRows.addEventListener('click', async (event) => {
      const deleteButton = event.target.closest('.analitics-history-table__delete');
      const editButton = event.target.closest('.analitics-history-table__edit');

      if (deleteButton) {
        const setId = deleteButton.dataset.setId;

        if (!confirm('Удалить этот результат?')) return;

        try {
          await deleteSetRequest(setId);
          renderExerciseData();
        } catch (error) {
          alert(error.message);
          console.error(error);
        }

        return;
      }

      if (editButton) {
        const setId = editButton.dataset.setId;
        const weight = editButton.dataset.weight;
        const reps = editButton.dataset.reps;

        openEditModal(setId, weight, reps);
      }
    });
  }

  renderExerciseData();

  async function renderExerciseData() {
    try {
      const exerciseData = await getExerciseAnalytics(userId, exerciseName);
      const filteredData = filterRecordsByPeriod(exerciseData, currentPeriod);

      renderHistory(filteredData);
      renderStats(filteredData);
      renderChart(filteredData);
    } catch (error) {
      console.error(error);
      renderHistory([]);
      renderStats([]);
      renderChart([]);
    }
  }

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

  function renderChart(records) {
    const canvas = document.getElementById('progressChart');

    if (!canvas || typeof Chart === 'undefined') return;

    const sortedRecords = [...records].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    const labels = sortedRecords.map((record) => {
      return formatRusDate(parseDateKey(record.date));
    });

    const weights = sortedRecords.map((record) => {
      return Number(record.weight);
    });

    if (progressChart) {
      progressChart.destroy();
    }

    progressChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Рабочий вес, кг',
            data: weights,
            borderColor: '#E53935',
            backgroundColor: 'rgba(229, 57, 53, 0.12)',
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#E53935',
            pointHoverBackgroundColor: '#E53935',
            pointHoverBorderColor: '#FFFFFF',
            borderWidth: 4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderWidth: 3,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#424242',
              font: {
                family: 'Montserrat',
                size: 14,
                weight: '600',
              },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: '#424242',
            titleColor: '#FFFFFF',
            bodyColor: '#FFFFFF',
            borderColor: '#E53935',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `Вес: ${context.raw} кг`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: '#424242',
              font: {
                family: 'Lato',
                size: 13,
              },
            },
            title: {
              display: true,
              text: 'Вес, кг',
              color: '#424242',
              font: {
                family: 'Montserrat',
                size: 14,
                weight: '600',
              },
            },
            grid: {
              color: 'rgba(66, 66, 66, 0.10)',
            },
            border: {
              color: 'rgba(66, 66, 66, 0.25)',
            },
          },
          x: {
            ticks: {
              color: '#424242',
              font: {
                family: 'Lato',
                size: 13,
              },
            },
            title: {
              display: true,
              text: 'Дата',
              color: '#424242',
              font: {
                family: 'Montserrat',
                size: 14,
                weight: '600',
              },
            },
            grid: {
              color: 'rgba(66, 66, 66, 0.08)',
            },
            border: {
              color: 'rgba(66, 66, 66, 0.25)',
            },
          },
        },
      },
    });
  }

  function renderHistory(records) {
    if (!historyRows) return;

    if (records.length === 0) {
      historyRows.innerHTML = `
        <div class="analitics-history-table__row analitics-history-table__row--item">
          <span>—</span>
          <span>—</span>
          <span>—</span>
          <span>—</span>
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

          <span class="analitics-history-table__actions">
            <button
              class="analitics-history-table__edit"
              type="button"
              data-set-id="${record.set_id}"
              data-weight="${record.weight}"
              data-reps="${record.reps}"
            >
              Ред.
            </button>

            <button
              class="analitics-history-table__delete"
              type="button"
              data-set-id="${record.set_id}"
            >
              Удалить
            </button>
          </span>
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

  function openCreateModal() {
    editingSetId = null;

    if (modalTitle) {
      modalTitle.textContent = 'Добавить результат';
    }

    if (submitButton) {
      submitButton.textContent = 'Добавить';
    }

    if (form) {
      form.reset();
    }

    openModal();
  }

  function openEditModal(setId, weight, reps) {
    editingSetId = setId;

    if (modalTitle) {
      modalTitle.textContent = 'Редактировать результат';
    }

    if (submitButton) {
      submitButton.textContent = 'Сохранить';
    }

    weightInput.value = weight;
    repsInput.value = reps;

    openModal();
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

    editingSetId = null;

    if (form) {
      form.reset();
    }

    if (modalTitle) {
      modalTitle.textContent = 'Добавить результат';
    }

    if (submitButton) {
      submitButton.textContent = 'Добавить';
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