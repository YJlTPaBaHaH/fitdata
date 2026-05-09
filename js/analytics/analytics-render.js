function renderHistory(historyRows, records) {
  if (!historyRows) return;

  if (records.length === 0) {
    historyRows.innerHTML = `
      <div class="analitics-history-table__row analitics-history-table__row--item">
        <span>—</span>
        <span>—</span>
        <span>—</span>
        <span>—</span>
      </div>
    `;
    return;
  }

  const bestRecord = getBestRecord(records);

  historyRows.innerHTML = records.map((record) => {
    const isBest = bestRecord && bestRecord.set_id === record.set_id;

    return `
      <div class="analitics-history-table__row analitics-history-table__row--item">
        <span>${escapeHtml(formatRusDate(parseDateKey(record.date)))}</span>

        <span class="analitics-history-table__value">
          ${isBest ? '🏆 ' : ''}${escapeHtml(record.weight)} кг
        </span>

        <span>${escapeHtml(record.reps)} раз</span>

        <span class="analitics-history-table__actions">
          <button
            class="analitics-history-table__edit"
            type="button"
            data-set-id="${record.set_id}"
            data-weight="${record.weight}"
            data-reps="${record.reps}"
          >
            Ред.
          </button>

          <button
            class="analitics-history-table__delete"
            type="button"
            data-set-id="${record.set_id}"
          >
            Удалить
          </button>
        </span>
      </div>
    `;
  }).join('');
}

function renderStats(lastResultElement, bestResultElement, volumeElement, records) {
  if (!records.length) {
    lastResultElement.textContent = '—';
    bestResultElement.textContent = '—';
    volumeElement.textContent = '—';
    return;
  }

  const lastRecord = records[0];
  const bestRecord = getBestRecord(records);
  const totalVolume = getTotalVolume(records);

  lastResultElement.textContent = `${lastRecord.weight} кг × ${lastRecord.reps}`;
  bestResultElement.textContent = `${bestRecord.weight} кг × ${bestRecord.reps}`;
  volumeElement.textContent = `${totalVolume} кг`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}