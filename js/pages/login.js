const API_URL = "http://127.0.0.1:5000/api";

const loginForm = document.querySelector("form");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector('input[type="email"]').value;
  const password = document.querySelector('input[type="password"]').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    localStorage.setItem("fitdata_user_id", data.user_id);
    localStorage.setItem("fitdata_email", data.email);

    window.location.href = "workouts.html";
  } catch (error) {
    alert("Ошибка подключения к серверу");
    console.error(error);
  }
});