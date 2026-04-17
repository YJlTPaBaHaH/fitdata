document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'fitdata_workouts';

  const daysContainer = document.querySelector('.workouts-calendar__days');
  const prevBtn = document.querySelectorAll('.workouts-calendar__arrow')[0];
  const nextBtn = document.querySelectorAll('.workouts-calendar__arrow')[1];
  const workoutsGrid = document.getElementById('workoutsGrid');

  const modal = document.getElementById('workoutModal');
  const openModalBtn = document.getElementById('openWorkoutModal');
  const closeModalBackdrop = document.getElementById('closeWorkoutModal');
  const cancelModalBtn = document.getElementById('cancelWorkoutModal');
  const workoutForm = document.getElementById('workoutForm');

  const modalTitle = document.getElementById('workoutModalTitle');
  const submitButton = document.getElementById('workoutSubmitButton');

  const exerciseNameInput = document.getElementById('exerciseName');
  const exerciseWeightInput = document.getElementById('exerciseWeight');
  const exerciseRepsInput = document.getElementById('exerciseReps');

  if (!daysContainer || !workoutsGrid || !modal || !workoutForm) return;

  const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
  const monthNames = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря'
  ];

  let currentStartDate = getStartOfWeek(new Date());
  let selectedDate = new Date();

  renderWeek(currentStartDate);
  renderWorkoutsForSelectedDate();

  daysContainer.addEventListener('click', (event) => {
    const dayButton = event.target.closest('.workouts-calendar__day');
    if (!dayButton) return;

    const dateKey = dayButton.dataset.date;
    if (!dateKey) return;

    selectedDate = parseDateKey(dateKey);
    setActiveDay(dateKey);
    renderWorkoutsForSelectedDate();
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentStartDate = addDays(currentStartDate, -7);
      renderWeek(currentStartDate);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentStartDate = addDays(currentStartDate, 7);
      renderWeek(currentStartDate);
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', openCreateModal);
  }

  if (closeModalBackdrop) {
    closeModalBackdrop.addEventListener('click', closeModal);
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  workoutsGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.workout-card--filled');
    if (!card) return;

    const workoutId = Number(card.dataset.id);
    if (!workoutId) return;

    const workouts = getWorkoutsForDate(selectedDate);
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) return;

    window.location.href = `analitics.html?name=${encodeURIComponent(workout.name)}`;
  });

  workoutForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = exerciseNameInput.value.trim();
    const weight = exerciseWeightInput.value.trim();
    const reps = exerciseRepsInput.value.trim();

    if (!name || !weight || !reps) return;

    const newWorkout = {
      id: Date.now(),
      name,
      weight: Number(weight),
      reps: Number(reps),
      date: formatDateKey(selectedDate),
      dateLabel: formatFullDate(selectedDate)
    };

    const stored = getStorageData();
    stored.push(newWorkout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    renderWorkoutsForSelectedDate();
    closeModal();
  });

  function openCreateModal() {
    modalTitle.textContent = 'Добавить упражнение';
    if (submitButton) {
      submitButton.textContent = 'Добавить';
    }
    workoutForm.reset();
    openModal();
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      exerciseNameInput.focus();
    }, 0);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    workoutForm.reset();
  }

  function renderWeek(startDate) {
    daysContainer.innerHTML = '';

    for (let i = 0; i < 7; i += 1) {
      const currentDate = addDays(startDate, i);
      const dateKey = formatDateKey(currentDate);

      const dayButton = document.createElement('button');
      dayButton.className = 'workouts-calendar__day';
      dayButton.type = 'button';
      dayButton.dataset.date = dateKey;

      if (dateKey === formatDateKey(selectedDate)) {
        dayButton.classList.add('workouts-calendar__day--active');
      }

      dayButton.innerHTML = `
        <span class="workouts-calendar__weekday">${weekdays[i]}</span>
        <span class="workouts-calendar__date">${formatShortDate(currentDate)}</span>
      `;

      daysContainer.appendChild(dayButton);
    }
  }

  function setActiveDay(dateKey) {
    const dayButtons = daysContainer.querySelectorAll('.workouts-calendar__day');

    dayButtons.forEach((button) => {
      button.classList.toggle(
        'workouts-calendar__day--active',
        button.dataset.date === dateKey
      );
    });
  }

  function renderWorkoutsForSelectedDate() {
    const workouts = getWorkoutsForDate(selectedDate);

    workoutsGrid.innerHTML = '';

    if (workouts.length === 0) {
      for (let i = 0; i < 6; i += 1) {
        workoutsGrid.appendChild(createEmptyCard());
      }
      return;
    }

    workouts.forEach((workout) => {
      workoutsGrid.appendChild(createWorkoutCard(workout));
    });

    const emptyCount = Math.max(0, 6 - workouts.length);
    for (let i = 0; i < emptyCount; i += 1) {
      workoutsGrid.appendChild(createEmptyCard());
    }
  }

  function getWorkoutsForDate(date) {
    const dateKey = formatDateKey(date);

    return getStorageData()
      .filter((item) => item.date === dateKey)
      .sort((a, b) => b.id - a.id);
  }

  function createWorkoutCard(workout) {
    const card = document.createElement('article');
    card.className = 'workout-card workout-card--filled';
    card.dataset.id = String(workout.id);

    card.innerHTML = `
      <h2 class="workout-card__title">${escapeHtml(workout.name)}</h2>
      <div class="workout-card__divider"></div>

      <div class="workout-card__row">
        <span class="workout-card__label">Последний результат:</span>
        <span class="workout-card__value">${escapeHtml(workout.weight)}кг × ${escapeHtml(workout.reps)} раз</span>
      </div>

      <p class="workout-card__date">${escapeHtml(workout.dateLabel)}</p>

      <div class="workout-card__divider"></div>

      <div class="workout-card__row">
        <span class="workout-card__label">Лучший результат:</span>
        <span class="workout-card__best-wrap">
          <span class="workout-card__icon" aria-hidden="true">🏆</span>
          <span class="workout-card__value">${escapeHtml(workout.weight)}кг × ${escapeHtml(workout.reps)} раз</span>
        </span>
      </div>

      <p class="workout-card__date">${escapeHtml(workout.dateLabel)}</p>
    `;

    return card;
  }

  function createEmptyCard() {
    const card = document.createElement('article');
    card.className = 'workout-card workout-card--empty';
    return card;
  }

  function getStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function getStartOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);

    return result;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatShortDate(date) {
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  }

  function formatFullDate(date) {
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
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