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

      renderHistory(historyRows, filteredData);
      renderStats(lastResultElement, bestResultElement, volumeElement, filteredData);
      renderChart(filteredData);
    } catch (error) {
      console.error(error);
      renderHistory(historyRows, []);
      renderStats(lastResultElement, bestResultElement, volumeElement, []);
      renderChart([]);
    }
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
});