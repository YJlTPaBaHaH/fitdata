let analyticsProgressChart = null;

function renderChart(records) {
  const canvas = document.getElementById('progressChart');

  if (!canvas || typeof Chart === 'undefined') return;

  const sortedRecords = [...records].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const labels = sortedRecords.map((record) => {
    return formatRusDate(parseDateKey(record.date));
  });

  const weights = sortedRecords.map((record) => {
    return Number(record.weight);
  });

  if (analyticsProgressChart) {
    analyticsProgressChart.destroy();
  }

  analyticsProgressChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Рабочий вес, кг',
          data: weights,
          borderColor: '#E53935',
          backgroundColor: 'rgba(229, 57, 53, 0.12)',
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#E53935',
          pointHoverBackgroundColor: '#E53935',
          pointHoverBorderColor: '#FFFFFF',
          borderWidth: 4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBorderWidth: 3,
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#424242',
            font: {
              family: 'Montserrat',
              size: 14,
              weight: '600',
            },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: '#424242',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: '#E53935',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => {
              return `Вес: ${context.raw} кг`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            color: '#424242',
            font: {
              family: 'Lato',
              size: 13,
            },
          },
          title: {
            display: true,
            text: 'Вес, кг',
            color: '#424242',
            font: {
              family: 'Montserrat',
              size: 14,
              weight: '600',
            },
          },
          grid: {
            color: 'rgba(66, 66, 66, 0.10)',
          },
          border: {
            color: 'rgba(66, 66, 66, 0.25)',
          },
        },
        x: {
          ticks: {
            color: '#424242',
            font: {
              family: 'Lato',
              size: 13,
            },
          },
          title: {
            display: true,
            text: 'Дата',
            color: '#424242',
            font: {
              family: 'Montserrat',
              size: 14,
              weight: '600',
            },
          },
          grid: {
            color: 'rgba(66, 66, 66, 0.08)',
          },
          border: {
            color: 'rgba(66, 66, 66, 0.25)',
          },
        },
      },
    },
  });
}