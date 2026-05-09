function openCreateWorkoutModal(modalTitle, submitButton, workoutForm, modal, exerciseSelect) {
  modalTitle.textContent = 'Добавить упражнение';

  if (submitButton) {
    submitButton.textContent = 'Добавить';
  }

  workoutForm.reset();
  openWorkoutModal(modal, exerciseSelect);
}

function openWorkoutModal(modal, exerciseSelect) {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = '';

  setTimeout(() => {
    exerciseSelect.focus();
  }, 0);
}

function closeWorkoutModal(modal, workoutForm) {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  workoutForm.reset();
}