const COLORS = ["#dc0d15", "#ffffff", "#00205d"];
const TEXT_ON = {
  "#dc0d15": "#ffffff",
  "#ffffff": "#00205d",
  "#00205d": "#ffffff",
};

const ADMIN_PASSWORD = "hardt";

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");

const adminOpenBtn = document.getElementById("adminOpenBtn");
const adminOverlay = document.getElementById("adminOverlay");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminLogin = document.getElementById("adminLogin");
const adminPassword = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");
const adminDashboard = document.getElementById("adminDashboard");
const adminList = document.getElementById("adminList");
const adminTotal = document.getElementById("adminTotal");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const winOverlay = document.getElementById("winOverlay");
const winCloseBtn = document.getElementById("winCloseBtn");
const winImage = document.getElementById("winImage");
const winName = document.getElementById("winName");
const missOverlay = document.getElementById("missOverlay");
const missCloseBtn = document.getElementById("missCloseBtn");
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

/** @type {{ name: string, quantity: number, color: string, image: string, miss: boolean }[]} */
let gifts = [];
let rotation = 0;
let spinning = false;
let animFrame = 0;
let adminUnlocked = false;
let confettiFrame = 0;
/** @type {{ x: number, y: number, w: number, h: number, vx: number, vy: number, rot: number, vr: number, color: string }[]} */
let confettiPieces = [];

const CONFETTI_COLORS = ["#dc0d15", "#ffffff", "#00205d", "#ff6b70", "#7ea0e0"];

function giftImageSrc(name) {
  return `./${encodeURIComponent(name)}.png`;
}

function displayGiftName(name) {
  return String(name).toLocaleUpperCase("pt-BR");
}

function prizesRemaining() {
  return gifts
    .filter((g) => !g.miss)
    .reduce((sum, g) => sum + Math.max(0, g.quantity), 0);
}

function canSpin() {
  return gifts.some((g) => g.miss || g.quantity > 0);
}

function segmentAngle() {
  return (Math.PI * 2) / gifts.length;
}

function wrapLabelLines(text, maxWidth, fontSize) {
  ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function drawSegmentLabel(text, radius, angle) {
  const maxWidth = radius * 0.52;
  const maxHeight = Math.max(28, radius * Math.sin(angle / 2) * 1.35);
  let fontSize = Math.min(20, Math.floor(maxHeight / 1.8));
  let lines = [text];

  while (fontSize >= 11) {
    lines = wrapLabelLines(text, maxWidth, fontSize);
    const lineHeight = fontSize * 1.15;
    const blockHeight = lines.length * lineHeight;
    const widest = Math.max(
      ...lines.map((line) => {
        ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
        return ctx.measureText(line).width;
      }),
    );
    if (widest <= maxWidth && blockHeight <= maxHeight) break;
    fontSize -= 1;
  }

  ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
  const lineHeight = fontSize * 1.15;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  const textX = radius * 0.62;

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineHeight);
  });
}

function drawWheel() {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;
  const angle = segmentAngle();

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  gifts.forEach((gift, i) => {
    const start = i * angle - Math.PI / 2;
    const end = start + angle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = gift.color;
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 20, 60, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + angle / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT_ON[gift.color] || "#ffffff";
    drawSegmentLabel(displayGiftName(gift.name), radius, angle);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.restore();
}

function syncUi() {
  spinBtn.disabled = spinning || !canSpin();
  if (!canSpin() && !spinning) {
    resultEl.textContent = "Não há mais presentes disponíveis.";
  }
  if (adminUnlocked) renderAdminList();
}

function renderAdminList() {
  adminList.innerHTML = "";
  gifts.forEach((gift, index) => {
    if (gift.miss) return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="admin-gift-name">${displayGiftName(gift.name)}</span>
      <div class="admin-qty-controls">
        <button type="button" data-action="dec" data-index="${index}" aria-label="Diminuir">−</button>
        <input type="number" min="0" step="1" value="${gift.quantity}" data-index="${index}" />
        <button type="button" data-action="inc" data-index="${index}" aria-label="Aumentar">+</button>
      </div>
    `;
    adminList.appendChild(li);
  });
  adminTotal.textContent = `Total restante: ${prizesRemaining()}`;
}

function setQuantity(index, value) {
  const qty = Math.max(0, Math.floor(Number(value)) || 0);
  gifts[index].quantity = qty;
  drawWheel();
  syncUi();
}

function indexAtPointer() {
  const angle = segmentAngle();
  const normalized = ((-rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(normalized / angle) % gifts.length;
}

function pickWinningIndex() {
  const pool = [];
  gifts.forEach((gift, index) => {
    if (gift.miss) {
      for (let n = 0; n < Math.max(1, gift.quantity); n += 1) pool.push(index);
      return;
    }
    for (let n = 0; n < gift.quantity; n += 1) pool.push(index);
  });
  if (pool.length === 0) return -1;
  return pool[Math.floor(Math.random() * pool.length)];
}

function targetRotationForIndex(index) {
  const angle = segmentAngle();
  const centerOffset = index * angle + angle / 2;
  const base = -centerOffset;
  const turns = 5 + Math.floor(Math.random() * 3);
  const current = rotation % (Math.PI * 2);
  let delta = base - current;
  while (delta <= 0) delta += Math.PI * 2;
  return rotation + turns * Math.PI * 2 + delta;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function animateSpin(targetRotation, durationMs, onDone) {
  const start = performance.now();
  const from = rotation;

  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    rotation = from + (targetRotation - from) * easeOutCubic(t);
    drawWheel();
    if (t < 1) {
      animFrame = requestAnimationFrame(frame);
    } else {
      rotation = targetRotation;
      drawWheel();
      onDone();
    }
  }

  cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(frame);
}

function spin() {
  if (spinning) return;
  const winnerIndex = pickWinningIndex();
  if (winnerIndex < 0) {
    syncUi();
    return;
  }

  spinning = true;
  syncUi();
  resultEl.textContent = "Girando…";

  const target = targetRotationForIndex(winnerIndex);
  animateSpin(target, 4200, () => {
    const landed = indexAtPointer();
    let claimed = gifts[landed];

    if (!claimed.miss && claimed.quantity <= 0) {
      claimed = gifts[winnerIndex];
    }

    spinning = false;
    drawWheel();

    if (claimed.miss) {
      resultEl.textContent = "Não foi dessa vez.";
      syncUi();
      showMiss();
      return;
    }

    claimed.quantity = Math.max(0, claimed.quantity - 1);
    resultEl.textContent = `Você ganhou: ${displayGiftName(claimed.name)}!`;
    syncUi();
    showWin(claimed);
  });
}

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function spawnConfetti() {
  confettiPieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.4,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    vx: -3 + Math.random() * 6,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    vr: -0.2 + Math.random() * 0.4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
}

function tickConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.rot += p.vr;
    if (p.y > confettiCanvas.height + 30) {
      p.y = -20;
      p.x = Math.random() * confettiCanvas.width;
      p.vy = 2 + Math.random() * 3;
    }
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });
  confettiFrame = requestAnimationFrame(tickConfetti);
}

function showWin(gift) {
  winName.textContent = displayGiftName(gift.name);
  winImage.alt = displayGiftName(gift.name);
  winImage.src = gift.image;
  winOverlay.hidden = false;
  resizeConfettiCanvas();
  spawnConfetti();
  cancelAnimationFrame(confettiFrame);
  confettiFrame = requestAnimationFrame(tickConfetti);
}

function closeWin() {
  winOverlay.hidden = true;
  cancelAnimationFrame(confettiFrame);
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces = [];
  if (canSpin()) resultEl.textContent = "Pronto para girar.";
}

function showMiss() {
  missOverlay.hidden = false;
}

function closeMiss() {
  missOverlay.hidden = true;
  if (canSpin()) resultEl.textContent = "Pronto para girar.";
}

function openAdmin() {
  adminOverlay.hidden = false;
  adminLoginError.hidden = true;
  if (adminUnlocked) {
    adminLogin.hidden = true;
    adminDashboard.hidden = false;
    renderAdminList();
  } else {
    adminLogin.hidden = false;
    adminDashboard.hidden = true;
    adminPassword.value = "";
    setTimeout(() => adminPassword.focus(), 0);
  }
}

function closeAdmin() {
  adminOverlay.hidden = true;
}

function logoutAdmin() {
  adminUnlocked = false;
  adminLogin.hidden = false;
  adminDashboard.hidden = true;
  adminPassword.value = "";
  adminLoginError.hidden = true;
}

async function loadGifts() {
  const res = await fetch("./gifts.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load gifts.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("gifts.json must be a non-empty array");
  }

  gifts = data.map((item, i) => {
    const name = String(item.name ?? `Presente ${i + 1}`);
    const miss = Boolean(item.miss);
    return {
      name,
      quantity: Math.max(0, Number(item.quantity) || 0),
      color: COLORS[i % COLORS.length],
      image: miss ? "" : giftImageSrc(name),
      miss,
    };
  });

  rotation = 0;
  drawWheel();
  syncUi();
  resultEl.textContent = canSpin() ? "Pronto para girar." : "Não há presentes disponíveis.";
}

spinBtn.addEventListener("click", spin);

winCloseBtn.addEventListener("click", closeWin);
winOverlay.addEventListener("click", (e) => {
  if (e.target === winOverlay) closeWin();
});
missCloseBtn.addEventListener("click", closeMiss);
missOverlay.addEventListener("click", (e) => {
  if (e.target === missOverlay) closeMiss();
});
window.addEventListener("resize", () => {
  if (!winOverlay.hidden) resizeConfettiCanvas();
});

adminOpenBtn.addEventListener("click", openAdmin);
adminCloseBtn.addEventListener("click", closeAdmin);
adminLogoutBtn.addEventListener("click", () => {
  logoutAdmin();
  closeAdmin();
});

adminOverlay.addEventListener("click", (e) => {
  if (e.target === adminOverlay) closeAdmin();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!winOverlay.hidden) {
    closeWin();
    return;
  }
  if (!missOverlay.hidden) {
    closeMiss();
    return;
  }
  if (!adminOverlay.hidden) closeAdmin();
});

adminLogin.addEventListener("submit", (e) => {
  e.preventDefault();
  if (adminPassword.value === ADMIN_PASSWORD) {
    adminUnlocked = true;
    adminLoginError.hidden = true;
    adminLogin.hidden = true;
    adminDashboard.hidden = false;
    renderAdminList();
  } else {
    adminLoginError.hidden = false;
    adminPassword.select();
  }
});

adminList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const index = Number(btn.dataset.index);
  const current = gifts[index].quantity;
  if (btn.dataset.action === "inc") setQuantity(index, current + 1);
  if (btn.dataset.action === "dec") setQuantity(index, current - 1);
});

adminList.addEventListener("change", (e) => {
  const input = e.target.closest("input[data-index]");
  if (!input) return;
  setQuantity(Number(input.dataset.index), input.value);
});

loadGifts().catch((err) => {
  console.error(err);
  resultEl.textContent = "Não foi possível carregar gifts.json.";
  spinBtn.disabled = true;
});
