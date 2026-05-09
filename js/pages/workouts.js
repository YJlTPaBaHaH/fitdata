document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://127.0.0.1:5000/api';
  const userId = localStorage.getItem('fitdata_user_id');

  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

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

  const exerciseSelect = document.getElementById('exerciseSelect');
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
  loadExercises();
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
      renderWorkoutsForSelectedDate();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentStartDate = addDays(currentStartDate, 7);
      renderWeek(currentStartDate);
      renderWorkoutsForSelectedDate();
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

    const workoutExerciseId = card.dataset.workoutExerciseId;
    const exerciseName = card.dataset.exerciseName;

    if (!workoutExerciseId || !exerciseName) return;

    window.location.href = `analitics.html?name=${encodeURIComponent(exerciseName)}&workoutExerciseId=${workoutExerciseId}`;
  });

  workoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const exerciseId = exerciseSelect.value;
    const exerciseName = exerciseSelect.options[exerciseSelect.selectedIndex]?.dataset.name;
    const weight = exerciseWeightInput.value.trim();
    const reps = exerciseRepsInput.value.trim();

    if (!exerciseId || !weight || !reps) {
      alert('Заполните все поля');
      return;
    }

    try {
      const workout = await createWorkout();
      const workoutExercise = await addExerciseToWorkout(workout.workout_id, exerciseId);
      await addSet(workoutExercise.workout_exercise_id, weight, reps);

      await renderWorkoutsForSelectedDate();
      closeModal();
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
  });

  async function loadExercises() {
    try {
      const response = await fetch(`${API_URL}/exercises`);
      const exercises = await response.json();

      exerciseSelect.innerHTML = '<option value="">Выберите упражнение</option>';

      exercises.forEach((exercise) => {
        const option = document.createElement('option');
        option.value = exercise.exercise_id;
        option.dataset.name = exercise.name;
        option.textContent = `${exercise.name} — ${exercise.muscle_group}`;
        exerciseSelect.appendChild(option);
      });
    } catch (error) {
      alert('Не удалось загрузить список упражнений');
      console.error(error);
    }
  }

  async function createWorkout() {
    const response = await fetch(`${API_URL}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: Number(userId),
        date: formatDateKey(selectedDate),
        duration: null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка создания тренировки');
    }

    return data;
  }

  async function addExerciseToWorkout(workoutId, exerciseId) {
    const response = await fetch(`${API_URL}/workout-exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workout_id: Number(workoutId),
        exercise_id: Number(exerciseId),
        order_index: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка добавления упражнения');
    }

    return data;
  }

  async function addSet(workoutExerciseId, weight, reps) {
    const response = await fetch(`${API_URL}/sets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workout_exercise_id: Number(workoutExerciseId),
        set_number: 1,
        weight: Number(weight),
        reps: Number(reps),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка добавления подхода');
    }

    return data;
  }

  async function getWorkoutsForDate(date) {
    const dateKey = formatDateKey(date);

    const response = await fetch(`${API_URL}/workouts?user_id=${userId}`);
    const workouts = await response.json();

    if (!response.ok) {
      throw new Error(workouts.error || 'Ошибка загрузки тренировок');
    }

    const result = [];

    for (const workout of workouts) {
      if (workout.date !== dateKey) continue;

      const detailResponse = await fetch(`${API_URL}/workouts/${workout.workout_id}`);
      const detail = await detailResponse.json();

      if (!detailResponse.ok) continue;

      detail.exercises.forEach((exercise) => {
        const firstSet = exercise.sets[0];

        if (!firstSet) return;

        result.push({
          workoutId: detail.workout_id,
          workoutExerciseId: exercise.workout_exercise_id,
          name: exercise.name,
          weight: firstSet.weight,
          reps: firstSet.reps,
          date: detail.date,
          dateLabel: formatFullDate(parseDateKey(detail.date)),
        });
      });
    }

    return result;
  }

  async function renderWorkoutsForSelectedDate() {
  workoutsGrid.innerHTML = '';

  try {
    const workouts = await getWorkoutsForDate(selectedDate);
    const groupedWorkouts = groupWorkoutsByExercise(workouts);

    if (groupedWorkouts.length === 0) {
      renderEmptyCards();
      return;
    }

    groupedWorkouts.forEach((workout) => {
      workoutsGrid.appendChild(createWorkoutCard(workout));
    });

    const emptyCount = Math.max(0, 6 - groupedWorkouts.length);

    for (let i = 0; i < emptyCount; i += 1) {
      workoutsGrid.appendChild(createEmptyCard());
    }
  } catch (error) {
    console.error(error);
    renderEmptyCards();
  }
}
function groupWorkoutsByExercise(workouts) {
  const grouped = {};

  workouts.forEach((workout) => {
    if (!grouped[workout.name]) {
      grouped[workout.name] = [];
    }

    grouped[workout.name].push(workout);
  });

  return Object.values(grouped).map((records) => {
    const sortedByDate = [...records].sort((a, b) => {
      return b.workoutId - a.workoutId;
    });

    const lastRecord = sortedByDate[0];

    const bestRecord = [...records].sort((a, b) => {
      if (Number(b.weight) !== Number(a.weight)) {
        return Number(b.weight) - Number(a.weight);
      }

      return Number(b.reps) - Number(a.reps);
    })[0];

    return {
      workoutId: lastRecord.workoutId,
      workoutExerciseId: lastRecord.workoutExerciseId,
      name: lastRecord.name,

      weight: lastRecord.weight,
      reps: lastRecord.reps,
      date: lastRecord.date,
      dateLabel: lastRecord.dateLabel,

      bestWeight: bestRecord.weight,
      bestReps: bestRecord.reps,
      bestDateLabel: bestRecord.dateLabel,
    };
  });
}

  function renderEmptyCards() {
    workoutsGrid.innerHTML = '';

    for (let i = 0; i < 6; i += 1) {
      workoutsGrid.appendChild(createEmptyCard());
    }
  }

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
    document.body.style.overflow = '';

    setTimeout(() => {
      exerciseSelect.focus();
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

  function createWorkoutCard(workout) {
  const card = document.createElement('article');
  card.className = 'workout-card workout-card--filled';
  card.dataset.workoutId = String(workout.workoutId);
  card.dataset.workoutExerciseId = String(workout.workoutExerciseId);
  card.dataset.exerciseName = workout.name;

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
        <span class="workout-card__value">${escapeHtml(workout.bestWeight)}кг × ${escapeHtml(workout.bestReps)} раз</span>
      </span>
    </div>

    <p class="workout-card__date">${escapeHtml(workout.bestDateLabel)}</p>
  `;

  return card;
}

  function createEmptyCard() {
    const card = document.createElement('article');
    card.className = 'workout-card workout-card--empty';
    return card;
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