const $ = id => document.getElementById(id);
const won = n => n.toLocaleString("ko-KR") + "원";

// 브라우저마다 고유한 익명 장바구니 ID (로그인 없이 내 장바구니를 구분)
function getSessionId() {
  try {
    let id = localStorage.getItem("cart_session");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("cart_session", id); }
    return id;
  } catch { return "tmp-" + Math.random().toString(36).slice(2, 12); }
}
const SESSION = getSessionId();

async function api(path, options = {}) {
  const res = await fetch(window.API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Session-Id": SESSION, ...(options.headers || {}) }
  });
  if (!res.ok) {
    let msg = res.status + "";
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 1800);
}

function showError(e) {
  const s = $("status"); s.hidden = false; s.className = "status err";
  s.innerHTML = `⚠️ <b>서버에 연결하지 못했습니다.</b><br>백엔드 주소: <code>${window.API_BASE}</code><br><small>${String(e.message).replace(/</g, "&lt;")}</small>`;
}

// ---------- 상품 ----------
async function loadProducts() {
  $("grid").innerHTML = Array(6).fill('<div class="skel"></div>').join("");
  try {
    const products = await api("/products");
    $("status").hidden = true;
    if (!products.length) { $("grid").innerHTML = ""; $("status").hidden = false; $("status").className = "status"; $("status").textContent = "등록된 상품이 아직 없어요."; return; }
    $("grid").innerHTML = products.map(p => `
      <article class="card">
        <div class="thumb">${p.emoji}</div>
        <div class="info">
          <h3></h3><p></p>
          <div class="row"><span class="price">${won(p.price)}</span>
          <button class="add" data-id="${p.id}">담기 +</button></div>
        </div>
      </article>`).join("");
    // 상품명/설명은 textContent로 넣어 XSS 방지
    [...$("grid").children].forEach((el, i) => {
      el.querySelector("h3").textContent = products[i].name;
      el.querySelector("p").textContent = products[i].description;
    });
  } catch (e) { $("grid").innerHTML = ""; showError(e); }
}

$("grid").addEventListener("click", async e => {
  const b = e.target.closest(".add"); if (!b) return;
  b.disabled = true;
  try { renderCart(await api("/cart", { method: "POST", body: JSON.stringify({ product_id: +b.dataset.id, quantity: 1 }) })); toast("🛒 장바구니에 담았어요!"); }
  catch (err) { toast("담기 실패: " + err.message); }
  b.disabled = false;
});

// ---------- 장바구니 ----------
function renderCart(cart) {
  const badge = $("badge");
  badge.textContent = cart.count; badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop");
  $("total").textContent = won(cart.total);
  $("orderBtn").disabled = cart.count === 0;
  const body = $("cartBody");
  if (!cart.items.length) { body.innerHTML = '<div class="empty"><div class="big">🧺</div>장바구니가 비어 있어요.<br>마음에 드는 상품을 담아보세요!</div>'; return; }
  body.innerHTML = cart.items.map(i => `
    <div class="item" data-pid="${i.product.id}">
      <div class="em">${i.product.emoji}</div>
      <div class="nm"><b></b><small>${won(i.product.price)}</small>
        <div class="qty"><button data-act="dec">−</button><span>${i.quantity}</span><button data-act="inc">+</button></div>
      </div>
      <div style="text-align:right"><b>${won(i.product.price * i.quantity)}</b><br><button class="del" data-act="del" aria-label="삭제">🗑</button></div>
    </div>`).join("");
  [...body.children].forEach((el, k) => el.querySelector(".nm b").textContent = cart.items[k].product.name);
}

$("cartBody").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-act]"); if (!btn) return;
  const row = btn.closest(".item"), pid = row.dataset.pid;
  const qty = +row.querySelector(".qty span").textContent;
  try {
    if (btn.dataset.act === "del") renderCart(await api("/cart/" + pid, { method: "DELETE" }));
    else renderCart(await api("/cart/" + pid, { method: "PATCH", body: JSON.stringify({ quantity: btn.dataset.act === "inc" ? Math.min(99, qty + 1) : qty - 1 }) }));
  } catch (err) { toast("실패: " + err.message); }
});

$("clearBtn").onclick = async () => { try { renderCart(await api("/cart", { method: "DELETE" })); } catch (e) { toast("실패: " + e.message); } };
$("orderBtn").onclick = () => toast("🎉 주문 기능은 다음 단계에서 만들어요!");

function openCart(on) {
  $("drawer").classList.toggle("on", on); $("overlay").classList.toggle("on", on);
  $("drawer").setAttribute("aria-hidden", String(!on));
  if (on) api("/cart").then(renderCart).catch(e => toast("불러오기 실패: " + e.message));
}
$("openCart").onclick = () => openCart(true);
$("closeCart").onclick = $("overlay").onclick = () => openCart(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") openCart(false); });

loadProducts();
api("/cart").then(renderCart).catch(() => {});
