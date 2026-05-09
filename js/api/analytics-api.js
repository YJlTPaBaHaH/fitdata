const API_URL = 'http://127.0.0.1:5000/api';

async function getExerciseAnalytics(userId, exerciseName) {
  const response = await fetch(
    `${API_URL}/analytics/exercise?user_id=${userId}&name=${encodeURIComponent(exerciseName)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки аналитики');
  }

  return data;
}

async function createAnalyticsRecord(userId, exerciseName, weight, reps, date) {
  const response = await fetch(`${API_URL}/analytics/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      name: exerciseName,
      weight: Number(weight),
      reps: Number(reps),
      date,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка добавления результата');
  }

  return data;
}

async function updateSetRequest(setId, weight, reps) {
  const response = await fetch(`${API_URL}/sets/${setId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      weight: Number(weight),
      reps: Number(reps),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка редактирования результата');
  }

  return data;
}

async function deleteSetRequest(setId) {
  const response = await fetch(`${API_URL}/sets/${setId}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка удаления результата');
  }

  return data;
}