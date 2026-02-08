/* =========================
   GLOBAL STATE & UTIL
========================= */

let DATA = null;

const rupiah = (n) => {
  if (typeof n !== "number") return n ?? "-";
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const el = (q) => document.querySelector(q);
const els = (q) => [...document.querySelectorAll(q)];

const state = {
  showPrice: true,
  selectedProduct: null,
  selectedPackage: null,
};


/* =========================
   RENDER GRID (KARTU APP)
========================= */

function renderGrid(){
  const grid = el("#grid");
  const q = el("#searchInput").value.trim().toLowerCase();

  const items = DATA.products.filter(p => {
    if(!q) return true;
    return (p.name + " " + (p.tag||"")).toLowerCase().includes(q);
  });

  grid.innerHTML = "";

  items.forEach(p => {
    const prices = p.packages
      .map(x => x.price)
      .filter(x => typeof x === "number");

    const minPrice = prices.length ? Math.min(...prices) : null;

    const card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role","button");
    card.setAttribute("aria-label", "Pilih " + p.name);

    card.innerHTML = `
      <div class="card__top">
        <img class="appicon" src="${p.image}" alt="${p.name}">
        <div style="min-width:0">
          <div class="card__name">${p.name}</div>
          <div class="card__tag">${p.tag ?? ""}</div>
        </div>
      </div>
      <div class="card__bottom">
        <div class="card__min">
          ${state.showPrice && minPrice !== null
            ? `Mulai ${rupiah(minPrice)}`
            : "Klik untuk lihat paket"}
        </div>
        <button class="btn btn--ghost" type="button">Pilih</button>
      </div>
    `;

    const open = () => openModalForProduct(p);

    card.addEventListener("click", open);
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        open();
      }
    });

    card.querySelector("button").addEventListener("click", (e)=>{
      e.preventDefault();
      open();
    });

    grid.appendChild(card);
  });
}


/* =========================
   MODAL & PAKET
========================= */

function openModalForProduct(product){
  state.selectedProduct = product;
  state.selectedPackage = null;

  el("#modalTitle").textContent = "Pilih Paket";
  el("#modalSubtitle").textContent = product.name;

  setStep(1);
  el("#btnToStep2").disabled = true;

  const list = el("#pkgList");
  list.innerHTML = "";

  product.packages.forEach(pkg => {
    const row = document.createElement("div");
    row.className = "pkg";
    row.tabIndex = 0;
    row.setAttribute("role","button");

    const noteText = pkg.note ? pkg.note : "";

    row.innerHTML = `
      <div class="pkg__left">
        <div class="pkg__label">${pkg.label}</div>
        ${noteText
          ? `<div class="pkg__note">${noteText}</div>`
          : `<div class="pkg__note muted">${state.showPrice ? "Klik untuk pilih" : "Klik untuk pilih paket"}</div>`
        }
      </div>
      <div class="pkg__price">
        ${state.showPrice ? rupiah(pkg.price) : "—"}
      </div>
    `;

    const choose = () => {
      state.selectedPackage = pkg;
      els(".pkg").forEach(x => x.classList.remove("pkg--on"));
      row.classList.add("pkg--on");
      el("#btnToStep2").disabled = false;
    };

    row.addEventListener("click", choose);
    row.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        choose();
      }
    });

    list.appendChild(row);
  });

  openModal();
}


/* =========================
   STEP HANDLER
========================= */

function setStep(n){
  el("#step1").classList.toggle("step--active", n===1);
  el("#step2").classList.toggle("step--active", n===2);
  el("#stepDot1").classList.toggle("steps__dot--on", n===1);
  el("#stepDot2").classList.toggle("steps__dot--on", n===2);
}

function openModal(){
  const m = el("#modal");
  m.classList.add("modal--open");
  m.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeModal(){
  const m = el("#modal");
  m.classList.remove("modal--open");
  m.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  state.selectedProduct = null;
  state.selectedPackage = null;
  setStep(1);
}


/* =========================
   WHATSAPP
========================= */


function buildWAMessage(){
  const p = state.selectedProduct;
  const k = state.selectedPackage;

  const email = el("#inputEmail").value.trim();
  const pay = (el("#selectPay")?.value || "QRIS (All Payment)").trim();
  const noteUser = el("#inputNote").value.trim();

  const lines = [
    `Halo admin STY App Prem 🤗,`,
    `Saya mau order`,
    `===================`,
    `App         : ${p.name}`,
    `Paket       : ${k.label}`,
    `Harga       : ${state.showPrice ? rupiah(k.price) : "Tanya admin"}`,
    `Bayar Via   : ${pay}`,
    `📍Note      : TANYAKAN STOCK DAHULU`,
  ];

  if (email) lines.push(`Email       : ${email}`);
  if (noteUser) lines.push(`Catatan     : ${noteUser}`);

  lines.push(
    `===================`,
    ``,
    `Terimakasih, Enjoy ur app.`
  );

  return lines.join("\n");
}

function goToWA(){
  const msg = buildWAMessage();
  const url = `https://wa.me/${DATA.wa_number}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}


/* =========================
   INIT
========================= */

async function init(){
  el("#year").textContent = new Date().getFullYear();

  // Load data (aman untuk file:// di Chrome)
  const embedded = document.getElementById("data-json");
  if (embedded && embedded.textContent.trim()) {
    DATA = JSON.parse(embedded.textContent);
  } else {
    const res = await fetch("data.json", {cache:"no-store"});
    DATA = await res.json();
  }

  el("#searchInput").addEventListener("input", renderGrid);

  el("#toggleShowPrice").addEventListener("change", (e)=>{
    state.showPrice = e.target.checked;
    renderGrid();

    const m = el("#modal");
    if (m && m.classList.contains("modal--open") && state.selectedProduct) {
      openModalForProduct(state.selectedProduct);
    }
  });

  el("#btnQuickWA").addEventListener("click", ()=>{
    const msg = `Halo admin STY App Prem, saya mau tanya stok & harga ya.`;
    window.open(`https://wa.me/${DATA.wa_number}?text=${encodeURIComponent(msg)}`, "_blank");
  });

  els("[data-close='1']").forEach(x => x.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

  el("#btnToStep2").addEventListener("click", ()=>{
    if(!state.selectedProduct || !state.selectedPackage) return;
    setStep(2);
    el("#sumApp").textContent = state.selectedProduct.name;
    el("#sumPkg").textContent = state.selectedPackage.label;
    el("#sumPrice").textContent =
      state.showPrice ? rupiah(state.selectedPackage.price) : "Tanya admin";
  });

  el("#btnBack").addEventListener("click", ()=> setStep(1));
  el("#btnWA").addEventListener("click", goToWA);

  renderGrid();
}

init().catch(err=>{
  console.error(err);
  alert("Gagal memuat data. Coba refresh ya.");
});
