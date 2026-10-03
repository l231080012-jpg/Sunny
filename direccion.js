// Estado de entrega: tipo (domicilio/para_llevar) y dirección seleccionada.
// Se guarda en localStorage para uso inmediato en la UI, y las direcciones
// en sí viven en la base de datos (tabla "addresses") vía /api/direcciones.

function obtenerTipoEntrega() {
  return localStorage.getItem("foodgo_tipo_entrega") || "domicilio";
}

function guardarTipoEntrega(tipo) {
  localStorage.setItem("foodgo_tipo_entrega", tipo);
}

function obtenerDireccionActual() {
  const raw = localStorage.getItem("foodgo_direccion_actual");
  return raw ? JSON.parse(raw) : null;
}

function guardarDireccionActual(direccion) {
  localStorage.setItem("foodgo_direccion_actual", JSON.stringify(direccion));
  actualizarTextoBarra();
}

function inyectarBarraDireccion() {
  if (document.getElementById("delivery-bar")) return;

  const nav = document.querySelector(".navbar");
  if (!nav) return;

  const barra = document.createElement("div");
  barra.className = "delivery-bar";
  barra.id = "delivery-bar";
  barra.innerHTML = `
    <div class="container delivery-bar-inner">
      <div class="delivery-toggle">
        <button class="toggle-option" data-tipo="domicilio">Entrega a domicilio</button>
        <button class="toggle-option" data-tipo="para_llevar">Para llevar</button>
      </div>
      <button class="address-selector" id="address-selector-btn">
        📍 <span id="address-selector-text">Selecciona tu dirección</span>
        <span class="address-dot">·</span>
        <span id="address-selector-time">Ahora</span>
        <span class="chevron">⌄</span>
      </button>
    </div>
  `;
  nav.insertAdjacentElement("afterend", barra);

  document.querySelectorAll("#delivery-bar .toggle-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#delivery-bar .toggle-option").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      guardarTipoEntrega(btn.dataset.tipo);
    });
  });

  const tipoActivo = obtenerTipoEntrega();
  document.querySelector(`#delivery-bar .toggle-option[data-tipo="${tipoActivo}"]`)?.classList.add("active");

  document.getElementById("address-selector-btn").addEventListener("click", abrirModalDirecciones);

  actualizarTextoBarra();
  inyectarModalDirecciones();
}

function actualizarTextoBarra() {
  const textoEl = document.getElementById("address-selector-text");
  if (!textoEl) return;
  const direccion = obtenerDireccionActual();
  const usuario = typeof getUser === "function" ? getUser() : null;
  textoEl.textContent = direccion?.direccion || usuario?.direccion || "Selecciona tu dirección";
}

function inyectarModalDirecciones() {
  if (document.getElementById("address-modal")) return;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "address-overlay";

  const modal = document.createElement("div");
  modal.className = "address-modal";
  modal.id = "address-modal";
  modal.innerHTML = `
    <div class="address-modal-header">
      <h2>Direcciones</h2>
      <button id="address-modal-close">&times;</button>
    </div>
    <div class="address-search">
      <input type="text" id="address-search-input" placeholder="Busca una dirección" />
    </div>
    <button class="address-add-btn" id="address-add-btn" style="display:none;">+ Guardar esta dirección</button>

    <div class="address-section-title">Direcciones guardadas</div>
    <div id="address-list"><div class="state-msg" style="padding:20px;">Cargando...</div></div>

    <div class="address-section-title">Preferencia de horario</div>
    <div class="schedule-row">
      <button class="schedule-option active" id="schedule-ahora">🕐 Entregar ahora</button>
      <button class="schedule-option" id="schedule-programar">Programar</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  overlay.addEventListener("click", cerrarModalDirecciones);
  document.getElementById("address-modal-close").addEventListener("click", cerrarModalDirecciones);

  const inputBusqueda = document.getElementById("address-search-input");
  const botonAgregar = document.getElementById("address-add-btn");

  inputBusqueda.addEventListener("input", () => {
    botonAgregar.style.display = inputBusqueda.value.trim().length > 3 ? "block" : "none";
  });

  botonAgregar.addEventListener("click", async () => {
    const direccion = inputBusqueda.value.trim();
    if (!direccion) return;
    try {
      const nueva = await apiFetch("/direcciones", {
        method: "POST",
        body: JSON.stringify({ etiqueta: "Dirección", direccion }),
      });
      inputBusqueda.value = "";
      botonAgregar.style.display = "none";
      await cargarDireccionesGuardadas();
      seleccionarDireccion(nueva);
      mostrarToast("Dirección guardada");
    } catch (err) {
      mostrarToast(err.message);
    }
  });

  document.getElementById("schedule-programar").addEventListener("click", () => {
    mostrarToast("Programar pedidos para más tarde aún no está disponible");
  });
}

async function abrirModalDirecciones() {
  document.getElementById("address-modal")?.classList.add("open");
  document.getElementById("address-overlay")?.classList.add("open");
  await cargarDireccionesGuardadas();
}

function cerrarModalDirecciones() {
  document.getElementById("address-modal")?.classList.remove("open");
  document.getElementById("address-overlay")?.classList.remove("open");
}

async function cargarDireccionesGuardadas() {
  const lista = document.getElementById("address-list");
  if (!lista) return;

  try {
    const direcciones = await apiFetch("/direcciones/mias");

    if (direcciones.length === 0) {
      lista.innerHTML = `<div class="state-msg" style="padding:16px 0;">Aún no tienes direcciones guardadas. Escribe una arriba y guárdala.</div>`;
      return;
    }

    lista.innerHTML = direcciones
      .map(
        (d) => `
      <div class="address-item" data-id="${d.id}">
        <div class="address-item-info">
          <strong>${d.etiqueta}</strong>
          <span>${d.direccion}</span>
        </div>
        <button class="address-edit-btn" data-id="${d.id}" title="Editar">✏️</button>
      </div>
    `
      )
      .join("");

    lista.querySelectorAll(".address-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".address-edit-btn")) return;
        const id = item.dataset.id;
        const direccion = direcciones.find((d) => String(d.id) === id);
        seleccionarDireccion(direccion);
      });
    });

    lista.querySelectorAll(".address-edit-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const actual = direcciones.find((d) => String(d.id) === id);
        const nuevaDireccion = prompt("Editar dirección:", actual.direccion);
        if (!nuevaDireccion || !nuevaDireccion.trim()) return;

        try {
          const actualizada = await apiFetch(`/direcciones/${id}`, {
            method: "PUT",
            body: JSON.stringify({ direccion: nuevaDireccion.trim() }),
          });
          await cargarDireccionesGuardadas();
          const seleccionada = obtenerDireccionActual();
          if (seleccionada?.id === actualizada.id) seleccionarDireccion(actualizada, false);
          mostrarToast("Dirección actualizada");
        } catch (err) {
          mostrarToast(err.message);
        }
      });
    });
  } catch (err) {
    lista.innerHTML = `<div class="state-msg" style="padding:16px 0;">No se pudieron cargar tus direcciones: ${err.message}</div>`;
  }
}

function seleccionarDireccion(direccion, cerrar = true) {
  guardarDireccionActual(direccion);
  if (cerrar) cerrarModalDirecciones();
}