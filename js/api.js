// Cambia esta URL si tu backend corre en otro puerto/host
const API_BASE = "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("foodgo_token");
}

function getUser() {
  const raw = localStorage.getItem("foodgo_user");
  return raw ? JSON.parse(raw) : null;
}

function guardarSesion(token, usuario) {
  localStorage.setItem("foodgo_token", token);
  localStorage.setItem("foodgo_user", JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem("foodgo_token");
  localStorage.removeItem("foodgo_user");
  window.location.href = "index.html";
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.mensaje || "Error en la solicitud");
  }
  return data;
}

// ---------- Render de la barra de navegación (usuario / login) ----------
function renderNavUser() {
  const el = document.getElementById("nav-user");
  if (!el) return;
  const usuario = getUser();

  if (usuario) {
    el.innerHTML = `
      <span>Hola, ${usuario.nombre.split(" ")[0]}</span>
      <button id="logout-btn">Salir</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", cerrarSesion);
  } else {
    el.innerHTML = `<a href="index.html" style="color: var(--mango); font-weight:600;">Iniciar sesión</a>`;
  }
}

function exigirSesion() {
  if (!getToken()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function mostrarToast(mensaje) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove("show"), 2500);
}
