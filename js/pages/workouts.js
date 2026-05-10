document.addEventListener('DOMContentLoaded', () => {
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

  renderWeek(daysContainer, getCurrentStartDate(), getSelectedDate());
  loadExercises();
  renderWorkoutsForSelectedDate();

  daysContainer.addEventListener('click', (event) => {
    const dayButton = event.target.closest('.workouts-calendar__day');
    if (!dayButton) return;

    const dateKey = dayButton.dataset.date;
    if (!dateKey) return;

    setSelectedDate(parseDateKey(dateKey));
    setActiveDay(daysContainer, dateKey);
    renderWorkoutsForSelectedDate();
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      setCurrentStartDate(addDays(getCurrentStartDate(), -7));
      renderWeek(daysContainer, getCurrentStartDate(), getSelectedDate());
      renderWorkoutsForSelectedDate();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      setCurrentStartDate(addDays(getCurrentStartDate(), 7));
      renderWeek(daysContainer, getCurrentStartDate(), getSelectedDate());
      renderWorkoutsForSelectedDate();
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      openCreateWorkoutModal(
        modalTitle,
        submitButton,
        workoutForm,
        modal,
        exerciseSelect
      );
    });
  }

  if (closeModalBackdrop) {
    closeModalBackdrop.addEventListener('click', () => {
      closeWorkoutModal(modal, workoutForm);
    });
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', () => {
      closeWorkoutModal(modal, workoutForm);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeWorkoutModal(modal, workoutForm);
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

      closeWorkoutModal(modal, workoutForm);
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
  });

  async function loadExercises() {
    try {
      const exercises = await getExercises();
      renderExerciseOptions(exerciseSelect, exercises);
    } catch (error) {
      alert('Не удалось загрузить список упражнений');
      console.error(error);
    }
  }

  async function createWorkout() {
    const selectedDateKey = formatDateKey(getSelectedDate());
    const workouts = await getUserWorkouts(userId);

    const existingWorkout = workouts.find((workout) => {
      return workout.date === selectedDateKey;
    });

    if (existingWorkout) {
      return existingWorkout;
    }

    return createWorkoutRequest(userId, selectedDateKey);
  }

  async function addExerciseToWorkout(workoutId, exerciseId) {
    return addExerciseToWorkoutRequest(workoutId, exerciseId);
  }

  async function addSet(workoutExerciseId, weight, reps) {
    return addSetRequest(workoutExerciseId, weight, reps);
  }

  async function getWorkoutsForDate(date) {
    const dateKey = formatDateKey(date);
    const workouts = await getUserWorkouts(userId);

    const result = [];

    for (const workout of workouts) {
      if (workout.date !== dateKey) continue;

      const detail = await getWorkoutDetails(workout.workout_id);

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
    try {
      const workouts = await getWorkoutsForDate(getSelectedDate());
      const groupedWorkouts = groupWorkoutsByExercise(workouts);

      renderWorkoutCards(workoutsGrid, groupedWorkouts);
    } catch (error) {
      console.error(error);
      renderEmptyCards(workoutsGrid);
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

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatFullDate(date) {
    const months = [
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
      'декабря',
    ];

    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
});