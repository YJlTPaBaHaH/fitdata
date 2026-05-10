const API_URL = 'http://127.0.0.1:5000/api';

async function getExercises() {
  const response = await fetch(`${API_URL}/exercises`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки упражнений');
  }

  return data;
}

async function createWorkoutRequest(userId, date) {
  const response = await fetch(`${API_URL}/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      date,
      duration: null,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка создания тренировки');
  }

  return data;
}

async function addExerciseToWorkoutRequest(workoutId, exerciseId) {
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

async function addSetRequest(workoutExerciseId, weight, reps) {
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

async function getUserWorkouts(userId) {
  const response = await fetch(`${API_URL}/workouts?user_id=${userId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки тренировок');
  }

  return data;
}

async function getWorkoutDetails(workoutId) {
  const response = await fetch(`${API_URL}/workouts/${workoutId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки деталей тренировки');
  }

  return data;
}
async function getMlRecommendation(userId, date = null) {
  const params = new URLSearchParams({
    user_id: String(userId),
  });

  if (date) {
    params.append('date', date);
  }

  const response = await fetch(`${API_URL}/ml/recommendation?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Ошибка загрузки ML-рекомендации');
    error.status = response.status;
    throw error;
  }

  return data;
}