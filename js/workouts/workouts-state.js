const workoutsState = {
  currentStartDate: getStartOfWeek(new Date()),
  selectedDate: new Date(),
};

function getCurrentStartDate() {
  return workoutsState.currentStartDate;
}

function setCurrentStartDate(date) {
  workoutsState.currentStartDate = date;
}

function getSelectedDate() {
  return workoutsState.selectedDate;
}

function setSelectedDate(date) {
  workoutsState.selectedDate = date;
}

function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}