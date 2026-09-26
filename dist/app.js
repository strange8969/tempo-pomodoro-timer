(() => {
  'use strict';

  const STORAGE_KEY = 'tempo-pomodoro-session-v2';
  const LEGACY_STORAGE_KEY = 'tempo-pomodoro-session-v1';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 108;
  const XP_PER_FOCUS = 25;
  const XP_PER_TASK = 10;
  const XP_DAILY_GOAL = 20;
  const DAILY_GOAL = 4;
  const BADGES = [
    { id: 'first-focus', icon: '✦', name: 'First Focus', description: 'Complete your first focus round.', test: ({ totalRounds }) => totalRounds >= 1 },
    { id: 'warm-start', icon: '◒', name: 'Warm Start', description: 'Complete three focus rounds.', test: ({ totalRounds }) => totalRounds >= 3 },
    { id: 'deep-work', icon: '◆', name: 'Deep Work', description: 'Complete five rounds in one day.', test: ({ history }) => Object.values(history).some((entry) => entry.rounds >= 5) },
    { id: 'consistent', icon: '↗', name: 'Consistent', description: 'Reach a seven-day focus streak.', test: ({ streak }) => streak >= 7 },
    { id: 'task-finisher', icon: '✓', name: 'Task Finisher', description: 'Complete ten tasks with the timer.', test: ({ completedTasks }) => completedTasks >= 10 },
    { id: 'centurion', icon: '★', name: 'Centurion', description: 'Complete one hundred focus rounds.', test: ({ totalRounds }) => totalRounds >= 100 },
  ];
  const PRESETS = {
    standard: { workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
    deep: { workMinutes: 50, breakMinutes: 10, longBreakMinutes: 20 },
    sprint: { workMinutes: 15, breakMinutes: 3, longBreakMinutes: 10 },
  };
  const DEFAULTS = {
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoAdvance: false,
    soundOnComplete: true,
    notificationsEnabled: false,
    completedFocus: 0,
    totalFocusSeconds: 0,
    roundsInCycle: 0,
    tasks: [],
    history: {},
    xp: 0,
    badges: [],
    dailyGoal: DAILY_GOAL,
    dailyGoalBonusDates: [],
    celebrationsEnabled: true,
  };

  const elements = {
    timerCard: document.querySelector('#timerCard'),
    topbarStatus: document.querySelector('#topbarStatus'),
    howToButton: document.querySelector('#howToButton'),
    howToDialog: document.querySelector('#howToDialog'),
    howToSheet: document.querySelector('.how-to-sheet'),
    closeHowToButton: document.querySelector('#closeHowToButton'),
    installDialog: document.querySelector('#installDialog'),
    installSheet: document.querySelector('#installDialog .how-to-sheet'),
    closeInstallButton: document.querySelector('#closeInstallButton'),
    focusModeButton: document.querySelector('#focusModeButton'),
    focusModeLabel: document.querySelector('#focusModeLabel'),
    installButton: document.querySelector('#installButton'),
    phaseEyebrow: document.querySelector('#phaseEyebrow'),
    timerHeading: document.querySelector('#timerHeading'),
    currentTask: document.querySelector('#currentTask'),
    currentTaskLabel: document.querySelector('#currentTaskLabel'),
    phaseState: document.querySelector('#phaseState'),
    ringProgress: document.querySelector('#ringProgress'),
    timeValue: document.querySelector('#timeValue'),
    timeLabel: document.querySelector('#timeLabel'),
    completionNote: document.querySelector('#completionNote'),
    rewardToast: document.querySelector('#rewardToast'),
    rewardToastText: document.querySelector('#rewardToastText'),
    startPauseButton: document.querySelector('#startPauseButton'),
    startPauseIcon: document.querySelector('#startPauseIcon'),
    startPauseLabel: document.querySelector('#startPauseLabel'),
    resetButton: document.querySelector('#resetButton'),
    focusPhaseButton: document.querySelector('#focusPhaseButton'),
    breakPhaseButton: document.querySelector('#breakPhaseButton'),
    breakPhaseLabel: document.querySelector('#breakPhaseLabel'),
    focusLengthLabel: document.querySelector('#focusLengthLabel'),
    breakLengthLabel: document.querySelector('#breakLengthLabel'),
    sessionBadge: document.querySelector('#sessionBadge'),
    focusCount: document.querySelector('#focusCount'),
    focusMinutes: document.querySelector('#focusMinutes'),
    sessionTrackFill: document.querySelector('#sessionTrackFill'),
    sessionFootnote: document.querySelector('#sessionFootnote'),
    xpLevel: document.querySelector('#xpLevel'),
    xpLevelLabel: document.querySelector('#xpLevelLabel'),
    xpTotal: document.querySelector('#xpTotal'),
    xpNextLabel: document.querySelector('#xpNextLabel'),
    xpTrack: document.querySelector('#xpTrack'),
    xpTrackFill: document.querySelector('#xpTrackFill'),
    dailyGoalLabel: document.querySelector('#dailyGoalLabel'),
    badgeGallery: document.querySelector('#badgeGallery'),
    badgeFootnote: document.querySelector('#badgeFootnote'),
    historyStreak: document.querySelector('#historyStreak'),
    historyTodayRounds: document.querySelector('#historyTodayRounds'),
    historyTodayMinutes: document.querySelector('#historyTodayMinutes'),
    historyList: document.querySelector('#historyList'),
    taskForm: document.querySelector('#taskForm'),
    taskInput: document.querySelector('#taskInput'),
    taskEstimate: document.querySelector('#taskEstimate'),
    taskList: document.querySelector('#taskList'),
    taskCount: document.querySelector('#taskCount'),
    workMinutes: document.querySelector('#workMinutes'),
    breakMinutes: document.querySelector('#breakMinutes'),
    longBreakMinutes: document.querySelector('#longBreakMinutes'),
    longBreakEveryLabel: document.querySelector('#longBreakEveryLabel'),
    autoAdvanceToggle: document.querySelector('#autoAdvanceToggle'),
    soundToggle: document.querySelector('#soundToggle'),
    celebrationToggle: document.querySelector('#celebrationToggle'),
    notificationToggle: document.querySelector('#notificationToggle'),
    notificationHelp: document.querySelector('#notificationHelp'),
    settingsNote: document.querySelector('#settingsNote'),
    presetButtons: [...document.querySelectorAll('[data-preset]')],
    exportJsonButton: document.querySelector('#exportJsonButton'),
    exportCsvButton: document.querySelector('#exportCsvButton'),
    importJsonButton: document.querySelector('#importJsonButton'),
    importFileInput: document.querySelector('#importFileInput'),
    dataNote: document.querySelector('#dataNote'),
  };

  const loaded = loadSavedState();
  const state = {
    phase: 'focus',
    breakKind: 'short',
    running: false,
    remainingSeconds: loaded.workMinutes * 60,
    endAt: null,
    intervalId: null,
    activeTaskId: loaded.tasks.find((task) => !task.completed)?.id || loaded.tasks[0]?.id || null,
    focusMode: false,
    presetKey: detectPreset(loaded),
    completionNote: `Settle in. Your next ${loaded.workMinutes} minutes are yours.`,
    settingsNote: 'Changes are ready for your next reset.',
    dataNote: 'Back up tasks, settings, and daily history.',
    rewardNotice: '',
    rewardTimeoutId: null,
    ...loaded,
  };

  elements.ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  elements.ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE);

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function safeNotificationEnabled(value) {
    return Boolean(value) && typeof window.Notification !== 'undefined' && window.Notification.permission === 'granted';
  }

  function sanitizeTask(task, index = 0) {
    if (!task || typeof task.text !== 'string') return null;
    const text = task.text.trim().slice(0, 100);
    if (!text) return null;
    const estimate = clampNumber(task.estimate, 1, 20, 1);
    const completedPomodoros = clampNumber(task.completedPomodoros, 0, estimate, 0);
    return {
      id: typeof task.id === 'string' && task.id ? task.id : `task-${Date.now()}-${index}`,
      text,
      estimate,
      completedPomodoros,
      completed: Boolean(task.completed) || completedPomodoros >= estimate,
    };
  }

  function sanitizeHistory(source) {
    const history = {};
    if (!source || typeof source !== 'object') return history;
    Object.entries(source).forEach(([date, entry]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== 'object') return;
      const rounds = clampNumber(entry.rounds ?? entry.focusRounds, 0, 9999, 0);
      const minutes = clampNumber(entry.minutes ?? entry.focusMinutes, 0, 999999, 0);
      if (rounds || minutes) history[date] = { rounds, minutes };
    });
    return history;
  }

  function sanitizeBadges(source) {
    if (!Array.isArray(source)) return [];
    const valid = new Set(BADGES.map((badge) => badge.id));
    return [...new Set(source.filter((badge) => typeof badge === 'string' && valid.has(badge)))];
  }

  function sanitizeGoalDates(source) {
    if (!Array.isArray(source)) return [];
    return [...new Set(source.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(-366);
  }

  function loadSavedState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const saved = JSON.parse(raw);
      const tasks = Array.isArray(saved.tasks)
        ? saved.tasks.map(sanitizeTask).filter(Boolean)
        : [];
      const legacyHistory = sanitizeHistory(saved.history);
      const completedFocus = clampNumber(saved.completedFocus, 0, 999999, DEFAULTS.completedFocus);
      const gamification = saved.gamification && typeof saved.gamification === 'object' ? saved.gamification : saved;
      return {
        workMinutes: clampNumber(saved.workMinutes, 1, 120, DEFAULTS.workMinutes),
        breakMinutes: clampNumber(saved.breakMinutes, 1, 60, DEFAULTS.breakMinutes),
        longBreakMinutes: clampNumber(saved.longBreakMinutes, 1, 90, DEFAULTS.longBreakMinutes),
        longBreakEvery: clampNumber(saved.longBreakEvery, 2, 12, DEFAULTS.longBreakEvery),
        autoAdvance: Boolean(saved.autoAdvance),
        soundOnComplete: saved.soundOnComplete !== false,
        notificationsEnabled: safeNotificationEnabled(saved.notificationsEnabled),
        completedFocus,
        totalFocusSeconds: clampNumber(saved.totalFocusSeconds, 0, 999999999, DEFAULTS.totalFocusSeconds),
        roundsInCycle: clampNumber(saved.roundsInCycle, 0, 12, DEFAULTS.roundsInCycle),
        tasks,
        history: legacyHistory,
        xp: clampNumber(gamification.xp, 0, 999999999, completedFocus * XP_PER_FOCUS),
        badges: sanitizeBadges(gamification.badges),
        dailyGoal: clampNumber(gamification.dailyGoal, 1, 20, DEFAULTS.dailyGoal),
        dailyGoalBonusDates: sanitizeGoalDates(gamification.dailyGoalBonusDates),
        celebrationsEnabled: gamification.celebrationsEnabled !== false,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          workMinutes: state.workMinutes,
          breakMinutes: state.breakMinutes,
          longBreakMinutes: state.longBreakMinutes,
          longBreakEvery: state.longBreakEvery,
          autoAdvance: state.autoAdvance,
          soundOnComplete: state.soundOnComplete,
          notificationsEnabled: state.notificationsEnabled,
          completedFocus: state.completedFocus,
          totalFocusSeconds: state.totalFocusSeconds,
          roundsInCycle: state.roundsInCycle,
          tasks: state.tasks,
          history: state.history,
          gamification: {
            xp: state.xp,
            badges: state.badges,
            dailyGoal: state.dailyGoal,
            dailyGoalBonusDates: state.dailyGoalBonusDates,
            celebrationsEnabled: state.celebrationsEnabled,
          },
        }),
      );
    } catch {
      // Storage is optional; the timer still works when it is unavailable.
    }
  }

  function detectPreset(settings) {
    const matching = Object.entries(PRESETS).find(([, preset]) => (
      preset.workMinutes === settings.workMinutes
      && preset.breakMinutes === settings.breakMinutes
      && preset.longBreakMinutes === settings.longBreakMinutes
    ));
    return matching ? matching[0] : 'custom';
  }

  function durationForPhase(phase = state.phase) {
    if (phase === 'break') return (state.breakKind === 'long' ? state.longBreakMinutes : state.breakMinutes) * 60;
    return state.workMinutes * 60;
  }

  function upcomingBreakIsLong() {
    return state.roundsInCycle >= state.longBreakEvery;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function formatMinutes(seconds) {
    return Math.floor(seconds / 60).toLocaleString('en-US');
  }

  function formatRound(round) {
    return String(Math.min(999, round)).padStart(2, '0');
  }

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateLabel(key) {
    const date = new Date(`${key}T12:00:00`);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  }

  function calculateStreak(history = state.history) {
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const entry = history[dateKey(cursor)];
      if (!entry || entry.rounds < 1) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function levelForXp(xp = state.xp) {
    return Math.floor(Math.max(0, xp) / 100) + 1;
  }

  function xpProgress(xp = state.xp) {
    const level = levelForXp(xp);
    const floor = (level - 1) * 100;
    const next = level * 100;
    return { level, floor, next, progress: Math.min(1, Math.max(0, (xp - floor) / (next - floor))) };
  }

  function getGamificationStats() {
    return {
      totalRounds: state.completedFocus,
      history: state.history,
      streak: calculateStreak(),
      completedTasks: state.tasks.filter((task) => task.completed).length,
    };
  }

  function getUnlockedBadges() {
    const stats = getGamificationStats();
    return BADGES.filter((badge) => badge.test(stats)).map((badge) => badge.id);
  }

  function syncBadges() {
    state.badges = [...new Set([...state.badges, ...getUnlockedBadges()])];
  }

  function currentDailyRounds() {
    return (state.history[dateKey()] || { rounds: 0 }).rounds;
  }

  function stopInterval() {
    if (state.intervalId !== null) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function beginCountdown() {
    stopInterval();
    state.running = true;
    state.endAt = Date.now() + state.remainingSeconds * 1000;
    state.intervalId = window.setInterval(updateTimer, 200);
  }

  function startTimer() {
    if (state.running) return;
    if (state.remainingSeconds <= 0) state.remainingSeconds = durationForPhase();
    primeAudio();
    beginCountdown();
    state.completionNote = state.phase === 'focus'
      ? 'Keep the thread. One thing is enough for this round.'
      : 'Let your eyes soften. The next round will be here soon.';
    state.settingsNote = 'You can change the rhythm after this round.';
    render();
  }

  function pauseTimer() {
    if (!state.running) return;
    updateTimer();
    if (!state.running || state.endAt === null) return;
    state.remainingSeconds = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
    state.running = false;
    state.endAt = null;
    stopInterval();
    state.completionNote = `Paused at ${formatTime(state.remainingSeconds)}. Pick it up when you are ready.`;
    state.settingsNote = 'Changes are ready for your next reset.';
    render();
  }

  function resetTimer() {
    stopInterval();
    state.running = false;
    state.endAt = null;
    state.phase = 'focus';
    state.breakKind = 'short';
    state.remainingSeconds = durationForPhase('focus');
    state.completionNote = `Settle in. Your next ${state.workMinutes} minutes are yours.`;
    state.settingsNote = 'Changes are ready for your next reset.';
    render();
  }

  function updateTimer() {
    if (!state.running || state.endAt === null) return;
    const nextRemaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
    if (nextRemaining !== state.remainingSeconds) {
      state.remainingSeconds = nextRemaining;
      render();
    }
    if (nextRemaining <= 0) completePhase();
  }

  function recordCompletedFocus(minutes) {
    const key = dateKey();
    const entry = state.history[key] || { rounds: 0, minutes: 0 };
    entry.rounds += 1;
    entry.minutes += minutes;
    state.history[key] = entry;
  }

  function advanceActiveTask() {
    const task = state.tasks.find((item) => item.id === state.activeTaskId);
    if (!task || task.completed) return false;
    const wasCompleted = task.completed;
    task.completedPomodoros = Math.min(task.estimate, task.completedPomodoros + 1);
    if (task.completedPomodoros >= task.estimate) task.completed = true;
    return !wasCompleted && task.completed;
  }

  function showRewardNotice(message) {
    if (!state.celebrationsEnabled) return;
    state.rewardNotice = message;
    if (state.rewardTimeoutId !== null) window.clearTimeout(state.rewardTimeoutId);
    state.rewardTimeoutId = window.setTimeout(() => {
      state.rewardNotice = '';
      state.rewardTimeoutId = null;
      render();
    }, 6500);
  }

  function awardFocusXp(taskCompleted) {
    const previousLevel = levelForXp();
    const beforeBadges = new Set(state.badges);
    let gained = XP_PER_FOCUS;
    if (taskCompleted) gained += XP_PER_TASK;
    const today = dateKey();
    const roundsToday = currentDailyRounds();
    if (roundsToday >= state.dailyGoal && !state.dailyGoalBonusDates.includes(today)) {
      state.dailyGoalBonusDates.push(today);
      state.dailyGoalBonusDates = state.dailyGoalBonusDates.slice(-366);
      gained += XP_DAILY_GOAL;
    }
    state.xp = clampNumber(state.xp + gained, 0, 999999999, state.xp);
    syncBadges();
    const newBadges = state.badges.filter((badgeId) => !beforeBadges.has(badgeId));
    const nextLevel = levelForXp();
    const messages = [`+${gained} XP`];
    if (nextLevel > previousLevel) messages.push(`Level ${nextLevel}`);
    if (newBadges.length) {
      const names = newBadges.map((badgeId) => BADGES.find((badge) => badge.id === badgeId)?.name).filter(Boolean);
      messages.push(`Badge unlocked: ${names.join(', ')}`);
    }
    showRewardNotice(messages.join(' · '));
  }

  function completePhase() {
    const finishedPhase = state.phase;
    const finishedWasLongBreak = state.breakKind === 'long';
    stopInterval();
    state.running = false;
    state.endAt = null;

    if (finishedPhase === 'focus') {
      state.completedFocus += 1;
      state.totalFocusSeconds += state.workMinutes * 60;
      state.roundsInCycle += 1;
      recordCompletedFocus(state.workMinutes);
      const taskCompleted = advanceActiveTask();
      awardFocusXp(taskCompleted);
      state.phase = 'break';
      state.breakKind = upcomingBreakIsLong() ? 'long' : 'short';
      state.remainingSeconds = durationForPhase('break');
      state.completionNote = state.breakKind === 'long'
        ? `Four rounds complete. Take a ${state.longBreakMinutes}-minute reset.`
        : 'Focus complete. Take the break you earned.';
    } else {
      if (finishedWasLongBreak) state.roundsInCycle = 0;
      state.phase = 'focus';
      state.breakKind = 'short';
      state.remainingSeconds = durationForPhase('focus');
      state.completionNote = 'Break complete. Your next round is ready.';
    }

    const nextPhaseLabel = state.phase === 'focus' ? 'focus' : (state.breakKind === 'long' ? 'long break' : 'break');
    if (state.soundOnComplete) playCompletionChime();
    sendCompletionNotification(finishedPhase, nextPhaseLabel);
    state.settingsNote = state.autoAdvance ? `Starting ${nextPhaseLabel} automatically.` : 'Changes will shape the next round.';
    if (state.autoAdvance) {
      primeAudio();
      beginCountdown();
    }
    persistState();
    render();
  }

  function setPhase(phase) {
    if (phase !== 'focus' && phase !== 'break') return;
    stopInterval();
    state.running = false;
    state.endAt = null;
    state.phase = phase;
    state.breakKind = phase === 'break' && upcomingBreakIsLong() ? 'long' : 'short';
    state.remainingSeconds = durationForPhase(phase);
    state.completionNote = phase === 'focus'
      ? `Focus is set. Your next ${state.workMinutes} minutes are yours.`
      : `${state.breakKind === 'long' ? 'A longer' : 'A short'} reset is ready when you are.`;
    state.settingsNote = 'Changes are ready for your next reset.';
    render();
  }

  function updateDuration(key, value) {
    const limits = {
      workMinutes: [1, 120],
      breakMinutes: [1, 60],
      longBreakMinutes: [1, 90],
    }[key];
    state[key] = clampNumber(value, limits[0], limits[1], DEFAULTS[key]);
    state.presetKey = detectPreset(state);
    elements[key].value = String(state[key]);
    if (!state.running) {
      state.remainingSeconds = durationForPhase();
      state.completionNote = state.phase === 'focus'
        ? `Settle in. Your next ${state.workMinutes} minutes are yours.`
        : `${state.breakKind === 'long' ? 'A longer' : 'A short'} reset is ready when you are.`;
      state.settingsNote = 'Changes are ready for your next reset.';
    } else {
      state.settingsNote = 'New lengths will shape the next round.';
    }
    persistState();
    render();
  }

  function applyPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    stopInterval();
    state.running = false;
    state.endAt = null;
    state.workMinutes = preset.workMinutes;
    state.breakMinutes = preset.breakMinutes;
    state.longBreakMinutes = preset.longBreakMinutes;
    state.presetKey = key;
    state.phase = 'focus';
    state.breakKind = 'short';
    state.remainingSeconds = durationForPhase('focus');
    state.completionNote = `${key === 'deep' ? 'Deep work' : key === 'sprint' ? 'Quick sprint' : 'Standard'} rhythm is ready.`;
    state.settingsNote = 'Preset applied. Start when you are ready.';
    persistState();
    render();
  }

  function addTask(text, estimate) {
    const cleanText = text.trim().slice(0, 100);
    if (!cleanText) return;
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: cleanText,
      estimate: clampNumber(estimate, 1, 20, 1),
      completedPomodoros: 0,
      completed: false,
    };
    state.tasks.push(task);
    if (!state.activeTaskId) state.activeTaskId = task.id;
    persistState();
    render();
    elements.taskInput.value = '';
    elements.taskEstimate.value = '1';
    elements.taskInput.focus();
  }

  function selectTask(id) {
    if (!state.tasks.some((task) => task.id === id)) return;
    state.activeTaskId = id;
    state.completionNote = 'Your next round has a place to land.';
    persistState();
    render();
  }

  function toggleTask(id, completed) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.completed = completed;
    if (completed) task.completedPomodoros = task.estimate;
    if (!completed && task.completedPomodoros >= task.estimate) task.completedPomodoros = Math.max(0, task.estimate - 1);
    persistState();
    render();
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    if (state.activeTaskId === id) state.activeTaskId = state.tasks.find((task) => !task.completed)?.id || state.tasks[0]?.id || null;
    persistState();
    render();
  }

  function renderTasks() {
    elements.taskList.replaceChildren();
    const completedCount = state.tasks.filter((task) => task.completed).length;
    elements.taskCount.textContent = `${completedCount} / ${state.tasks.length}`;

    state.tasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = `task-item${task.completed ? ' completed' : ''}${task.id === state.activeTaskId ? ' active' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.className = 'task-checkbox';
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark “${task.text}” complete`);
      checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

      const focusButton = document.createElement('button');
      focusButton.className = 'task-select';
      focusButton.type = 'button';
      focusButton.setAttribute('aria-pressed', String(task.id === state.activeTaskId));
      focusButton.setAttribute('aria-label', `Focus on “${task.text}”`);
      focusButton.addEventListener('click', () => selectTask(task.id));

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      const meta = document.createElement('span');
      meta.className = 'task-pomo';
      meta.textContent = `${task.completedPomodoros}/${task.estimate}`;

      const progress = document.createElement('span');
      progress.className = 'task-progress';
      const progressFill = document.createElement('span');
      progressFill.style.width = `${Math.min(100, (task.completedPomodoros / task.estimate) * 100)}%`;
      progress.append(progressFill);

      focusButton.append(text, progress, meta);

      const remove = document.createElement('button');
      remove.className = 'delete-task';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove “${task.text}”`);
      remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.5h6V7M8 10.5v7M12 10.5v7M16 10.5v7M6.5 7l.8 13h9.4l.8-13"></path></svg>';
      remove.addEventListener('click', () => removeTask(task.id));

      item.append(checkbox, focusButton, remove);
      elements.taskList.append(item);
    });
  }

  function renderHistory() {
    const today = state.history[dateKey()] || { rounds: 0, minutes: 0 };
    elements.historyTodayRounds.textContent = `${today.rounds} ${today.rounds === 1 ? 'round' : 'rounds'}`;
    elements.historyTodayMinutes.textContent = `${today.minutes} min`;

    let streak = 0;
    const cursor = new Date();
    while (true) {
      const entry = state.history[dateKey(cursor)];
      if (!entry || entry.rounds < 1) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    elements.historyStreak.textContent = `${streak} ${streak === 1 ? 'day' : 'days'} streak`;

    elements.historyList.replaceChildren();
    const recent = Object.entries(state.history)
      .filter(([key]) => key !== dateKey())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 4);
    if (!recent.length) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = 'Your completed days will show up here.';
      elements.historyList.append(empty);
      return;
    }
    recent.forEach(([key, entry]) => {
      const row = document.createElement('div');
      row.className = 'history-row';
      const day = document.createElement('span');
      day.textContent = dateLabel(key);
      const value = document.createElement('strong');
      value.textContent = `${entry.rounds} ${entry.rounds === 1 ? 'round' : 'rounds'} · ${entry.minutes}m`;
      row.append(day, value);
      elements.historyList.append(row);
    });
  }

  function renderGamification() {
    syncBadges();
    const xp = xpProgress();
    const todayRounds = currentDailyRounds();
    const unlocked = new Set(state.badges);
    elements.xpLevel.textContent = `Lv ${xp.level}`;
    elements.xpLevelLabel.textContent = `Level ${xp.level}`;
    elements.xpTotal.textContent = `${state.xp.toLocaleString('en-US')} XP`;
    elements.xpNextLabel.textContent = `${Math.max(0, xp.next - state.xp)} XP to next level`;
    elements.xpTrackFill.style.width = `${Math.round(xp.progress * 100)}%`;
    elements.xpTrack.setAttribute('aria-valuenow', String(Math.round(xp.progress * 100)));
    elements.xpTrack.setAttribute('aria-valuetext', `${state.xp} of ${xp.next} XP`);
    elements.dailyGoalLabel.textContent = `${Math.min(todayRounds, state.dailyGoal)} / ${state.dailyGoal} rounds`;

    elements.badgeGallery.replaceChildren();
    BADGES.forEach((badge) => {
      const isUnlocked = unlocked.has(badge.id);
      const card = document.createElement('div');
      card.className = `badge-card${isUnlocked ? ' unlocked' : ' locked'}`;
      card.setAttribute('title', badge.description);
      card.setAttribute('aria-label', `${badge.name}: ${isUnlocked ? 'unlocked' : badge.description}`);
      const icon = document.createElement('span');
      icon.className = 'badge-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = isUnlocked ? badge.icon : '·';
      const name = document.createElement('span');
      name.className = 'badge-name';
      name.textContent = badge.name;
      card.append(icon, name);
      elements.badgeGallery.append(card);
    });

    const nextBadge = BADGES.find((badge) => !unlocked.has(badge.id));
    elements.badgeFootnote.textContent = nextBadge
      ? `${nextBadge.name}: ${nextBadge.description}`
      : 'Every badge is yours. Keep building your focus practice.';
  }

  function calculateProgress() {
    const phaseDuration = durationForPhase();
    return Math.min(1, Math.max(0, 1 - state.remainingSeconds / phaseDuration));
  }

  function renderCurrentTask() {
    const task = state.tasks.find((item) => item.id === state.activeTaskId);
    if (!task) {
      elements.currentTaskLabel.textContent = 'No task selected · choose one from your list';
      elements.currentTask.setAttribute('aria-label', 'Choose a task from your task list');
      return;
    }
    elements.currentTaskLabel.textContent = `${task.text} · ${task.completedPomodoros}/${task.estimate} pomodoros`;
    elements.currentTask.setAttribute('aria-label', `Current task: ${task.text}. Choose another task`);
  }

  function renderNotificationState() {
    const supported = typeof window.Notification !== 'undefined';
    elements.notificationToggle.checked = state.notificationsEnabled;
    elements.notificationToggle.disabled = !supported;
    if (!supported) elements.notificationHelp.textContent = 'Not available in this browser';
    else if (window.Notification.permission === 'denied') elements.notificationHelp.textContent = 'Blocked in browser settings';
    else if (state.notificationsEnabled) elements.notificationHelp.textContent = 'Notifications are enabled';
    else elements.notificationHelp.textContent = 'Alert me when a phase ends';
  }

  function render() {
    const progress = calculateProgress();
    const isBreak = state.phase === 'break';
    const displayBreakIsLong = isBreak ? state.breakKind === 'long' : upcomingBreakIsLong();
    const nextRound = state.completedFocus + 1;
    const phaseDuration = durationForPhase();
    const statusText = state.running ? 'In progress' : (state.remainingSeconds < phaseDuration ? 'Paused' : 'Ready');
    const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);

    elements.timerCard.classList.toggle('break-mode', isBreak);
    elements.timerCard.classList.toggle('running', state.running);
    elements.topbarStatus.textContent = isBreak ? (state.breakKind === 'long' ? 'Long break' : 'Break mode') : 'Focus mode';
    elements.phaseEyebrow.textContent = isBreak
      ? (state.breakKind === 'long' ? 'Long break · recharge' : 'Break · between rounds')
      : `Focus · round ${formatRound(nextRound)}`;
    elements.timerHeading.textContent = isBreak ? (state.breakKind === 'long' ? 'Recharge' : 'Take a breath') : 'Deep work';
    elements.phaseState.textContent = statusText;
    elements.timeValue.textContent = formatTime(state.remainingSeconds);
    elements.timeLabel.textContent = isBreak
      ? (state.running ? 'a softer pace for a few minutes' : 'time to reset before the next round')
      : (state.running ? 'stay with the next small thing' : 'to make space for focus');
    elements.completionNote.textContent = state.completionNote;
    elements.startPauseLabel.textContent = state.running
      ? `Pause ${isBreak ? (state.breakKind === 'long' ? 'long break' : 'break') : 'focus'}`
      : `Start ${isBreak ? (state.breakKind === 'long' ? 'long break' : 'break') : 'focus'}`;
    elements.startPauseIcon.setAttribute('d', state.running ? 'M7 5.5v13M17 5.5v13' : 'M8 5.5 18 12 8 18.5Z');
    elements.ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    elements.ringProgress.setAttribute('aria-valuenow', String(Math.round(progress * 100)));

    elements.focusPhaseButton.classList.toggle('active', !isBreak);
    elements.breakPhaseButton.classList.toggle('active', isBreak);
    elements.focusPhaseButton.setAttribute('aria-pressed', String(!isBreak));
    elements.breakPhaseButton.setAttribute('aria-pressed', String(isBreak));
    elements.breakPhaseLabel.textContent = displayBreakIsLong ? 'Long break' : 'Break';
    elements.focusLengthLabel.textContent = `${state.workMinutes}m`;
    elements.breakLengthLabel.textContent = `${String(displayBreakIsLong ? state.longBreakMinutes : state.breakMinutes).padStart(2, '0')}m`;

    elements.sessionBadge.textContent = formatRound(nextRound);
    elements.focusCount.textContent = state.completedFocus.toLocaleString('en-US');
    elements.focusMinutes.textContent = formatMinutes(state.totalFocusSeconds);
    elements.sessionTrackFill.style.width = `${Math.round((isBreak ? 1 : progress) * 100)}%`;
    elements.sessionFootnote.textContent = getSessionFootnote(isBreak);
    elements.currentTask.classList.toggle('has-task', Boolean(activeTask));
    renderCurrentTask();
    elements.rewardToast.hidden = !state.rewardNotice;
    elements.rewardToastText.textContent = state.rewardNotice;

    elements.workMinutes.value = String(state.workMinutes);
    elements.breakMinutes.value = String(state.breakMinutes);
    elements.longBreakMinutes.value = String(state.longBreakMinutes);
    elements.longBreakEveryLabel.textContent = String(state.longBreakEvery);
    elements.autoAdvanceToggle.checked = state.autoAdvance;
    elements.soundToggle.checked = state.soundOnComplete;
    elements.celebrationToggle.checked = state.celebrationsEnabled;
    elements.settingsNote.textContent = state.settingsNote;
    elements.dataNote.textContent = state.dataNote;
    elements.presetButtons.forEach((button) => button.classList.toggle('active', button.dataset.preset === state.presetKey));
    renderNotificationState();
    renderTasks();
    renderHistory();
    renderGamification();
  }

  function getSessionFootnote(isBreak) {
    if (isBreak && state.breakKind === 'long') return `Round ${state.completedFocus} is complete. Take the longer reset.`;
    if (isBreak) return `Round ${state.completedFocus} is complete. Give your eyes a softer minute.`;
    if (state.completedFocus === 0) return 'Your first round is ready when you are.';
    if (state.running) return `${state.completedFocus} round${state.completedFocus === 1 ? '' : 's'} logged. Keep the thread.`;
    return `Round ${state.completedFocus + 1} is ready when you are.`;
  }

  let audioContext = null;

  function primeAudio() {
    if (!state.soundOnComplete) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext = audioContext || new AudioContextClass();
      if (audioContext.state === 'suspended') audioContext.resume();
    } catch {
      audioContext = null;
    }
  }

  function playCompletionChime() {
    if (!audioContext) return;
    try {
      const now = audioContext.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.14);
        gain.gain.setValueAtTime(0.0001, now + index * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.08, now + index * 0.14 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.42);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now + index * 0.14);
        oscillator.stop(now + index * 0.14 + 0.45);
      });
    } catch {
      // A blocked audio context should never interrupt the timer.
    }
  }

  function sendCompletionNotification(finishedPhase, nextPhaseLabel) {
    if (!state.notificationsEnabled || typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') return;
    try {
      const title = finishedPhase === 'focus' ? 'Focus round complete' : 'Break complete';
      const body = finishedPhase === 'focus' ? `Take a break. ${nextPhaseLabel} is ready when you are.` : 'Your next focus round is ready.';
      const notification = new window.Notification(title, { body, icon: 'icon-192.png', tag: 'tempo-phase-complete' });
      notification.onclick = () => window.focus();
    } catch {
      // A notification failure should never interrupt the timer.
    }
  }

  async function toggleNotifications() {
    if (!elements.notificationToggle.checked) {
      state.notificationsEnabled = false;
      state.settingsNote = 'Browser notifications are off.';
      persistState();
      render();
      return;
    }
    if (typeof window.Notification === 'undefined') {
      state.notificationsEnabled = false;
      state.dataNote = 'Notifications are not supported in this browser.';
      render();
      return;
    }
    try {
      const permission = window.Notification.permission === 'default'
        ? await window.Notification.requestPermission()
        : window.Notification.permission;
      state.notificationsEnabled = permission === 'granted';
      state.settingsNote = state.notificationsEnabled
        ? 'You will get a gentle alert when a phase ends.'
        : 'Allow notifications in browser settings to turn this on.';
      persistState();
      render();
    } catch {
      state.notificationsEnabled = false;
      render();
    }
  }

  function snapshot() {
    return {
      format: 'tempo-pomodoro-backup',
      version: 3,
      exportedAt: new Date().toISOString(),
      settings: {
        workMinutes: state.workMinutes,
        breakMinutes: state.breakMinutes,
        longBreakMinutes: state.longBreakMinutes,
        longBreakEvery: state.longBreakEvery,
        autoAdvance: state.autoAdvance,
        soundOnComplete: state.soundOnComplete,
        notificationsEnabled: state.notificationsEnabled,
      },
      stats: {
        completedFocus: state.completedFocus,
        totalFocusSeconds: state.totalFocusSeconds,
        roundsInCycle: state.roundsInCycle,
      },
      gamification: {
        xp: state.xp,
        level: levelForXp(),
        badges: state.badges,
        dailyGoal: state.dailyGoal,
        dailyGoalBonusDates: state.dailyGoalBonusDates,
        celebrationsEnabled: state.celebrationsEnabled,
      },
      tasks: state.tasks,
      history: state.history,
    };
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    downloadFile(`tempo-backup-${dateKey()}.json`, JSON.stringify(snapshot(), null, 2), 'application/json');
    state.dataNote = 'JSON backup downloaded.';
    render();
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const rows = [['record_type', 'date', 'rounds', 'focus_minutes', 'task', 'estimate', 'completed_pomodoros', 'completed', 'xp', 'level', 'badge', 'daily_goal', 'celebrations_enabled']];
    Object.entries(state.history).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, entry]) => {
      rows.push(['history', date, entry.rounds, entry.minutes, '', '', '', '']);
    });
    state.tasks.forEach((task) => {
      rows.push(['task', '', '', '', task.text, task.estimate, task.completedPomodoros, task.completed ? 'yes' : 'no']);
    });
    rows.push(['gamification', '', '', '', '', '', '', '', state.xp, levelForXp(), '', state.dailyGoal, state.celebrationsEnabled ? 'yes' : 'no']);
    downloadFile(`tempo-backup-${dateKey()}.csv`, rows.map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
    state.dataNote = 'CSV backup downloaded.';
    render();
  }

  function parseCsvLine(line) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"' && quoted) {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        cells.push(cell);
        cell = '';
      } else {
        cell += character;
      }
    }
    cells.push(cell);
    return cells;
  }

  function parseCsvSnapshot(content) {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new Error('The CSV backup is empty.');
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(parseCsvLine);
    const history = {};
    const tasks = [];
    let gamification = null;
    rows.forEach((row) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
      if (record.record_type === 'history' && record.date) {
        history[record.date] = {
          rounds: clampNumber(record.rounds, 0, 9999, 0),
          minutes: clampNumber(record.focus_minutes, 0, 999999, 0),
        };
      }
      if (record.record_type === 'task' && record.task) {
        tasks.push({
          text: record.task,
          estimate: record.estimate,
          completedPomodoros: record.completed_pomodoros,
          completed: record.completed === 'yes',
        });
      }
      if (record.record_type === 'gamification') {
        gamification = {
          xp: record.xp,
          dailyGoal: record.daily_goal,
          celebrationsEnabled: record.celebrations_enabled === 'yes',
        };
      }
    });
    return { tasks, history, gamification };
  }

  function importSnapshot(data) {
    if (!data || typeof data !== 'object') throw new Error('The backup is not an object.');
    const settings = data.settings && typeof data.settings === 'object' ? data.settings : data;
    const stats = data.stats && typeof data.stats === 'object' ? data.stats : data;
    const gamification = data.gamification && typeof data.gamification === 'object' ? data.gamification : data;
    const tasks = Array.isArray(data.tasks) ? data.tasks.map(sanitizeTask).filter(Boolean) : [];
    const history = sanitizeHistory(data.history);
    state.workMinutes = clampNumber(settings.workMinutes, 1, 120, state.workMinutes);
    state.breakMinutes = clampNumber(settings.breakMinutes, 1, 60, state.breakMinutes);
    state.longBreakMinutes = clampNumber(settings.longBreakMinutes, 1, 90, state.longBreakMinutes);
    state.longBreakEvery = clampNumber(settings.longBreakEvery, 2, 12, state.longBreakEvery);
    state.autoAdvance = Boolean(settings.autoAdvance);
    state.soundOnComplete = settings.soundOnComplete !== false;
    state.notificationsEnabled = safeNotificationEnabled(settings.notificationsEnabled);
    state.completedFocus = clampNumber(stats.completedFocus, 0, 999999, Object.values(history).reduce((sum, item) => sum + item.rounds, 0));
    state.totalFocusSeconds = clampNumber(stats.totalFocusSeconds, 0, 999999999, Object.values(history).reduce((sum, item) => sum + item.minutes * 60, 0));
    state.roundsInCycle = clampNumber(stats.roundsInCycle, 0, 12, state.completedFocus % state.longBreakEvery);
    state.xp = clampNumber(gamification.xp, 0, 999999999, state.completedFocus * XP_PER_FOCUS);
    state.badges = sanitizeBadges(gamification.badges);
    state.dailyGoal = clampNumber(gamification.dailyGoal, 1, 20, DAILY_GOAL);
    state.dailyGoalBonusDates = sanitizeGoalDates(gamification.dailyGoalBonusDates);
    state.celebrationsEnabled = gamification.celebrationsEnabled !== false;
    state.tasks = tasks;
    state.history = history;
    state.activeTaskId = tasks.find((task) => !task.completed)?.id || tasks[0]?.id || null;
    state.presetKey = detectPreset(state);
    resetTimer();
    state.dataNote = 'Backup imported successfully.';
    persistState();
    render();
  }

  function initPwa() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    let deferredPrompt = null;

    const isStandalone = () => (
      window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    );

    const syncInstallButton = () => {
      elements.installButton.hidden = isStandalone();
      elements.installButton.setAttribute('aria-expanded', 'false');
    };

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      elements.installButton.hidden = false;
      elements.installButton.dataset.installReady = 'true';
    });
    elements.installButton.addEventListener('click', async () => {
      if (isStandalone()) return;
      if (!deferredPrompt) {
        openInstallHelp();
        return;
      }
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          state.settingsNote = 'Tempo is ready to open from your app launcher.';
          closeInstallHelp();
        } else {
          state.settingsNote = 'You can install Tempo whenever you are ready.';
        }
      } catch {
        openInstallHelp();
      }
      deferredPrompt = null;
      delete elements.installButton.dataset.installReady;
      syncInstallButton();
      render();
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      delete elements.installButton.dataset.installReady;
      closeInstallHelp();
      elements.installButton.hidden = true;
      state.settingsNote = 'Tempo is installed and ready in your app launcher.';
      render();
    });
    syncInstallButton();
  }

  let howToTrigger = null;
  let installTrigger = null;

  function closeHowTo() {
    elements.howToDialog.hidden = true;
    document.body.classList.remove('how-to-open');
    elements.howToButton.setAttribute('aria-expanded', 'false');
    if (howToTrigger && typeof howToTrigger.focus === 'function') howToTrigger.focus();
    howToTrigger = null;
  }

  function openHowTo() {
    howToTrigger = document.activeElement;
    elements.howToDialog.hidden = false;
    document.body.classList.add('how-to-open');
    elements.howToButton.setAttribute('aria-expanded', 'true');
    elements.closeHowToButton.focus();
  }

  function closeInstallHelp() {
    if (!elements.installDialog) return;
    elements.installDialog.hidden = true;
    document.body.classList.remove('install-help-open');
    elements.installButton.setAttribute('aria-expanded', 'false');
    if (installTrigger && typeof installTrigger.focus === 'function') installTrigger.focus();
    installTrigger = null;
  }

  function openInstallHelp() {
    if (!elements.installDialog) return;
    installTrigger = document.activeElement;
    elements.installDialog.hidden = false;
    document.body.classList.add('install-help-open');
    elements.installButton.setAttribute('aria-expanded', 'true');
    elements.closeInstallButton.focus();
  }

  elements.startPauseButton.addEventListener('click', () => {
    if (state.running) pauseTimer();
    else startTimer();
  });
  elements.resetButton.addEventListener('click', resetTimer);
  elements.focusPhaseButton.addEventListener('click', () => setPhase('focus'));
  elements.breakPhaseButton.addEventListener('click', () => setPhase('break'));
  elements.currentTask.addEventListener('click', () => elements.taskInput.focus());

  elements.taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(elements.taskInput.value, elements.taskEstimate.value);
  });

  elements.workMinutes.addEventListener('change', () => updateDuration('workMinutes', elements.workMinutes.value));
  elements.breakMinutes.addEventListener('change', () => updateDuration('breakMinutes', elements.breakMinutes.value));
  elements.longBreakMinutes.addEventListener('change', () => updateDuration('longBreakMinutes', elements.longBreakMinutes.value));
  elements.autoAdvanceToggle.addEventListener('change', () => {
    state.autoAdvance = elements.autoAdvanceToggle.checked;
    state.settingsNote = state.autoAdvance ? 'The next phase will start at zero.' : 'You will choose when the next phase begins.';
    persistState();
    render();
  });
  elements.soundToggle.addEventListener('change', () => {
    state.soundOnComplete = elements.soundToggle.checked;
    if (state.soundOnComplete) primeAudio();
    persistState();
    render();
  });
  elements.celebrationToggle.addEventListener('change', () => {
    state.celebrationsEnabled = elements.celebrationToggle.checked;
    if (!state.celebrationsEnabled) state.rewardNotice = '';
    state.settingsNote = state.celebrationsEnabled
      ? 'Round rewards will appear after focus completes.'
      : 'XP is still tracked quietly in the background.';
    persistState();
    render();
  });
  elements.notificationToggle.addEventListener('change', toggleNotifications);
  elements.presetButtons.forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));

  elements.exportJsonButton.addEventListener('click', exportJson);
  elements.exportCsvButton.addEventListener('click', exportCsv);
  elements.importJsonButton.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput.addEventListener('change', async () => {
    const file = elements.importFileInput.files?.[0];
    if (!file) return;
    try {
      const contents = await file.text();
      const imported = file.name.toLowerCase().endsWith('.csv')
        ? parseCsvSnapshot(contents)
        : JSON.parse(contents);
      importSnapshot(imported);
    } catch {
      state.dataNote = 'That file could not be imported. Choose a Tempo JSON backup.';
      render();
    }
    elements.importFileInput.value = '';
  });

  elements.focusModeButton.addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle('focus-only', state.focusMode);
    elements.focusModeButton.setAttribute('aria-pressed', String(state.focusMode));
    elements.focusModeButton.setAttribute('aria-label', state.focusMode ? 'Exit focus mode' : 'Focus mode');
    elements.focusModeLabel.textContent = state.focusMode ? 'Exit focus mode' : 'Focus mode';
    elements.focusModeButton.blur();
  });

  elements.howToButton.addEventListener('click', openHowTo);
  elements.closeHowToButton.addEventListener('click', closeHowTo);
  elements.howToDialog.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeHowTo === 'true') closeHowTo();
  });
  elements.closeInstallButton.addEventListener('click', closeInstallHelp);
  elements.installDialog.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeInstall === 'true') closeInstallHelp();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.howToDialog.hidden) {
      event.preventDefault();
      closeHowTo();
      return;
    }
    if (event.key === 'Escape' && !elements.installDialog.hidden) {
      event.preventDefault();
      closeInstallHelp();
      return;
    }
    const target = event.target;
    const isTyping = target instanceof HTMLElement && (
      target.matches('input, textarea, select, button, a') || target.isContentEditable
    );
    if (isTyping) return;
    if (event.code === 'Space') {
      event.preventDefault();
      if (state.running) pauseTimer();
      else startTimer();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      resetTimer();
    } else if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      elements.taskInput.focus();
    }
  });

  initPwa();
  render();
})();
