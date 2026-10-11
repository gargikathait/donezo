(function () {
  "use strict";

  var KEYS = {
    tasks: "donezo.tasks",
    journal: "donezo.journal",
    moods: "donezo.moods",
    reminders: "donezo.reminders",
    theme: "donezo.theme",
    stickers: "donezo.stickers",
    wins: "donezo.wins",
    thoughtIndex: "donezo.thoughtIndex",
  };

  var CATEGORIES = ["personal", "study", "work", "selfcare"];
  var PRIORITIES = ["gentle", "normal", "high"];
  var MOODS = [
    { id: "happy", label: "Happy ♡" },
    { id: "calm", label: "Calm ☁" },
    { id: "excited", label: "Excited ✧" },
    { id: "tired", label: "Tired 💤" },
    { id: "sad", label: "Sad 🌧" },
    { id: "motivated", label: "Motivated 🌷" },
  ];
  var AFFIRMATIONS = [
    "you showed up today, and that counts.",
    "one little thing at a time ♡",
    "a tiny step is still a step ✿",
    "soft progress is still progress.",
    "your little corner of the internet is proud of you.",
    "be gentle. you are growing.",
  ];
  var THOUGHTS = [
    "What made you smile today?",
    "What is something you are proud of?",
    "What do you want to remember about today?",
    "What are you looking forward to?",
    "What was the sweetest part of your day?",
    "Who would you like to thank, even quietly?",
  ];
  var STICKER_SET = [
    { id: "heart", glyph: "♡" },
    { id: "bow", glyph: "🎀" },
    { id: "star", glyph: "★" },
    { id: "flower", glyph: "✿" },
    { id: "sparkle", glyph: "✦" },
    { id: "moon", glyph: "☾" },
    { id: "berry", glyph: "🍓" },
    { id: "cloud", glyph: "☁" },
  ];

  var tasks = [];
  var journal = [];
  var moods = {};
  var reminders = [];
  var wins = [];
  var stickers = {};
  var currentFilter = "all";
  var editingJournalId = null;
  var selectedMood = "";
  var thoughtIndex = 0;
  var playlist = [];
  var trackIndex = 0;
  var objectUrls = [];
  var confirmCallback = null;
  var celebrateOnce = false;

  var audio = new Audio();
  audio.preload = "metadata";

  function createId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function todayKey() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast("Couldn't save just now. Storage may be full or blocked.");
    }
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function showToast(message) {
    var root = qs("toasts");
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    root.append(toast);
    setTimeout(function () {
      toast.remove();
    }, 3200);
  }

  function askConfirm(message, onYes) {
    var dialog = qs("confirm-dialog");
    qs("confirm-message").textContent = message;
    confirmCallback = onYes;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (window.confirm(message)) {
      onYes();
    }
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    var whole = Math.floor(seconds);
    var m = Math.floor(whole / 60);
    var s = String(whole % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function dailyIndex(listLength) {
    var key = todayKey();
    var total = 0;
    for (var i = 0; i < key.length; i += 1) {
      total += key.charCodeAt(i);
    }
    return total % listLength;
  }

  /* Theme */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch (error) {}
    var isDark = theme === "dark";
    var toggle = qs("theme-toggle");
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    qs("theme-toggle-label").textContent = isDark ? "Light mode" : "Dark mode";
    toggle.querySelector(".theme-toggle-icon").textContent = isDark ? "☀" : "☽";
  }

  /* Header copy */
  function renderHeader() {
    var hour = new Date().getHours();
    var hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    qs("greeting").textContent = hello + " ♡";
    qs("today-date").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    qs("affirmation").textContent = AFFIRMATIONS[dailyIndex(AFFIRMATIONS.length)];
    qs("journal-date").value = qs("journal-date").value || todayKey();
    qs("reminder-date").value = qs("reminder-date").value || todayKey();
  }

  function renderThought() {
    qs("daily-thought").textContent = THOUGHTS[thoughtIndex % THOUGHTS.length];
    qs("journal-prompt").textContent = THOUGHTS[thoughtIndex % THOUGHTS.length];
  }

  /* Tasks */
  function normalizeTask(item) {
    if (!item || typeof item !== "object" || typeof item.text !== "string" || !item.text.trim()) {
      return null;
    }
    return {
      id: typeof item.id === "string" ? item.id : createId(),
      text: item.text.trim(),
      completed: Boolean(item.completed),
      category: CATEGORIES.indexOf(item.category) >= 0 ? item.category : "personal",
      priority: PRIORITIES.indexOf(item.priority) >= 0 ? item.priority : "normal",
      due: typeof item.due === "string" ? item.due : "",
    };
  }

  function loadTasks() {
    var parsed = loadJson(KEYS.tasks, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeTask).filter(Boolean);
  }

  function saveTasks() {
    saveJson(KEYS.tasks, tasks);
  }

  function getVisibleTasks() {
    if (currentFilter === "active") {
      return tasks.filter(function (task) { return !task.completed; });
    }
    if (currentFilter === "completed") {
      return tasks.filter(function (task) { return task.completed; });
    }
    return tasks.slice();
  }

  function dueStatus(task) {
    if (!task.due || task.completed) {
      return "";
    }
    if (task.due < todayKey()) {
      return "overdue";
    }
    if (task.due === todayKey()) {
      return "upcoming";
    }
    return "upcoming";
  }

  function updateStats() {
    var total = tasks.length;
    var completed = tasks.filter(function (task) { return task.completed; }).length;
    var remaining = total - completed;
    var percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    qs("stat-total").textContent = String(total);
    qs("stat-completed").textContent = String(completed);
    qs("stat-remaining").textContent = String(remaining);
    qs("progress-fill").style.width = percent + "%";
    qs("progress-bar").setAttribute("aria-valuenow", String(percent));
    qs("progress-label").textContent = percent + "% complete";
    qs("clear-completed").hidden = completed === 0;
    if (total > 0 && remaining === 0 && !celebrateOnce) {
      celebrateOnce = true;
      document.body.classList.add("is-celebrating");
      showToast("every little thing, done. you did it ♡");
      setTimeout(function () {
        document.body.classList.remove("is-celebrating");
      }, 1800);
    }
    if (remaining > 0) {
      celebrateOnce = false;
    }
  }

  function renderTasks() {
    var list = qs("task-list");
    var visible = getVisibleTasks();
    list.replaceChildren();
    visible.forEach(function (task) {
      var item = document.createElement("li");
      var status = dueStatus(task);
      item.className = "task-item" + (task.completed ? " is-complete" : "");
      item.dataset.id = task.id;

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", "Mark \"" + task.text + "\" as " + (task.completed ? "active" : "complete"));

      var copy = document.createElement("div");
      copy.className = "task-copy";
      var name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.text;
      var meta = document.createElement("div");
      meta.className = "task-meta";
      var cat = document.createElement("span");
      cat.className = "pill";
      cat.textContent = task.category;
      meta.append(cat);
      if (task.priority === "high") {
        var pr = document.createElement("span");
        pr.className = "pill high";
        pr.textContent = "important";
        meta.append(pr);
      }
      if (status) {
        var due = document.createElement("span");
        due.className = "pill " + status;
        due.textContent = status === "overdue" ? "overdue" : "due " + task.due;
        meta.append(due);
      }
      copy.append(name, meta);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn";
      del.setAttribute("aria-label", "Delete \"" + task.text + "\"");
      del.textContent = "✕";

      item.append(checkbox, copy, del);
      list.append(item);
    });

    var empty = qs("empty-state");
    if (visible.length) {
      empty.hidden = true;
    } else {
      empty.hidden = false;
      if (!tasks.length) {
        qs("empty-message").textContent = "No tasks yet. Plant one little thing above.";
      } else if (currentFilter === "active") {
        qs("empty-message").textContent = "Nothing left to do. Enjoy the quiet ♡";
      } else if (currentFilter === "completed") {
        qs("empty-message").textContent = "No completed tasks yet. Check something off.";
      } else {
        qs("empty-message").textContent = "No tasks to show.";
      }
    }
    updateStats();
    fillReminderTaskSelect();
  }

  function addTask(text, category, priority, due) {
    var trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    tasks.unshift({
      id: createId(),
      text: trimmed,
      completed: false,
      category: CATEGORIES.indexOf(category) >= 0 ? category : "personal",
      priority: PRIORITIES.indexOf(priority) >= 0 ? priority : "normal",
      due: due || "",
    });
    saveTasks();
    renderTasks();
    showToast("added to today's little list ♡");
  }

  /* Journal */
  function loadJournal() {
    var parsed = loadJson(KEYS.journal, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(function (entry) {
      return entry && typeof entry.title === "string" && typeof entry.body === "string" && typeof entry.date === "string";
    }).map(function (entry) {
      return {
        id: typeof entry.id === "string" ? entry.id : createId(),
        title: entry.title.trim(),
        body: entry.body,
        date: entry.date,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
      };
    }).filter(function (entry) {
      return entry.title && entry.body.trim();
    });
  }

  function saveJournal() {
    saveJson(KEYS.journal, journal);
  }

  function renderJournal() {
    var archive = qs("journal-archive");
    archive.replaceChildren();
    var sorted = journal.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    sorted.forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "archive-item";
      var info = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = entry.title;
      var date = document.createElement("div");
      date.className = "hint";
      date.textContent = entry.date;
      info.append(title, date);
      var actions = document.createElement("div");
      actions.className = "archive-open";
      var openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "text-btn";
      openBtn.dataset.action = "open";
      openBtn.dataset.id = entry.id;
      openBtn.textContent = "Open";
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "text-btn";
      delBtn.dataset.action = "delete";
      delBtn.dataset.id = entry.id;
      delBtn.textContent = "Delete";
      actions.append(openBtn, delBtn);
      item.append(info, actions);
      archive.append(item);
    });
    qs("journal-empty").hidden = journal.length > 0;
    qs("editing-flag").hidden = !editingJournalId;
  }

  function resetJournalForm() {
    editingJournalId = null;
    qs("journal-form").reset();
    qs("journal-date").value = todayKey();
    qs("editing-flag").hidden = true;
  }

  function openJournal(id) {
    var entry = journal.find(function (item) { return item.id === id; });
    if (!entry) {
      return;
    }
    editingJournalId = entry.id;
    qs("journal-title").value = entry.title;
    qs("journal-date").value = entry.date;
    qs("journal-body").value = entry.body;
    qs("editing-flag").hidden = false;
    qs("journal-title").focus();
  }

  function saveJournalEntry() {
    var title = qs("journal-title").value.trim();
    var date = qs("journal-date").value;
    var body = qs("journal-body").value.trim();
    if (!title || !date || !body) {
      showToast("Give this page a title, date, and a few words.");
      return;
    }
    if (editingJournalId) {
      var existing = journal.find(function (item) { return item.id === editingJournalId; });
      if (existing) {
        existing.title = title;
        existing.date = date;
        existing.body = body;
        existing.updatedAt = new Date().toISOString();
      }
      showToast("diary page updated.");
    } else {
      journal.unshift({
        id: createId(),
        title: title,
        date: date,
        body: body,
        updatedAt: new Date().toISOString(),
      });
      editingJournalId = journal[0].id;
      showToast("saved in your pink diary ♡");
    }
    saveJournal();
    renderJournal();
    qs("editing-flag").hidden = false;
  }

  /* Mood */
  function loadMoods() {
    var parsed = loadJson(KEYS.moods, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }

  function renderMood() {
    var grid = qs("mood-grid");
    grid.replaceChildren();
    var today = moods[todayKey()] || null;
    if (!selectedMood && today && today.id) {
      selectedMood = today.id;
    }
    MOODS.forEach(function (mood) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mood-btn" + (selectedMood === mood.id ? " is-selected" : "");
      btn.dataset.id = mood.id;
      btn.textContent = mood.label;
      grid.append(btn);
    });
    if (today) {
      var found = MOODS.find(function (mood) { return mood.id === today.id; });
      qs("current-mood").textContent = found ? "Today: " + found.label : "How are you feeling?";
      qs("mood-note").value = today.note || "";
    } else {
      qs("current-mood").textContent = "How are you feeling?";
    }
  }

  function saveMood() {
    if (!selectedMood) {
      showToast("Pick a mood first.");
      return;
    }
    moods[todayKey()] = {
      id: selectedMood,
      note: qs("mood-note").value.trim(),
    };
    saveJson(KEYS.moods, moods);
    renderMood();
    showToast("mood tucked into today.");
  }

  /* Reminders */
  function loadReminders() {
    var parsed = loadJson(KEYS.reminders, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(function (item) {
      return item && typeof item.title === "string" && typeof item.when === "string";
    }).map(function (item) {
      return {
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title.trim(),
        when: item.when,
        taskId: typeof item.taskId === "string" ? item.taskId : "",
        status: item.status === "done" || item.status === "dismissed" ? item.status : "open",
        notified: Boolean(item.notified),
      };
    }).filter(function (item) {
      return item.title && !Number.isNaN(Date.parse(item.when));
    });
  }

  function saveReminders() {
    saveJson(KEYS.reminders, reminders);
  }

  function fillReminderTaskSelect() {
    var select = qs("reminder-task");
    var current = select.value;
    select.replaceChildren();
    var none = document.createElement("option");
    none.value = "";
    none.textContent = "None";
    select.append(none);
    tasks.forEach(function (task) {
      var option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.text.slice(0, 40);
      select.append(option);
    });
    select.value = current;
  }

  function renderReminders() {
    var list = qs("reminder-list");
    list.replaceChildren();
    var now = Date.now();
    var sorted = reminders.slice().sort(function (a, b) {
      return Date.parse(a.when) - Date.parse(b.when);
    });
    sorted.forEach(function (item) {
      var li = document.createElement("li");
      var due = Date.parse(item.when);
      var overdue = item.status === "open" && due <= now;
      li.className = "reminder-item" + (overdue ? " is-overdue" : "") + (item.status !== "open" ? " is-done" : "");
      var info = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = item.title;
      var meta = document.createElement("div");
      meta.className = "hint";
      var whenLabel = new Date(item.when).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      var linked = tasks.find(function (task) { return task.id === item.taskId; });
      meta.textContent = whenLabel + (overdue ? " · overdue" : "") + (item.status !== "open" ? " · " + item.status : "") + (linked ? " · " + linked.text : "");
      info.append(title, meta);
      var actions = document.createElement("div");
      actions.className = "reminder-actions";
      if (item.status === "open") {
        var done = document.createElement("button");
        done.type = "button";
        done.className = "text-btn";
        done.dataset.action = "done";
        done.dataset.id = item.id;
        done.textContent = "Done";
        var dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.className = "text-btn";
        dismiss.dataset.action = "dismiss";
        dismiss.dataset.id = item.id;
        dismiss.textContent = "Snooze away";
        actions.append(done, dismiss);
      }
      var del = document.createElement("button");
      del.type = "button";
      del.className = "text-btn";
      del.dataset.action = "delete";
      del.dataset.id = item.id;
      del.textContent = "Delete";
      actions.append(del);
      li.append(info, actions);
      list.append(li);
    });
    qs("reminder-empty").hidden = reminders.length > 0;
  }

  function maybeNotifyReminders() {
    var now = Date.now();
    var changed = false;
    reminders.forEach(function (item) {
      if (item.status !== "open" || item.notified) {
        return;
      }
      var due = Date.parse(item.when);
      if (Number.isNaN(due) || due > now) {
        return;
      }
      item.notified = true;
      changed = true;
      showToast("Reminder: " + item.title);
      if (typeof Notification === "function" && Notification.permission === "granted") {
        try {
          new Notification("Donezo reminder", { body: item.title });
        } catch (error) {
          // Notification may be blocked outside a secure context.
        }
      }
    });
    if (changed) {
      saveReminders();
      renderReminders();
    }
  }

  /* Music */
  function revokeUrls() {
    objectUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    objectUrls = [];
  }

  function currentTrack() {
    return playlist[trackIndex] || null;
  }

  function setPlayingUi(playing) {
    qs("vinyl").classList.toggle("is-playing", playing);
    qs("vinyl").closest(".vinyl-stage").classList.toggle("is-on", playing);
    qs("play-pause").textContent = playing ? "❚❚" : "▶";
    qs("play-pause").setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function renderTrack() {
    var track = currentTrack();
    var has = Boolean(track);
    qs("play-pause").disabled = !has;
    qs("prev-track").disabled = playlist.length < 2;
    qs("next-track").disabled = playlist.length < 2;
    qs("seek").disabled = !has;
    if (!has) {
      qs("track-title").textContent = "choose a song for today's little soundtrack ♡";
      qs("track-meta").textContent = "no track yet — files stay on your computer";
      qs("time-elapsed").textContent = "0:00";
      qs("time-total").textContent = "0:00";
      qs("seek").value = "0";
      qs("seek").max = "0";
      setPlayingUi(false);
      return;
    }
    qs("track-title").textContent = track.title;
    qs("track-meta").textContent = track.artist;
  }

  function loadTrack(index, autoplay) {
    if (!playlist.length) {
      audio.removeAttribute("src");
      renderTrack();
      return;
    }
    trackIndex = (index + playlist.length) % playlist.length;
    audio.src = playlist[trackIndex].url;
    renderTrack();
    if (autoplay) {
      audio.play().catch(function () {
        setPlayingUi(false);
        showToast("Couldn't play that file. Try another audio format.");
      });
    }
  }

  /* Wins */
  function loadWins() {
    var parsed = loadJson(KEYS.wins, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(function (item) {
      return item && typeof item.text === "string" && item.text.trim() && item.date === todayKey();
    }).map(function (item) {
      return {
        id: typeof item.id === "string" ? item.id : createId(),
        text: item.text.trim(),
        date: todayKey(),
      };
    });
  }

  function renderWins() {
    var list = qs("wins-list");
    list.replaceChildren();
    wins.forEach(function (win) {
      var li = document.createElement("li");
      li.className = "win-item";
      var text = document.createElement("span");
      text.textContent = "✧ " + win.text;
      var del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn";
      del.dataset.id = win.id;
      del.setAttribute("aria-label", "Remove win");
      del.textContent = "✕";
      li.append(text, del);
      list.append(li);
    });
    qs("wins-empty").hidden = wins.length > 0;
  }

  /* Stickers */
  function loadStickers() {
    var parsed = loadJson(KEYS.stickers, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }

  function renderStickers() {
    var palette = qs("sticker-palette");
    var board = qs("sticker-board");
    palette.replaceChildren();
    board.replaceChildren();
    STICKER_SET.forEach(function (sticker) {
      var on = Boolean(stickers[sticker.id]);
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "sticker-chip" + (on ? " is-on" : "");
      chip.dataset.id = sticker.id;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      chip.textContent = sticker.glyph;
      chip.setAttribute("aria-label", "Toggle sticker " + sticker.id);
      palette.append(chip);
      if (on) {
        var pin = document.createElement("span");
        pin.className = "sticker-on-board";
        pin.textContent = sticker.glyph;
        pin.setAttribute("aria-hidden", "true");
        board.append(pin);
      }
    });
  }

  /* Events */
  qs("theme-toggle").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  qs("task-form").addEventListener("submit", function (event) {
    event.preventDefault();
    addTask(
      qs("task-input").value,
      qs("task-category").value,
      qs("task-priority").value,
      qs("task-due").value
    );
    qs("task-input").value = "";
    qs("task-input").focus();
  });

  qs("task-list").addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }
    var item = target.closest(".task-item");
    if (!item) {
      return;
    }
    var task = tasks.find(function (row) { return row.id === item.dataset.id; });
    if (!task) {
      return;
    }
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  });

  qs("task-list").addEventListener("click", function (event) {
    var button = event.target.closest(".icon-btn");
    if (!button) {
      return;
    }
    var item = button.closest(".task-item");
    if (!item) {
      return;
    }
    tasks = tasks.filter(function (task) { return task.id !== item.dataset.id; });
    saveTasks();
    renderTasks();
  });

  document.querySelectorAll(".filter").forEach(function (button) {
    button.addEventListener("click", function () {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".filter").forEach(function (other) {
        var active = other.dataset.filter === currentFilter;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderTasks();
    });
  });

  qs("clear-completed").addEventListener("click", function () {
    tasks = tasks.filter(function (task) { return !task.completed; });
    saveTasks();
    renderTasks();
  });

  qs("journal-form").addEventListener("submit", function (event) {
    event.preventDefault();
    saveJournalEntry();
  });

  qs("journal-new").addEventListener("click", resetJournalForm);

  qs("journal-archive").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) {
      return;
    }
    var id = button.dataset.id;
    if (button.dataset.action === "open") {
      openJournal(id);
    }
    if (button.dataset.action === "delete") {
      askConfirm("Delete this diary page? This cannot be undone.", function () {
        journal = journal.filter(function (entry) { return entry.id !== id; });
        if (editingJournalId === id) {
          resetJournalForm();
        }
        saveJournal();
        renderJournal();
        showToast("page tucked away.");
      });
    }
  });

  qs("shuffle-prompt").addEventListener("click", function () {
    thoughtIndex = (thoughtIndex + 1) % THOUGHTS.length;
    saveJson(KEYS.thoughtIndex, thoughtIndex);
    renderThought();
  });

  qs("shuffle-thought").addEventListener("click", function () {
    thoughtIndex = (thoughtIndex + 1) % THOUGHTS.length;
    saveJson(KEYS.thoughtIndex, thoughtIndex);
    renderThought();
  });

  qs("mood-grid").addEventListener("click", function (event) {
    var button = event.target.closest(".mood-btn");
    if (!button) {
      return;
    }
    selectedMood = button.dataset.id;
    renderMood();
  });

  qs("mood-save").addEventListener("click", saveMood);

  qs("reminder-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var title = qs("reminder-title").value.trim();
    var date = qs("reminder-date").value;
    var time = qs("reminder-time").value;
    if (!title || !date || !time) {
      showToast("Reminders need a title, date, and time.");
      return;
    }
    var when = new Date(date + "T" + time);
    if (Number.isNaN(when.getTime())) {
      showToast("That date or time looks off.");
      return;
    }
    reminders.push({
      id: createId(),
      title: title,
      when: when.toISOString(),
      taskId: qs("reminder-task").value,
      status: "open",
      notified: false,
    });
    saveReminders();
    renderReminders();
    qs("reminder-form").reset();
    qs("reminder-date").value = todayKey();
    showToast("reminder set.");
    maybeNotifyReminders();
  });

  qs("reminder-list").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) {
      return;
    }
    var item = reminders.find(function (row) { return row.id === button.dataset.id; });
    if (!item) {
      return;
    }
    if (button.dataset.action === "done") {
      item.status = "done";
    } else if (button.dataset.action === "dismiss") {
      item.status = "dismissed";
    } else if (button.dataset.action === "delete") {
      reminders = reminders.filter(function (row) { return row.id !== item.id; });
    }
    saveReminders();
    renderReminders();
  });

  qs("enable-notifications").addEventListener("click", function () {
    if (!window.isSecureContext || typeof Notification !== "function") {
      qs("notify-status").textContent = "This browser won't show system pop-ups here (often needs https). In-app reminders still work while the page is open.";
      return;
    }
    Notification.requestPermission().then(function (result) {
      qs("notify-status").textContent = result === "granted"
        ? "Browser notifications are on. They still only fire while Donezo is open."
        : "Permission not granted. You'll still see cute in-app toasts while this page is open.";
    });
  });

  qs("audio-files").addEventListener("change", function (event) {
    var files = Array.prototype.slice.call(event.target.files || []);
    if (!files.length) {
      return;
    }
    audio.pause();
    revokeUrls();
    playlist = files.map(function (file) {
      var url = URL.createObjectURL(file);
      objectUrls.push(url);
      var base = file.name.replace(/\.[^.]+$/, "");
      var parts = base.split(" - ");
      return {
        url: url,
        title: parts.length > 1 ? parts.slice(1).join(" - ") : base,
        artist: parts.length > 1 ? parts[0] : "local file",
      };
    });
    loadTrack(0, false);
    showToast(playlist.length + " song" + (playlist.length === 1 ? "" : "s") + " ready in the music corner.");
  });

  qs("play-pause").addEventListener("click", function () {
    if (!playlist.length) {
      return;
    }
    if (audio.paused) {
      audio.play().catch(function () {
        showToast("Couldn't play that file.");
      });
    } else {
      audio.pause();
    }
  });

  qs("prev-track").addEventListener("click", function () {
    loadTrack(trackIndex - 1, !audio.paused);
  });

  qs("next-track").addEventListener("click", function () {
    loadTrack(trackIndex + 1, !audio.paused);
  });

  qs("seek").addEventListener("input", function () {
    if (!playlist.length) {
      return;
    }
    audio.currentTime = Number(qs("seek").value);
  });

  qs("volume").addEventListener("input", function () {
    audio.volume = Number(qs("volume").value);
  });

  audio.addEventListener("play", function () { setPlayingUi(true); });
  audio.addEventListener("pause", function () { setPlayingUi(false); });
  audio.addEventListener("ended", function () {
    if (playlist.length > 1) {
      loadTrack(trackIndex + 1, true);
    } else {
      setPlayingUi(false);
    }
  });
  audio.addEventListener("timeupdate", function () {
    qs("time-elapsed").textContent = formatTime(audio.currentTime);
    qs("seek").value = String(audio.currentTime || 0);
  });
  audio.addEventListener("loadedmetadata", function () {
    qs("time-total").textContent = formatTime(audio.duration);
    qs("seek").max = String(audio.duration || 0);
  });
  audio.addEventListener("error", function () {
    setPlayingUi(false);
    showToast("This audio file couldn't be played.");
  });

  qs("wins-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var text = qs("win-input").value.trim();
    if (!text) {
      return;
    }
    wins.unshift({ id: createId(), text: text, date: todayKey() });
    saveJson(KEYS.wins, wins);
    qs("win-input").value = "";
    renderWins();
  });

  qs("wins-list").addEventListener("click", function (event) {
    var button = event.target.closest(".icon-btn");
    if (!button) {
      return;
    }
    wins = wins.filter(function (win) { return win.id !== button.dataset.id; });
    saveJson(KEYS.wins, wins);
    renderWins();
  });

  qs("sticker-palette").addEventListener("click", function (event) {
    var chip = event.target.closest(".sticker-chip");
    if (!chip) {
      return;
    }
    stickers[chip.dataset.id] = !stickers[chip.dataset.id];
    saveJson(KEYS.stickers, stickers);
    renderStickers();
  });

  qs("reset-stickers").addEventListener("click", function () {
    stickers = {};
    saveJson(KEYS.stickers, stickers);
    renderStickers();
    showToast("sticker tin emptied.");
  });

  qs("confirm-cancel").addEventListener("click", function () {
    confirmCallback = null;
    qs("confirm-dialog").close();
  });

  qs("confirm-ok").addEventListener("click", function () {
    var fn = confirmCallback;
    confirmCallback = null;
    qs("confirm-dialog").close();
    if (fn) {
      fn();
    }
  });

  window.addEventListener("beforeunload", revokeUrls);

  /* Boot */
  var savedTheme = loadJson(KEYS.theme, null);
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    applyTheme(document.documentElement.getAttribute("data-theme") || "light");
  }

  tasks = loadTasks();
  journal = loadJournal();
  moods = loadMoods();
  reminders = loadReminders();
  wins = loadWins();
  stickers = loadStickers();
  var storedThought = loadJson(KEYS.thoughtIndex, dailyIndex(THOUGHTS.length));
  thoughtIndex = Number.isInteger(storedThought) ? storedThought : dailyIndex(THOUGHTS.length);
  audio.volume = Number(qs("volume").value);

  renderHeader();
  renderThought();
  renderTasks();
  renderJournal();
  renderMood();
  renderReminders();
  renderWins();
  renderStickers();
  renderTrack();
  maybeNotifyReminders();
  setInterval(maybeNotifyReminders, 15000);
})();
