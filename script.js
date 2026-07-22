"use strict";

// Общий публичный счётчик. Измени ключ, если захочешь начать статистику с нуля.
const COUNTER_KEY = "setaem-chupachupsu-polovinu-rep-votes-v1-2026-7f3c9a";
const API_BASE = "https://countapi.mileshilliard.com/api/v1";
const LOCAL_COUNT_KEY = `${COUNTER_KEY}:fallback-count`;
const VOTED_KEY = `${COUNTER_KEY}:voted`;

const yesButton = document.querySelector("#yes-button");
const noButton = document.querySelector("#no-button");
const actionZone = document.querySelector("#action-zone");
const voteCount = document.querySelector("#vote-count");
const supportRate = document.querySelector("#support-rate");
const progressBar = document.querySelector("#progress-bar");
const statsNote = document.querySelector("#stats-note");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const toast = document.querySelector("#toast");
const confettiLayer = document.querySelector("#confetti-layer");

let displayedCount = 0;
let toastTimer;
let isSubmitting = false;

function setStatus(mode, text) {
  status.className = `status status--${mode}`;
  status.innerHTML = `<i></i> ${text}`;
}

function formatCount(value) {
  return new Intl.NumberFormat("ru-RU").format(
    Math.max(0, Number(value) || 0)
  );
}

function renderCount(value, animate = true) {
  const target = Math.max(0, Number(value) || 0);

  if (!animate || target === displayedCount) {
    displayedCount = target;
    voteCount.textContent = formatCount(target);
    progressBar.style.width = target > 0 ? "100%" : "0%";
    return;
  }

  const start = displayedCount;
  const difference = target - start;
  const duration = 650;
  const startedAt = performance.now();

  function step(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + difference * eased);

    voteCount.textContent = formatCount(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      displayedCount = target;
    }
  }

  requestAnimationFrame(step);
  progressBar.style.width = target > 0 ? "100%" : "0%";
}

function showToast(message) {
  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.classList.add("toast--visible");

  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, 2600);
}

function getLocalCount() {
  return Number(localStorage.getItem(LOCAL_COUNT_KEY)) || 0;
}

function saveLocalCount(value) {
  localStorage.setItem(LOCAL_COUNT_KEY, String(value));
}

async function fetchCounter(endpoint) {
  const response = await fetch(
    `${API_BASE}/${endpoint}/${encodeURIComponent(COUNTER_KEY)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const error = new Error(`Counter API: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function loadStats() {
  setStatus("loading", "ОБНОВЛЯЕТСЯ");

  try {
    const data = await fetchCounter("get");
    const count = Number(data.value) || 0;

    saveLocalCount(count);
    renderCount(count, false);

    setStatus("online", "ОБЩАЯ СТАТА");
    statsNote.textContent = "Счётчик общий для всех посетителей сайта.";
  } catch (error) {
    if (error.status === 404) {
      renderCount(0, false);

      setStatus("online", "ОБЩАЯ СТАТА");
      statsNote.textContent = "Голосование только началось. Будь первым.";
      return;
    }

    renderCount(getLocalCount(), false);

    setStatus("offline", "ЛОКАЛЬНЫЙ РЕЖИМ");
    statsNote.textContent =
      "Общий счётчик временно недоступен — показана копия из браузера.";
  }
}

const noPhrases = [
  "Не сегодня 😌",
  "Почти поймал.",
  "Кнопка отказалась.",
  "Попробуй «ДА».",
  "Слишком медленно 😏"
];

let lastPointer = null;
let escapeInterval = null;
let escapeUntil = 0;
let lastEscapeMove = 0;
let escapeMoveCount = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionOverlapsYes(
  x,
  y,
  buttonWidth,
  buttonHeight,
  zoneRect
) {
  const yesRect = yesButton.getBoundingClientRect();
  const yesX = yesRect.left - zoneRect.left;
  const yesY = yesRect.top - zoneRect.top;
  const safeGap = 18;

  return !(
    x + buttonWidth < yesX - safeGap ||
    x > yesX + yesRect.width + safeGap ||
    y + buttonHeight < yesY - safeGap ||
    y > yesY + yesRect.height + safeGap
  );
}

function chooseEscapePosition(pointer) {
  const zoneRect = actionZone.getBoundingClientRect();
  const buttonRect = noButton.getBoundingClientRect();

  const padding = 6;
  const maxX = Math.max(
    padding,
    zoneRect.width - buttonRect.width - padding
  );
  const maxY = Math.max(
    padding,
    zoneRect.height - buttonRect.height - padding
  );

  const currentX = buttonRect.left - zoneRect.left;
  const currentY = buttonRect.top - zoneRect.top;

  let best = null;
  let bestScore = -Infinity;

  // Проверяем много случайных позиций и выбираем ту,
  // которая дальше всего от курсора и текущей позиции.
  for (let attempt = 0; attempt < 34; attempt += 1) {
    const x =
      padding + Math.random() * Math.max(1, maxX - padding);
    const y =
      padding + Math.random() * Math.max(1, maxY - padding);

    if (
      positionOverlapsYes(
        x,
        y,
        buttonRect.width,
        buttonRect.height,
        zoneRect
      )
    ) {
      continue;
    }

    const centerX =
      zoneRect.left + x + buttonRect.width / 2;
    const centerY =
      zoneRect.top + y + buttonRect.height / 2;

    const pointerDistance = pointer
      ? Math.hypot(centerX - pointer.x, centerY - pointer.y)
      : 0;

    const movementDistance = Math.hypot(
      x - currentX,
      y - currentY
    );

    const edgeBonus =
      Math.min(x, maxX - x, y, maxY - y) * 0.08;

    const score =
      pointerDistance * 1.8 +
      movementDistance -
      edgeBonus;

    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }

  // Запасной вариант для узких экранов.
  if (!best) {
    best = {
      x: currentX < zoneRect.width / 2 ? maxX : padding,
      y: currentY < zoneRect.height / 2 ? maxY : padding
    };
  }

  return best;
}

function updateNoHint() {
  // Меняем подпись не при каждом прыжке,
  // чтобы текст можно было успеть прочитать.
  if (escapeMoveCount % 3 !== 1) {
    return;
  }

  hint.textContent =
    noPhrases[Math.floor(Math.random() * noPhrases.length)];
}

function moveNoButton(eventOrPointer) {
  if (noButton.hidden) {
    return;
  }

  const now = performance.now();

  if (now - lastEscapeMove < 42) {
    return;
  }

  lastEscapeMove = now;

  let pointer = lastPointer;

  if (
    eventOrPointer &&
    Number.isFinite(eventOrPointer.clientX)
  ) {
    pointer = {
      x: eventOrPointer.clientX,
      y: eventOrPointer.clientY
    };
  } else if (
    eventOrPointer &&
    Number.isFinite(eventOrPointer.x)
  ) {
    pointer = eventOrPointer;
  }

  const next = chooseEscapePosition(pointer);

  noButton.style.left = `${next.x}px`;
  noButton.style.top = `${next.y}px`;

  noButton.style.transform =
    `rotate(${(Math.random() * 18 - 9).toFixed(1)}deg) ` +
    `scale(${(0.94 + Math.random() * 0.1).toFixed(2)})`;

  escapeMoveCount += 1;
  updateNoHint();
}

function stopEscapeBurst() {
  if (escapeInterval) {
    clearInterval(escapeInterval);
    escapeInterval = null;
  }
}

function startEscapeBurst(duration = 2800) {
  escapeUntil = Math.max(
    escapeUntil,
    performance.now() + duration
  );

  if (escapeInterval) {
    return;
  }

  moveNoButton(lastPointer);

  escapeInterval = setInterval(() => {
    if (
      performance.now() >= escapeUntil ||
      noButton.hidden
    ) {
      stopEscapeBurst();
      return;
    }

    moveNoButton(lastPointer);
  }, 82);
}

function distanceFromPointerToButton(pointerEvent) {
  const rect = noButton.getBoundingClientRect();

  const nearestX = clamp(
    pointerEvent.clientX,
    rect.left,
    rect.right
  );

  const nearestY = clamp(
    pointerEvent.clientY,
    rect.top,
    rect.bottom
  );

  return Math.hypot(
    pointerEvent.clientX - nearestX,
    pointerEvent.clientY - nearestY
  );
}

function handlePointerChase(event) {
  if (
    noButton.hidden ||
    event.pointerType === "touch"
  ) {
    return;
  }

  lastPointer = {
    x: event.clientX,
    y: event.clientY
  };

  // Кнопка начинает убегать ещё до наведения курсора.
  if (distanceFromPointerToButton(event) < 185) {
    startEscapeBurst(1500);
    moveNoButton(event);
  }
}

function rejectNoAttempt(event) {
  event.preventDefault();
  event.stopPropagation();

  lastPointer = Number.isFinite(event.clientX)
    ? {
        x: event.clientX,
        y: event.clientY
      }
    : lastPointer;

  startEscapeBurst(3600);
  moveNoButton(event);
}

function launchConfetti() {
  const colors = [
    "#ff4f9a",
    "#ffcc67",
    "#9d72ff",
    "#58f5a4",
    "#ffffff"
  ];

  for (let index = 0; index < 90; index += 1) {
    const piece = document.createElement("span");

    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;

    piece.style.background =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.setProperty(
      "--duration",
      `${2.4 + Math.random() * 2.3}s`
    );

    piece.style.setProperty(
      "--drift",
      `${-120 + Math.random() * 240}px`
    );

    piece.style.setProperty(
      "--spin",
      `${360 + Math.random() * 900}deg`
    );

    piece.style.animationDelay =
      `${Math.random() * 0.45}s`;

    piece.style.transform =
      `rotate(${Math.random() * 180}deg)`;

    confettiLayer.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, 5200);
  }
}

function markAsVoted() {
  localStorage.setItem(VOTED_KEY, "1");

  actionZone.classList.add("action-zone--voted");

  yesButton.disabled = true;
  yesButton.innerHTML = `
    <span>ГОЛОС УЧТЁН</span>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  `;

  noButton.hidden = true;

  hint.textContent =
    "Исторически верное решение принято.";
}

async function submitVote() {
  if (isSubmitting) {
    return;
  }

  if (localStorage.getItem(VOTED_KEY) === "1") {
    showToast("Ты уже голосовал с этого браузера 👀");
    markAsVoted();
    return;
  }

  isSubmitting = true;
  yesButton.disabled = true;

  yesButton.querySelector("span").textContent =
    "СЧИТАЕМ…";

  try {
    const data = await fetchCounter("hit");

    const count =
      Number(data.value) || displayedCount + 1;

    saveLocalCount(count);
    renderCount(count);

    setStatus("online", "ОБЩАЯ СТАТА");

    statsNote.textContent =
      "Счётчик общий для всех посетителей сайта.";

    showToast(
      "Голос засчитан. Чупачупс одобряет 🍭"
    );
  } catch (error) {
    const count = getLocalCount() + 1;

    saveLocalCount(count);
    renderCount(count);

    setStatus("offline", "ЛОКАЛЬНЫЙ РЕЖИМ");

    statsNote.textContent =
      "Голос сохранён в браузере; общий сервис сейчас недоступен.";

    showToast(
      "Голос сохранён локально — общий счётчик временно недоступен."
    );
  } finally {
    localStorage.setItem(VOTED_KEY, "1");

    markAsVoted();
    launchConfetti();

    isSubmitting = false;
  }
}

document.addEventListener(
  "pointermove",
  handlePointerChase,
  { passive: true }
);

[
  "pointerenter",
  "pointerdown",
  "mousedown",
  "touchstart",
  "click",
  "focus",
  "contextmenu"
].forEach((eventName) => {
  noButton.addEventListener(
    eventName,
    rejectNoAttempt,
    { passive: false }
  );
});

yesButton.addEventListener("click", submitVote);

window.addEventListener("resize", () => {
  if (!noButton.hidden) {
    stopEscapeBurst();

    noButton.style.left = "calc(50% + 7px)";
    noButton.style.top = "50px";
  }
});

supportRate.textContent = "100%";

loadStats();

if (localStorage.getItem(VOTED_KEY) === "1") {
  markAsVoted();
}
