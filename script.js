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
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, Number(value) || 0));
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
  toastTimer = setTimeout(() => toast.classList.remove("toast--visible"), 2600);
}

function getLocalCount() {
  return Number(localStorage.getItem(LOCAL_COUNT_KEY)) || 0;
}

function saveLocalCount(value) {
  localStorage.setItem(LOCAL_COUNT_KEY, String(value));
}

async function fetchCounter(endpoint) {
  const response = await fetch(`${API_BASE}/${endpoint}/${encodeURIComponent(COUNTER_KEY)}`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

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
    statsNote.textContent = "Общий счётчик временно недоступен — показана копия из браузера.";
  }
}

function moveNoButton(event) {
  if (event) event.preventDefault();

  const zoneRect = actionZone.getBoundingClientRect();
  const buttonRect = noButton.getBoundingClientRect();
  const padding = 4;
  const maxX = Math.max(padding, zoneRect.width - buttonRect.width - padding);
  const maxY = Math.max(padding, zoneRect.height - buttonRect.height - padding);

  let nextX = padding + Math.random() * (maxX - padding);
  let nextY = padding + Math.random() * (maxY - padding);

  const yesRect = yesButton.getBoundingClientRect();
  const yesX = yesRect.left - zoneRect.left;
  const yesY = yesRect.top - zoneRect.top;
  const overlapsYes = !(
    nextX + buttonRect.width < yesX - 10 ||
    nextX > yesX + yesRect.width + 10 ||
    nextY + buttonRect.height < yesY - 10 ||
    nextY > yesY + yesRect.height + 10
  );

  if (overlapsYes) {
    nextX = nextX < zoneRect.width / 2 ? maxX : padding;
    nextY = Math.random() > 0.5 ? padding : maxY;
  }

  noButton.style.left = `${nextX}px`;
  noButton.style.top = `${nextY}px`;
  noButton.style.transform = `rotate(${(Math.random() * 10 - 5).toFixed(1)}deg)`;

  const phrases = [
    "Не сегодня 😌",
    "Почти поймал.",
    "Кнопка отказалась.",
    "Попробуй «ДА».",
    "Слишком медленно 😏"
  ];
  hint.textContent = phrases[Math.floor(Math.random() * phrases.length)];
}

function launchConfetti() {
  const colors = ["#ff4f9a", "#ffcc67", "#9d72ff", "#58f5a4", "#ffffff"];

  for (let index = 0; index < 90; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--duration", `${2.4 + Math.random() * 2.3}s`);
    piece.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
    piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 5200);
  }
}

function markAsVoted() {
  localStorage.setItem(VOTED_KEY, "1");
  actionZone.classList.add("action-zone--voted");
  yesButton.disabled = true;
  yesButton.innerHTML = `
    <span>ГОЛОС УЧТЁН</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
  `;
  noButton.hidden = true;
  hint.textContent = "Исторически верное решение принято.";
}

async function submitVote() {
  if (isSubmitting) return;

  if (localStorage.getItem(VOTED_KEY) === "1") {
    showToast("Ты уже голосовал с этого браузера 👀");
    markAsVoted();
    return;
  }

  isSubmitting = true;
  yesButton.disabled = true;
  yesButton.querySelector("span").textContent = "СЧИТАЕМ…";

  try {
    const data = await fetchCounter("hit");
    const count = Number(data.value) || displayedCount + 1;
    saveLocalCount(count);
    renderCount(count);
    setStatus("online", "ОБЩАЯ СТАТА");
    statsNote.textContent = "Счётчик общий для всех посетителей сайта.";
    showToast("Голос засчитан. Чупачупс одобряет 🍭");
  } catch (error) {
    const count = getLocalCount() + 1;
    saveLocalCount(count);
    renderCount(count);
    setStatus("offline", "ЛОКАЛЬНЫЙ РЕЖИМ");
    statsNote.textContent = "Голос сохранён в браузере; общий сервис сейчас недоступен.";
    showToast("Голос сохранён локально — общий счётчик временно недоступен.");
  } finally {
    localStorage.setItem(VOTED_KEY, "1");
    markAsVoted();
    launchConfetti();
    isSubmitting = false;
  }
}

["pointerenter", "pointerdown", "click", "focus"].forEach((eventName) => {
  noButton.addEventListener(eventName, moveNoButton);
});

noButton.addEventListener("contextmenu", moveNoButton);
yesButton.addEventListener("click", submitVote);

window.addEventListener("resize", () => {
  if (!noButton.hidden) {
    noButton.style.left = "calc(50% + 7px)";
    noButton.style.top = "26px";
  }
});

supportRate.textContent = "100%";
loadStats();

if (localStorage.getItem(VOTED_KEY) === "1") {
  markAsVoted();
}
