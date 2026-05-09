document.addEventListener('DOMContentLoaded', () => {
  const userEmail = localStorage.getItem('fitdata_email');
  const nav = document.querySelector('.header__nav');

  if (!nav) return;

  if (!userEmail) {
    nav.innerHTML = `
      <a href="index.html" class="header__link">Главная</a>
      <a href="login.html" class="header__link">Вход / Регистрация</a>
    `;
    return;
  }

  nav.innerHTML = `
    <a href="index.html" class="header__link">Главная</a>

    <div class="header-user">
      <button class="header-user__button" type="button" id="userMenuButton">
        ${escapeHtml(userEmail)}
      </button>

      <div class="header-user__dropdown" id="userMenuDropdown">
        <button class="header-user__logout" type="button" id="logoutButton">
          Выйти
        </button>
      </div>
    </div>
  `;

  const userMenuButton = document.getElementById('userMenuButton');
  const userMenuDropdown = document.getElementById('userMenuDropdown');
  const logoutButton = document.getElementById('logoutButton');

  userMenuButton.addEventListener('click', () => {
    userMenuDropdown.classList.toggle('header-user__dropdown--open');
  });

  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('fitdata_user_id');
    localStorage.removeItem('fitdata_email');
    window.location.href = 'login.html';
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.header-user')) {
      userMenuDropdown.classList.remove('header-user__dropdown--open');
    }
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
});