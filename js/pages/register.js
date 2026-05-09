const registerForm = document.querySelector("form");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector('input[type="email"]').value;
  const password = document.querySelector('input[type="password"]').value;

  try {
    const { response, data } = await registerUser(email, password);

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