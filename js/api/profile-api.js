const PROFILE_API_URL = 'http://127.0.0.1:5000/api';

async function getProfileRequest(userId) {
  const response = await fetch(`${PROFILE_API_URL}/profile?user_id=${encodeURIComponent(userId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка загрузки профиля');
  }

  return data;
}

async function saveProfileRequest(profileData, method = 'POST') {
  const response = await fetch(`${PROFILE_API_URL}/profile`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка сохранения профиля');
  }

  return data;
}