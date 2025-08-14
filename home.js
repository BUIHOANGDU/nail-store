// Firebase init
let db = null;
if (typeof firebase !== "undefined") {
  try {
    db = firebase.firestore();
  } catch (e) {
    console.warn("Firestore không khả dụng:", e);
  }
}

// =================== LOAD COMBOS =====================
if (db) {
  ["highlighted", "top"].forEach(type => {
    db.collection("combos").where("type", "==", type).get()
      .then(snapshot => {
        const container = document.querySelector(type === "highlighted" ? ".combo-list" : ".nail-gallery");
        container.innerHTML = "";
        snapshot.forEach(doc => {
          const data = doc.data();
          const priceText = data.price ? formatPrice(data.price) : "";
          const html = `
            <div class="${type === "highlighted" ? "combo-item" : "nail-item"}">
              <img src="${data.imageUrl}" alt="${data.name}" onclick="showDetail('${data.name}', '${data.desc}', '${data.imageUrl}', '${priceText}')"/>
              <h4>${data.name}</h4>
              ${type === "highlighted" ? `<p>${data.desc}</p>` : ""}
              ${priceText ? `<div class="price">${priceText}</div>` : ""}
              <button class="add-to-cart" onclick="addToCart('${data.name}', '${data.imageUrl}', '${data.price || 0}')">Thêm vào giỏ</button>
            </div>`;
          container.innerHTML += html;
        });
      }).catch(err => {
        console.warn("Không thể load từ Firestore:", err);
        if (type === "highlighted") loadCombosFromJSON();
      });
  });
} else {
  loadCombosFromJSON();
}

function loadCombosFromJSON() {
  fetch('combos.json')
    .then(res => res.json())
    .then(data => {
      const container = document.querySelector(".combo-list");
      container.innerHTML = "";
      data.forEach(combo => {
        const priceText = combo.price ? formatPrice(combo.price) : "";
        const html = `
          <div class="combo-item">
            <img src="${combo.image}" alt="${combo.title}" onclick="showDetail('${combo.title}', '${combo.description}', '${combo.image}', '${priceText}')"/>
            <h4>${combo.title}</h4>
            <p>${combo.description}</p>
            ${priceText ? `<div class="price">${priceText}</div>` : ""}
            <button class="add-to-cart" onclick="addToCart('${combo.title}', '${combo.image}', '${combo.price || 0}')">Thêm vào giỏ</button>
          </div>`;
        container.innerHTML += html;
      });
    });
}

// =================== GIỎc HÀNG =====================
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function addToCart(name, imageUrl, priceText) {
  const price = parseInt((priceText + "").replace(/[^\d]/g, "")) || 0;
  const existing = cart.find(p => p.name === name);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name, imageUrl, price, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartPopup();
  alert(`Đã thêm ${name} vào giỏ hàng!`);
  updateCartCount();
}

function updateCartPopup() {
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  let total = 0;
  itemsEl.innerHTML = "";

  if (cart.length === 0) {
    itemsEl.innerHTML = "<p>Giỏ hàng đang trống.</p>";
  } else {
    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
          <img src="${item.imageUrl}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;" />
          <div style="flex:1;">
            <strong>${item.name}</strong><br>
            SL: ${item.quantity} x ${formatPrice(item.price)}<br>
            <strong>${formatPrice(item.price * item.quantity)}</strong>
          </div>
          <button onclick="removeItem(${index})">❌</button>
        </div>`;
      itemsEl.appendChild(row);
      total += item.price * item.quantity;
    });
  }

  totalEl.textContent = formatPrice(total);
  document.getElementById("cart-popup").style.display = "flex";
}

function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartPopup();
  updateCartCount();
}

function clearCart() {
  cart = [];
  localStorage.removeItem("cart");
  updateCartPopup();
  updateCartCount();
}

function submitOrder() {
  if (cart.length === 0) return alert("Giỏ hàng trống!");

  const orderData = {
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    createdAt: new Date()
  };

  db.collection("orders").add(orderData)
    .then(() => {
      alert("🧾 Đơn hàng đã được gửi đến máy in!");
      clearCart();
      document.getElementById("cart-popup").style.display = "none";
    }).catch(err => {
      console.error("Lỗi gửi đơn:", err);
      alert("Lỗi khi gửi đơn hàng.");
    });
}

function showDetail(name, desc, imageUrl, priceText) {
  const popup = document.getElementById("cart-popup");
  const html = `
    <div style="background:white;padding:20px;border-radius:16px;max-width:400px;margin:auto;text-align:center">
      <h3>${name}</h3>
      <img src="${imageUrl}" style="width:100%;border-radius:12px;object-fit:cover"/>
      <p>${desc}</p>
      <p><strong>${priceText || ""}</strong></p>
      <button class="add-to-cart" onclick="addToCart('${name}', '${imageUrl}', '${priceText || 0}')">
        Thêm vào giỏ
      </button>
      <button class="add-to-cart" style="background:#999;margin-left:10px;" onclick="document.getElementById('cart-popup').style.display='none'">
        Đóng
      </button>
    </div>`;
  popup.innerHTML = html;
  popup.style.display = "flex";
}

function updateCartCount() {
  document.getElementById("cart-count").innerText =
    cart.reduce((sum, p) => sum + (p.quantity || 1), 0);
}

// =================== Định dạng tiền =====================
function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN') + 'VND';
}