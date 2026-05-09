const WORKOUT_WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const WORKOUT_MONTH_NAMES = [
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

function renderExerciseOptions(exerciseSelect, exercises) {
  exerciseSelect.innerHTML = '<option value="">Выберите упражнение</option>';

  exercises.forEach((exercise) => {
    const option = document.createElement('option');
    option.value = exercise.exercise_id;
    option.dataset.name = exercise.name;
    option.textContent = exercise.name;
    exerciseSelect.appendChild(option);
  });
}

function renderEmptyCards(workoutsGrid) {
  workoutsGrid.innerHTML = '';

  for (let i = 0; i < 6; i += 1) {
    workoutsGrid.appendChild(createEmptyCard());
  }
}

function renderWeek(daysContainer, startDate, selectedDate) {
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
      <span class="workouts-calendar__weekday">${WORKOUT_WEEKDAYS[i]}</span>
      <span class="workouts-calendar__date">${formatShortDate(currentDate)}</span>
    `;

    daysContainer.appendChild(dayButton);
  }
}

function setActiveDay(daysContainer, dateKey) {
  const dayButtons = daysContainer.querySelectorAll('.workouts-calendar__day');

  dayButtons.forEach((button) => {
    button.classList.toggle(
      'workouts-calendar__day--active',
      button.dataset.date === dateKey
    );
  });
}

function renderWorkoutCards(workoutsGrid, workouts) {
  workoutsGrid.innerHTML = '';

  if (workouts.length === 0) {
    renderEmptyCards(workoutsGrid);
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

function formatShortDate(date) {
  return `${date.getDate()} ${WORKOUT_MONTH_NAMES[date.getMonth()]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}