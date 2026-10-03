// Carrito guardado en localStorage: { restauranteId, restauranteNombre, costoEnvio, items: [{id,nombre,precio,cantidad}] }

function obtenerCarrito() {
  const raw = localStorage.getItem("foodgo_cart");
  return raw ? JSON.parse(raw) : null;
}

function guardarCarrito(carrito) {
  localStorage.setItem("foodgo_cart", JSON.stringify(carrito));
  actualizarContadorCarrito();
}

function vaciarCarrito() {
  localStorage.removeItem("foodgo_cart");
  actualizarContadorCarrito();
}

function agregarAlCarrito(restaurante, item) {
  let carrito = obtenerCarrito();

  // Si el carrito tiene items de otro restaurante, se reinicia (como en apps reales de delivery)
  if (carrito && carrito.restauranteId !== restaurante.id) {
    const confirmar = confirm(
      "Tu carrito tiene platillos de otro restaurante. ¿Deseas vaciarlo y agregar este nuevo platillo?"
    );
    if (!confirmar) return;
    carrito = null;
  }

  if (!carrito) {
    carrito = {
      restauranteId: restaurante.id,
      restauranteNombre: restaurante.nombre,
      costoEnvio: restaurante.costoEnvio,
      items: [],
    };
  }

  const existente = carrito.items.find((i) => i.id === item.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.items.push({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: 1,
    });
  }

  guardarCarrito(carrito);
  mostrarToast(`${item.nombre} agregado al carrito`);
  if (typeof renderCartDrawer === "function") renderCartDrawer();
}

function cambiarCantidad(itemId, delta) {
  const carrito = obtenerCarrito();
  if (!carrito) return;

  const item = carrito.items.find((i) => i.id === itemId);
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito.items = carrito.items.filter((i) => i.id !== itemId);
  }

  if (carrito.items.length === 0) {
    vaciarCarrito();
  } else {
    guardarCarrito(carrito);
  }

  if (typeof renderCartDrawer === "function") renderCartDrawer();
}

function totalItemsCarrito() {
  const carrito = obtenerCarrito();
  if (!carrito) return 0;
  return carrito.items.reduce((acc, i) => acc + i.cantidad, 0);
}

function actualizarContadorCarrito() {
  const el = document.getElementById("cart-count");
  if (el) el.textContent = totalItemsCarrito();
}

// ---------- Drawer del carrito (se inyecta en todas las páginas con navbar) ----------
function inyectarCartDrawer() {
  if (document.getElementById("cart-drawer")) return;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "cart-overlay";

  const drawer = document.createElement("div");
  drawer.className = "cart-drawer";
  drawer.id = "cart-drawer";
  drawer.innerHTML = `
    <div class="cart-drawer-header">
      <h2>Tu pedido</h2>
      <button id="cart-close">&times;</button>
    </div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-summary" id="cart-summary"></div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener("click", cerrarCartDrawer);
  document.getElementById("cart-close").addEventListener("click", cerrarCartDrawer);

  renderCartDrawer();
}

function abrirCartDrawer() {
  document.getElementById("cart-drawer")?.classList.add("open");
  document.getElementById("cart-overlay")?.classList.add("open");
}

function cerrarCartDrawer() {
  document.getElementById("cart-drawer")?.classList.remove("open");
  document.getElementById("cart-overlay")?.classList.remove("open");
}

function renderCartDrawer() {
  const itemsEl = document.getElementById("cart-items");
  const summaryEl = document.getElementById("cart-summary");
  if (!itemsEl || !summaryEl) return;

  const carrito = obtenerCarrito();

  if (!carrito || carrito.items.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">Aún no has agregado platillos.<br>Explora los restaurantes y arma tu pedido.</div>`;
    summaryEl.innerHTML = "";
    actualizarContadorCarrito();
    return;
  }

  itemsEl.innerHTML = `<p style="font-size:11px; color:#8B8677; margin:0 0 10px;">${carrito.restauranteNombre.toUpperCase()}</p>` +
    carrito.items
      .map(
        (i) => `
      <div class="cart-line">
        <div>
          <div>${i.nombre}</div>
          <div class="qty-controls">
            <button onclick="cambiarCantidad('${i.id}', -1)">-</button>
            <span>${i.cantidad}</span>
            <button onclick="cambiarCantidad('${i.id}', 1)">+</button>
          </div>
        </div>
        <div>$${(i.precio * i.cantidad).toFixed(2)}</div>
      </div>
    `
      )
      .join("");

  const subtotal = carrito.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const total = subtotal + carrito.costoEnvio;

  summaryEl.innerHTML = `
    <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="row"><span>Envío</span><span>$${carrito.costoEnvio.toFixed(2)}</span></div>
    <div class="row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <button class="checkout-btn" onclick="window.location.href='checkout.html'">Confirmar pedido</button>
  `;

  actualizarContadorCarrito();
}
