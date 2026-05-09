document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.querySelector('.hero-home__start-button');

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
});