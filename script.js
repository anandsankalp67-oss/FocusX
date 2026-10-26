
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  // ---------- STORAGE HELPERS ----------

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The app can still run if storage is unavailable.
    }
  }

  // ---------- THEMES ----------

  const themeSelect = $("#theme-select");
  const validThemes = ["midnight", "light", "forest", "graphite"];

  function applyTheme(theme) {
    if (!validThemes.includes(theme)) theme = "midnight";

    document.body.dataset.theme = theme;
    themeSelect.value = theme;
    writeStorage("focusx-theme", theme);
  }

  applyTheme(readStorage("focusx-theme", "midnight"));

  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });

  // ---------- TIMER ----------

  const timerDisplay = $("#timer-display");
  const timerLabel = $("#timer-label");
  const timerMessage = $("#timer-message");
  const timerCircle = $("#timer-circle");
  const startButton = $("#start-btn");
  const resetButton = $("#reset-btn");
  const modeButtons = document.querySelectorAll(".mode-btn");

  const durations = {
    focus: 25 * 60,
    break: 5 * 60
  };

  const savedTimer = readStorage("focusx-timer", null);

  let currentMode = savedTimer?.mode in durations
    ? savedTimer.mode
    : "focus";

  let remainingSeconds = durations[currentMode];
  let endTime = null;
  let timerInterval = null;
  let isRunning = false;

  function saveTimer() {
    writeStorage("focusx-timer", {
      mode: currentMode,
      remainingSeconds,
      endTime,
      isRunning
    });
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(remainingSeconds);
    timerLabel.textContent =
      currentMode === "focus" ? "FOCUS TIME" : "BREAK TIME";

    const progress = remainingSeconds / durations[currentMode];
    const degrees = Math.max(0, Math.min(360, progress * 360));

    timerCircle.style.background =
      `conic-gradient(var(--accent) ${degrees}deg, var(--track) ${degrees}deg)`;
  }

  function updateStartButton() {
    if (isRunning) {
      startButton.textContent = "Pause";
    } else if (
      remainingSeconds < durations[currentMode] &&
      remainingSeconds > 0
    ) {
      startButton.textContent = "Resume";
    } else {
      startButton.textContent = "Start";
    }
  }

  function stopInterval() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isRunning = false;
  }

  function tickTimer() {
    if (!isRunning || endTime === null) return;

    remainingSeconds = Math.max(
      0,
      Math.ceil((endTime - Date.now()) / 1000)
    );

    if (remainingSeconds <= 0) {
      stopInterval();
      endTime = null;

      if (currentMode === "focus") {
        completedSessions += 1;
        writeStorage("focusx-sessions", completedSessions);
        updateSessionCount();
        timerMessage.textContent =
          "Focus session complete. Take a break!";
      } else {
        timerMessage.textContent =
          "Break complete. Ready to focus?";
      }

      saveTimer();
      updateTimerDisplay();
      updateStartButton();
      return;
    }

    updateTimerDisplay();
    updateStartButton();
    saveTimer();
  }

  function startTimer() {
    if (isRunning) {
      // Pause and save the remaining time.
      remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
      );

      stopInterval();
      endTime = null;
      timerMessage.textContent = "Timer paused.";

      updateTimerDisplay();
      updateStartButton();
      saveTimer();
      return;
    }

    if (remainingSeconds <= 0) {
      remainingSeconds = durations[currentMode];
    }

    isRunning = true;
    endTime = Date.now() + remainingSeconds * 1000;
    timerMessage.textContent = "You're doing great. Keep going!";

    updateStartButton();
    saveTimer();
    tickTimer();

    if (isRunning) {
      timerInterval = setInterval(tickTimer, 250);
    }
  }

  function resetTimer() {
    stopInterval();
    endTime = null;
    remainingSeconds = durations[currentMode];
    timerMessage.textContent = "Ready when you are.";

    updateTimerDisplay();
    updateStartButton();
    saveTimer();
  }

  function selectMode(mode) {
    if (!Object.hasOwn(durations, mode)) return;

    stopInterval();
    endTime = null;
    currentMode = mode;
    remainingSeconds = durations[currentMode];
    timerMessage.textContent = "Ready when you are.";

    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });

    updateTimerDisplay();
    updateStartButton();
    saveTimer();
  }

  startButton.addEventListener("click", startTimer);
  resetButton.addEventListener("click", resetTimer);

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectMode(button.dataset.mode);
    });
  });

  // Restore the timer after a page refresh.
  if (
    savedTimer &&
    savedTimer.mode in durations &&
    Number.isFinite(savedTimer.remainingSeconds)
  ) {
    currentMode = savedTimer.mode;

    if (savedTimer.isRunning && Number.isFinite(savedTimer.endTime)) {
      endTime = savedTimer.endTime;
      remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
      );

      if (remainingSeconds > 0) {
        isRunning = true;
        timerMessage.textContent = "Timer restored. Keep going!";
      } else {
        isRunning = false;
        endTime = null;
        remainingSeconds = 0;
        timerMessage.textContent = "Time's up! Start another session.";
      }
    } else {
      remainingSeconds = Math.max(
        0,
        Math.min(
          durations[currentMode],
          Math.floor(savedTimer.remainingSeconds)
        )
      );
      timerMessage.textContent =
        remainingSeconds < durations[currentMode]
          ? "Timer paused."
          : "Ready when you are.";
    }
  }

  modeButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.mode === currentMode
    );
  });

  let completedSessions =
    readStorage("focusx-sessions", 0);

  function updateSessionCount() {
    $("#session-count").textContent = completedSessions;
  }

  updateSessionCount();
  updateTimerDisplay();
  updateStartButton();

  if (isRunning) {
    tickTimer();

    if (isRunning) {
      timerInterval = setInterval(tickTimer, 250);
    }
  }

  // ---------- TASKS ----------

  const taskForm = $("#task-form");
  const taskInput = $("#task-input");
  const taskList = $("#task-list");
  const emptyMessage = $("#empty-message");

  let tasks = readStorage("focusx-tasks", []);
  if (!Array.isArray(tasks)) tasks = [];

  function saveTasks() {
    writeStorage("focusx-tasks", tasks);
  }

  function updateProgress() {
    const completed = tasks.filter((task) => task.done).length;
    const total = tasks.length;
    const percentage = total === 0
      ? 0
      : Math.round((completed / total) * 100);

    $("#completed-count").textContent = completed;
    $("#task-count").textContent =
      `${total} ${total === 1 ? "task" : "tasks"}`;
    $("#progress-text").textContent = `${percentage}%`;
    $("#progress-fill").style.width = `${percentage}%`;
    emptyMessage.hidden = total > 0;
  }

  function renderTasks() {
    taskList.replaceChildren();

    tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = "task-item";

      if (task.done) item.classList.add("done");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(task.done);
      checkbox.setAttribute("aria-label", `Complete ${task.text}`);

      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-btn";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        tasks = tasks.filter((entry) => entry.id !== task.id);
        saveTasks();
        renderTasks();
      });

      item.append(checkbox, text, deleteButton);
      taskList.appendChild(item);
    });

    updateProgress();
  }

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();
    if (!text) return;

    tasks.push({
      id: `${Date.now()}-${Math.random()}`,
      text,
      done: false
    });

    saveTasks();
    renderTasks();
    taskInput.value = "";
    taskInput.focus();
  });

  renderTasks();
});
