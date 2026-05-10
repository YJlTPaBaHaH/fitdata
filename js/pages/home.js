document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.querySelector('.hero-home__start-button');
  const insightCard = document.getElementById('homeInsightCard');

  initStartButton(startButton);
  renderHomeInsight(insightCard);
});

function initStartButton(startButton) {
  if (!startButton) return;

  startButton.addEventListener('click', (event) => {
    event.preventDefault();

    const userId = localStorage.getItem('fitdata_user_id');

    if (userId) {
      window.location.href = 'workouts.html';
      return;
    }

    window.location.href = 'register.html';
  });
}

async function renderHomeInsight(container) {
  if (!container) return;

  const userId = localStorage.getItem('fitdata_user_id');

  if (!userId) {
    renderDemoInsight(container);
    return;
  }

  renderInsightLoading(container);

  try {
    const today = formatDateKey(new Date());
    const data = await getMlRecommendation(userId, today);

    renderAuthorizedInsight(container, data);
  } catch (error) {
    renderAuthorizedFallbackInsight(container);
  }
}

function renderDemoInsight(container) {
  container.innerHTML = `
    <article class="home-insight home-insight--demo">
      <p class="home-insight__eyebrow">Пример анализа FITDATA</p>

      <div class="home-insight__header">
        <h2 class="home-insight__title">Готовность к нагрузке</h2>
        <span class="home-insight__badge home-insight__badge--optimal">Демо</span>
      </div>

      <p class="home-insight__text">
        Система анализирует тренировочный объем, частоту занятий и динамику нагрузки,
        чтобы показать понятную рекомендацию на день.
      </p>

      <div class="home-insight__metrics">
        <div class="home-insight__metric">
          <span class="home-insight__metric-label">Следующий объем</span>
          <span class="home-insight__metric-value">1500 кг</span>
        </div>

        <div class="home-insight__metric">
          <span class="home-insight__metric-label">Частота</span>
          <span class="home-insight__metric-value">4 / 7 дней</span>
        </div>

        <div class="home-insight__metric home-insight__metric--wide">
          <span class="home-insight__metric-label">Рекомендация</span>
          <span class="home-insight__metric-value">Сохраняйте текущую динамику</span>
        </div>
      </div>

      <p class="home-insight__note">
        Зарегистрируйтесь, чтобы получать персональные рекомендации.
      </p>

      <a href="register.html" class="home-insight__button">
        Создать аккаунт
      </a>
    </article>
  `;
}

function renderInsightLoading(container) {
  container.innerHTML = `
    <article class="home-insight">
      <p class="home-insight__eyebrow">FITDATA ML</p>
      <h2 class="home-insight__title">Загрузка анализа...</h2>
      <p class="home-insight__text">
        Получаем персональный статус тренировочного режима.
      </p>
    </article>
  `;
}

function renderAuthorizedInsight(container, data) {
  const temporalStatus = data.temporal_status?.status || 'ready';
  const statusClass = getInsightStatusClass(temporalStatus, data.load_class);
  const title = data.load_status || 'Персональный анализ';

  const metrics = normalizeInsightMetrics(data.display_metrics || []);

  const shortRecommendation = buildShortRecommendation(data);

  container.innerHTML = `
    <article class="home-insight home-insight--${statusClass}">
      <p class="home-insight__eyebrow">Ваш статус на сегодня</p>

      <div class="home-insight__header">
        <h2 class="home-insight__title">${escapeHtml(title)}</h2>

        <span class="home-insight__badge home-insight__badge--${statusClass}">
          FITDATA ML
        </span>
      </div>

      <p class="home-insight__text">
        ${escapeHtml(shortRecommendation)}
      </p>

      <div class="home-insight__metrics">
        ${metrics.map((metric) => `
          <div class="home-insight__metric">
            <span class="home-insight__metric-label">${escapeHtml(metric.label)}</span>
            <span class="home-insight__metric-value">${escapeHtml(metric.value)}</span>
          </div>
        `).join('')}
      </div>

      <a href="workouts.html" class="home-insight__button">
        Перейти к тренировкам
      </a>
    </article>
  `;
}
function buildShortRecommendation(data) {
  const status = data.temporal_status?.status;

  if (status === 'recovery') {
    return 'После высокой нагрузки системе рекомендован восстановительный день.';
  }

  if (status === 'ready') {
    return 'Пользователь находится в состоянии готовности к следующей тренировке.';
  }

  if (status === 'underload') {
    return 'Активность снижена. Рекомендуется возвращение к регулярным тренировкам.';
  }

  if (data.load_class === 2) {
    return 'Зафиксирована повышенная нагрузка. Рекомендуется контроль объема.';
  }

  if (data.load_class === 1) {
    return 'Текущий тренировочный режим оценивается как сбалансированный.';
  }

  return 'Система анализирует тренировочную динамику пользователя.';
}

function renderAuthorizedFallbackInsight(container) {
  container.innerHTML = `
    <article class="home-insight home-insight--neutral">
      <p class="home-insight__eyebrow">FITDATA ML</p>

      <div class="home-insight__header">
        <h2 class="home-insight__title">Анализ пока недоступен</h2>
        <span class="home-insight__badge home-insight__badge--neutral">Нет данных</span>
      </div>

      <p class="home-insight__text">
        Добавьте несколько тренировок, чтобы система смогла рассчитать нагрузку,
        определить динамику и сформировать персональную рекомендацию.
      </p>

      <a href="workouts.html" class="home-insight__button">
        Добавить тренировку
      </a>
    </article>
  `;
}

function normalizeInsightMetrics(metrics) {
  if (!metrics.length) {
    return [
      {
        label: 'Статус',
        value: 'Данные обновляются',
      },
    ];
  }

  return metrics.slice(0, 4);
}

function getInsightStatusClass(temporalStatus, loadClass) {
  if (temporalStatus === 'recovery') return 'risk';
  if (temporalStatus === 'ready') return 'optimal';
  if (temporalStatus === 'underload') return 'low';
  if (temporalStatus === 'no_data') return 'neutral';

  if (Number(loadClass) === 2) return 'risk';
  if (Number(loadClass) === 1) return 'optimal';

  return 'low';
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}