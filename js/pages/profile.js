document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('fitdata_user_id');
  const userEmail = localStorage.getItem('fitdata_email');

  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  const state = {
    userId,
    email: userEmail || '',
    profileExists: false,
    selectedLevel: '',
    selectedGoal: '',
    lastProfileData: null,
  };

  const elements = {
    form: document.getElementById('profileForm'),
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    age: document.getElementById('age'),
    disclaimerAccepted: document.getElementById('disclaimerAccepted'),
    editButton: document.getElementById('editProfileButton'),
    saveButton: document.getElementById('saveProfileButton'),
    resetButton: document.getElementById('resetProfileButton'),
    logoutButton: document.getElementById('logoutButton'),
    status: document.getElementById('profileStatus'),

    summaryName: document.getElementById('summaryName'),
    summaryEmail: document.getElementById('summaryEmail'),
    summaryLevel: document.getElementById('summaryLevel'),
    summaryGoal: document.getElementById('summaryGoal'),
    summaryAge: document.getElementById('summaryAge'),
    avatar: document.getElementById('profileAvatar'),
    progressText: document.getElementById('profileProgressText'),
    progressFill: document.getElementById('profileProgressFill'),
  };

  const levelLabels = {
    beginner: 'Новичок',
    amateur: 'Любитель',
    advanced: 'Продвинутый',
  };

  const goalLabels = {
    muscle_gain: 'Набор мышечной массы',
    strength: 'Развитие силы',
    maintenance: 'Поддержание формы',
    general_fitness: 'Общий фитнес',
  };

  init();

  async function init() {
    bindEvents();
    await loadProfile();
  }

  function bindEvents() {
  document.querySelectorAll('[data-level]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;

      setSelectedLevel(button.dataset.level);
      updateSummary();
    });
  });

  document.querySelectorAll('[data-goal]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;

      setSelectedGoal(button.dataset.goal);
      updateSummary();
    });
  });

  elements.form.addEventListener('input', updateSummary);
  elements.form.addEventListener('change', updateSummary);

  elements.editButton.addEventListener('click', () => {
    setEditMode(true);
    showStatus('Режим редактирования включён', 'neutral');
  });

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveProfile();
  });

  elements.resetButton.addEventListener('click', () => {
    if (state.lastProfileData) {
      fillForm(state.lastProfileData);
      setEditMode(false);
      showStatus('Изменения отменены', 'neutral');
    }
  });

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', () => {
      localStorage.removeItem('fitdata_user_id');
      localStorage.removeItem('fitdata_email');
      window.location.href = 'login.html';
    });
  }
}
  async function loadProfile() {
    setLoading(true);
    showStatus('Загрузка профиля...', 'neutral');

    try {
      const response = await getProfileRequest(state.userId);
      const profile = normalizeProfileResponse(response);

      state.profileExists = Boolean(profile.id);
      state.lastProfileData = profile;

      fillForm(profile);
      setEditMode(false);
      showStatus('', 'neutral');
    } catch (error) {
      const fallbackProfile = getFallbackProfile();

      state.profileExists = false;
      state.lastProfileData = fallbackProfile;

      fillForm(fallbackProfile);
      setEditMode(true);
      showStatus('Профиль пока не создан. Заполните данные и сохраните профиль.', 'neutral');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    const payload = collectFormData();

    setLoading(true);
    showStatus('Сохранение профиля...', 'neutral');

    try {
      const method = state.profileExists ? 'PUT' : 'POST';
      const response = await saveProfileRequest(payload, method);
      const savedProfile = normalizeProfileResponse(response);

      state.profileExists = true;
      state.lastProfileData = {
        ...payload,
        ...savedProfile,
      };
      fillForm(state.lastProfileData);
      setEditMode(false);
      showStatus('Профиль сохранён', 'success');
    } catch (error) {
      showStatus(error.message || 'Не удалось сохранить профиль', 'error');
    } finally {
      setLoading(false);
    }
  }

  function normalizeProfileResponse(response) {
    const source = response.profile || response;

    return {
      id: source.id || null,
      user_id: source.user_id || state.userId,
      full_name: source.full_name || source.name || '',
      email: source.email || state.email || '',
      age: source.age || '',
      training_level: source.training_level || '',
      training_goal: source.training_goal || '',
      health_limitations: parseLimitations(source.health_limitations),
      disclaimer_accepted: Boolean(source.disclaimer_accepted),
      created_at: source.created_at || null,
      updated_at: source.updated_at || null,
    };
  }

  function getFallbackProfile() {
    return {
      id: null,
      user_id: state.userId,
      full_name: '',
      email: state.email,
      age: '',
      training_level: '',
      training_goal: '',
      health_limitations: [],
      disclaimer_accepted: false,
      created_at: null,
      updated_at: null,
    };
  }

  function parseLimitations(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  function fillForm(profile) {
    elements.fullName.value = profile.full_name || '';
    elements.email.value = profile.email || state.email || '';
    elements.age.value = profile.age || '';
    elements.disclaimerAccepted.checked = Boolean(profile.disclaimer_accepted);

    setSelectedLevel(profile.training_level || '');
    setSelectedGoal(profile.training_goal || '');
    setSelectedLimitations(profile.health_limitations || []);

    updateSummary();
  }

  function collectFormData() {
    return {
      user_id: Number(state.userId),
      full_name: elements.fullName.value.trim(),
      email: elements.email.value.trim(),
      age: elements.age.value ? Number(elements.age.value) : null,
      training_level: state.selectedLevel,
      training_goal: state.selectedGoal,
      health_limitations: getSelectedLimitations(),
      disclaimer_accepted: elements.disclaimerAccepted.checked,
    };
  }

  function setSelectedLevel(level) {
    state.selectedLevel = level;

    document.querySelectorAll('[data-level]').forEach((button) => {
      button.classList.toggle(
        'profile-segment__button--active',
        button.dataset.level === level
      );
    });
  }

  function setSelectedGoal(goal) {
    state.selectedGoal = goal;

    document.querySelectorAll('[data-goal]').forEach((button) => {
      button.classList.toggle(
        'profile-segment__button--active',
        button.dataset.goal === goal
      );
    });
  }

  function setSelectedLimitations(limitations) {
    document.querySelectorAll('input[name="limitations"]').forEach((checkbox) => {
      checkbox.checked = limitations.includes(checkbox.value);
    });
  }

  function getSelectedLimitations() {
    return Array.from(document.querySelectorAll('input[name="limitations"]:checked'))
      .map((checkbox) => checkbox.value);
  }

  function updateSummary() {
    const fullName = elements.fullName.value.trim();
    const email = elements.email.value.trim();
    const age = elements.age.value.trim();

    elements.summaryName.textContent = fullName || 'Пользователь FITDATA';
    elements.summaryEmail.textContent = email || '—';
    elements.summaryLevel.textContent = levelLabels[state.selectedLevel] || '—';
    elements.summaryGoal.textContent = goalLabels[state.selectedGoal] || '—';
    elements.summaryAge.textContent = age || '—';

    elements.avatar.textContent = getInitials(fullName || email || 'FITDATA');

    const progress = calculateProgress({
      fullName,
      email,
      age,
      trainingLevel: state.selectedLevel,
      trainingGoal: state.selectedGoal,
      disclaimerAccepted: elements.disclaimerAccepted.checked,
    });

    elements.progressText.textContent = `${progress}%`;
    elements.progressFill.style.width = `${progress}%`;

    updateHeaderUserName(fullName || email);
  }

  function calculateProgress(profile) {
    const checks = [
      Boolean(profile.fullName),
      Boolean(profile.email),
      Boolean(profile.age),
      Boolean(profile.trainingLevel),
      Boolean(profile.trainingGoal),
      Boolean(profile.disclaimerAccepted),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  function getInitials(value) {
    const cleanValue = String(value).trim();

    if (!cleanValue) return 'FD';

    const parts = cleanValue
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return cleanValue.slice(0, 2).toUpperCase();
  }

  function updateHeaderUserName(value) {
    const userMenuButton = document.getElementById('userMenuButton');

    if (userMenuButton && value) {
      userMenuButton.textContent = value;
    }
  }
function setEditMode(isEditing) {
  elements.form.classList.toggle('profile-form--readonly', !isEditing);

  elements.editButton.classList.toggle('profile-button--hidden', isEditing);
  elements.resetButton.classList.toggle('profile-button--hidden', !isEditing);
  elements.saveButton.classList.toggle('profile-button--hidden', !isEditing);

  const editableElements = [
    elements.fullName,
    elements.email,
    elements.age,
    elements.disclaimerAccepted,
  ];

  editableElements.forEach((element) => {
    if (element) {
      element.disabled = !isEditing;
    }
  });

  document
    .querySelectorAll('[data-level], [data-goal], input[name="limitations"]')
    .forEach((element) => {
      element.disabled = !isEditing;
    });
}
  function setLoading(isLoading) {
    elements.saveButton.disabled = isLoading;
    elements.resetButton.disabled = isLoading;
    elements.editButton.disabled = isLoading;
  
    elements.saveButton.textContent = isLoading
      ? 'Сохранение...'
      : 'Сохранить профиль';
  }

  function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = 'profile-status';

    if (message) {
      elements.status.classList.add(`profile-status--${type}`);
    }
  }
});