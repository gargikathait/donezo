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
    scrapbook: "donezo.scrapbook",
    spotifyEmbed: "donezo.spotifyEmbed",
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
  var BOOTH_STICKERS = [
    "🍓", "🍰", "🎀", "🌸", "🍒", "🧋", "🪞", "🧸", "💌", "🥛", "🌷", "★", "✦", "💖", "🍓✨", "🎂"
  ];

  var tasks = [];
  var journal = [];
  var moods = {};
  var reminders = [];
  var wins = [];
  var stickers = {};
  var scrapbook = [];
  var boothPhotos = [];
  var boothStickers = [];
  var boothMode = "strawberry";
  var boothTheme = "strawberry-milk";
  var boothCaption = "berry sweet memories ♡";
  var boothDateStamp = true;
  var selectedPhotoId = null;
  var selectedStickerId = null;
  var boothZCounter = 1;
  var activePointerDrag = null;
  var musicTab = "vinyl";
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
    updateMediaSession();
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

  /* ========================================================
     Strawberry Photobooth & Scrapbook Wall
     ======================================================== */
  function loadScrapbook() {
    var parsed = loadJson(KEYS.scrapbook, []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(function (item) {
      return item && typeof item.dataUrl === "string" && typeof item.date === "string";
    }).map(function (item) {
      return {
        id: typeof item.id === "string" ? item.id : createId(),
        title: typeof item.title === "string" ? item.title : "Strawberry memory ♡",
        date: item.date,
        mode: typeof item.mode === "string" ? item.mode : "strawberry",
        theme: typeof item.theme === "string" ? item.theme : "strawberry-milk",
        dataUrl: item.dataUrl,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      };
    });
  }

  function saveScrapbook() {
    try {
      localStorage.setItem(KEYS.scrapbook, JSON.stringify(scrapbook));
    } catch (err) {
      showToast("Scrapbook storage is full. Try unpinning an older memory.");
    }
  }

  function renderScrapbook() {
    var pinboard = qs("scrapbook-pinboard");
    var empty = qs("scrapbook-empty-state");
    var chip = qs("scrapbook-count-chip");
    if (!pinboard) {
      return;
    }
    pinboard.replaceChildren();
    chip.textContent = scrapbook.length + " memor" + (scrapbook.length === 1 ? "y" : "ies");
    if (scrapbook.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    scrapbook.forEach(function (memory, index) {
      var card = document.createElement("div");
      var rotations = [-2.5, 2, -1.5, 1.8, -2, 1.5];
      var rot = rotations[index % rotations.length];
      card.className = "scrapbook-card";
      card.style.transform = "rotate(" + rot + "deg)";

      var tape = document.createElement("div");
      tape.className = "scrapbook-tape";
      tape.setAttribute("aria-hidden", "true");

      var pinIcon = document.createElement("span");
      pinIcon.className = "scrapbook-pin-icon";
      pinIcon.textContent = "🍓";
      pinIcon.setAttribute("aria-hidden", "true");

      var imgWrap = document.createElement("div");
      imgWrap.className = "scrapbook-img-wrap";
      imgWrap.setAttribute("role", "button");
      imgWrap.setAttribute("tabindex", "0");
      imgWrap.setAttribute("aria-label", "View " + memory.title + " enlarged");

      var img = document.createElement("img");
      img.src = memory.dataUrl;
      img.alt = memory.title;
      img.loading = "lazy";
      imgWrap.append(img);

      imgWrap.addEventListener("click", function () {
        openPhotoModal(memory);
      });
      imgWrap.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPhotoModal(memory);
        }
      });

      var meta = document.createElement("div");
      meta.className = "scrapbook-meta";
      var title = document.createElement("span");
      title.className = "scrapbook-title";
      title.textContent = memory.title;
      var date = document.createElement("span");
      date.className = "scrapbook-date";
      date.textContent = memory.date + " · " + memory.mode + " booth";
      meta.append(title, date);

      var actions = document.createElement("div");
      actions.className = "scrapbook-card-actions";

      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "text-btn";
      viewBtn.textContent = "🔍 View";
      viewBtn.addEventListener("click", function () {
        openPhotoModal(memory);
      });

      var downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "text-btn";
      downloadBtn.textContent = "⬇ Save";
      downloadBtn.addEventListener("click", function () {
        var link = document.createElement("a");
        link.download = "donezo-scrapbook-" + memory.date + ".png";
        link.href = memory.dataUrl;
        link.click();
      });

      var unpinBtn = document.createElement("button");
      unpinBtn.type = "button";
      unpinBtn.className = "text-btn";
      unpinBtn.textContent = "✕ Unpin";
      unpinBtn.addEventListener("click", function () {
        askConfirm("Unpin this memory from your scrapbook wall?", function () {
          scrapbook = scrapbook.filter(function (item) { return item.id !== memory.id; });
          saveScrapbook();
          renderScrapbook();
          showToast("Memory unpinned from wall.");
        });
      });

      actions.append(viewBtn, downloadBtn, unpinBtn);
      card.append(tape, pinIcon, imgWrap, meta, actions);
      pinboard.append(card);
    });
  }

  function openPhotoModal(memory) {
    var modal = qs("photo-modal");
    if (!modal) {
      return;
    }
    qs("photo-modal-img").src = memory.dataUrl;
    qs("photo-modal-title").textContent = memory.title || "Strawberry Memory ♡";
    var dl = qs("photo-modal-download");
    dl.href = memory.dataUrl;
    dl.download = "donezo-scrapbook-" + memory.date + ".png";
    if (typeof modal.showModal === "function") {
      modal.showModal();
    }
  }

  function createDemoPhotos() {
    function makeCanvas(drawFn) {
      var c = document.createElement("canvas");
      c.width = 320;
      c.height = 320;
      var ctx = c.getContext("2d");
      drawFn(ctx);
      return c.toDataURL("image/png");
    }

    var url1 = makeCanvas(function (ctx) {
      ctx.fillStyle = "#ffd8e5";
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = "#ffb8cf";
      for (var i = 0; i < 320; i += 24) {
        ctx.fillRect(i, 0, 12, 320);
        ctx.fillRect(0, i, 320, 12);
      }
      ctx.fillStyle = "#fff7fb";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(40, 36, 240, 248, 16) : ctx.rect(40, 36, 240, 248);
      ctx.fill();
      ctx.fillStyle = "#e36d92";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("STRAWBERRY", 160, 85);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("MILK ♡", 160, 115);
      ctx.font = "72px sans-serif";
      ctx.fillText("🍓", 160, 195);
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#8a5d72";
      ctx.fillText("100% sweet memories", 160, 250);
    });

    var url2 = makeCanvas(function (ctx) {
      ctx.fillStyle = "#fff4e8";
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = "#fed6b6";
      for (var x = 20; x < 320; x += 36) {
        for (var y = 20; y < 320; y += 36) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(40, 36, 240, 248, 16) : ctx.rect(40, 36, 240, 248);
      ctx.fill();
      ctx.fillStyle = "#d6455d";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SHORTCAKE", 160, 85);
      ctx.font = "72px sans-serif";
      ctx.fillText("🍰", 160, 185);
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#8a5d72";
      ctx.fillText("pure sweetest joy ✿", 160, 250);
    });

    var url3 = makeCanvas(function (ctx) {
      ctx.fillStyle = "#f2e8ff";
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(40, 36, 240, 248, 16) : ctx.rect(40, 36, 240, 248);
      ctx.fill();
      ctx.fillStyle = "#b79ad8";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BERRY BEAR", 160, 85);
      ctx.font = "74px sans-serif";
      ctx.fillText("🧸", 160, 185);
      ctx.font = "28px sans-serif";
      ctx.fillText("🍓", 185, 130);
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#8a5d72";
      ctx.fillText("cozy afternoon ♡", 160, 250);
    });

    return [url1, url2, url3];
  }

  function addPhotoToBooth(src) {
    var img = new Image();
    img.onload = function () {
      var aspect = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 1;
      var w = 175;
      var h = Math.round(175 / aspect);
      if (aspect < 0.65) {
        h = 220;
        w = Math.round(h * aspect);
      } else if (aspect > 1.8) {
        w = 210;
        h = Math.round(w / aspect);
      }

      // Default positioning based on current photo count
      var idx = boothPhotos.length;
      var defaultOffsets = [
        { x: 105, y: 130, rot: -4 },
        { x: 115, y: 220, rot: 5 },
        { x: 95, y: 175, rot: -2 },
        { x: 120, y: 160, rot: 3 },
      ];
      var off = defaultOffsets[idx % defaultOffsets.length];

      var photoObj = {
        id: createId(),
        src: src,
        img: img,
        x: off.x + Math.round((Math.random() * 20) - 10),
        y: off.y + Math.round((Math.random() * 20) - 10),
        width: w,
        height: h,
        scale: 1,
        rotation: off.rot,
        zIndex: ++boothZCounter,
      };

      boothPhotos.push(photoObj);
      selectedPhotoId = photoObj.id;
      selectedStickerId = null;
      renderBoothStage();
      showToast("photo added to booth 🍓");
    };
    img.src = src;
  }

  function addStickerToBooth(glyph) {
    var stickerObj = {
      id: createId(),
      glyph: glyph,
      x: 140 + Math.round((Math.random() * 80) - 40),
      y: 190 + Math.round((Math.random() * 80) - 40),
      scale: 1,
      rotation: Math.round((Math.random() * 24) - 12),
      zIndex: ++boothZCounter,
    };
    boothStickers.push(stickerObj);
    selectedStickerId = stickerObj.id;
    selectedPhotoId = null;
    renderBoothStage();
    showToast("sticker placed! drag anywhere ♡");
  }

  function getActivePhoto() {
    return boothPhotos.find(function (p) { return p.id === selectedPhotoId; }) || null;
  }

  function updateActivePhotoBar() {
    var bar = qs("active-photo-bar");
    if (!bar) {
      return;
    }
    var active = getActivePhoto();
    bar.hidden = !active;
  }

  function renderBoothStage() {
    var stage = qs("booth-stage");
    if (!stage) {
      return;
    }

    stage.className = "booth-stage mode-" + boothMode + " theme-" + boothTheme;
    qs("strawberry-frame-wrap").hidden = (boothMode !== "strawberry");
    qs("photo-strip-wrap").hidden = (boothMode !== "strip");
    qs("collage-wrap").hidden = (boothMode !== "collage");

    var emptyPrompt = qs("booth-empty-prompt");
    if (emptyPrompt) {
      emptyPrompt.hidden = (boothPhotos.length > 0 || boothStickers.length > 0);
    }

    // 1. Strawberry Mode Render
    if (boothMode === "strawberry") {
      var photoArea = qs("strawberry-photo-area");
      photoArea.replaceChildren();
      boothPhotos.forEach(function (photo) {
        var el = document.createElement("div");
        el.className = "booth-photo-item" + (photo.id === selectedPhotoId ? " is-selected" : "");
        el.dataset.id = photo.id;
        el.style.left = photo.x + "px";
        el.style.top = photo.y + "px";
        el.style.width = photo.width + "px";
        el.style.height = photo.height + "px";
        el.style.zIndex = photo.zIndex;
        el.style.transform = "rotate(" + photo.rotation + "deg) scale(" + photo.scale + ")";

        var img = document.createElement("img");
        img.src = photo.src;
        img.alt = "Strawberry collage photo";
        img.draggable = false;
        el.append(img);
        photoArea.append(el);
      });
    }

    // 2. Photo Strip Mode Render
    if (boothMode === "strip") {
      var slotsContainer = qs("strip-slots-container");
      var slots = slotsContainer.querySelectorAll(".strip-slot");
      slots.forEach(function (slot, idx) {
        var holder = slot.querySelector(".slot-photo-holder");
        var placeholder = slot.querySelector(".slot-placeholder");
        holder.replaceChildren();
        if (boothPhotos[idx]) {
          var p = boothPhotos[idx];
          var img = document.createElement("img");
          img.src = p.src;
          img.alt = "Strip photo " + (idx + 1);
          img.draggable = false;
          holder.append(img);
          placeholder.hidden = true;
        } else {
          placeholder.hidden = false;
        }
      });
      qs("strip-caption-display").textContent = boothCaption || "berry sweet memories ♡";
      qs("strip-date-display").textContent = boothDateStamp ? todayKey() : "";
    }

    // 3. Scrapbook Collage Mode Render
    if (boothMode === "collage") {
      var board = qs("collage-board");
      board.replaceChildren();
      boothPhotos.forEach(function (photo) {
        var polaroid = document.createElement("div");
        polaroid.className = "collage-polaroid" + (photo.id === selectedPhotoId ? " is-selected" : "");
        polaroid.dataset.id = photo.id;
        polaroid.style.left = photo.x + "px";
        polaroid.style.top = photo.y + "px";
        polaroid.style.width = photo.width + "px";
        polaroid.style.height = (photo.height + 28) + "px";
        polaroid.style.zIndex = photo.zIndex;
        polaroid.style.transform = "rotate(" + photo.rotation + "deg) scale(" + photo.scale + ")";

        var tape = document.createElement("div");
        tape.className = "polaroid-tape";
        tape.setAttribute("aria-hidden", "true");

        var img = document.createElement("img");
        img.src = photo.src;
        img.alt = "Collage polaroid photo";
        img.draggable = false;

        polaroid.append(tape, img);
        board.append(polaroid);
      });
    }

    // 4. Placed Draggable Stickers Render
    var stickerContainer = qs("booth-placed-stickers");
    stickerContainer.replaceChildren();
    boothStickers.forEach(function (stk) {
      var sEl = document.createElement("div");
      sEl.className = "stage-sticker" + (stk.id === selectedStickerId ? " is-selected" : "");
      sEl.dataset.id = stk.id;
      sEl.textContent = stk.glyph;
      sEl.style.left = stk.x + "px";
      sEl.style.top = stk.y + "px";
      sEl.style.zIndex = stk.zIndex;
      sEl.style.transform = "rotate(" + stk.rotation + "deg) scale(" + stk.scale + ")";
      stickerContainer.append(sEl);
    });

    updateActivePhotoBar();
  }

  function handleStagePointerDown(event) {
    var photoEl = event.target.closest(".booth-photo-item, .collage-polaroid");
    var stickerEl = event.target.closest(".stage-sticker");
    var stripSlot = event.target.closest(".strip-slot");

    if (stripSlot) {
      var sIdx = Number(stripSlot.dataset.slot);
      if (boothPhotos[sIdx]) {
        selectedPhotoId = boothPhotos[sIdx].id;
        selectedStickerId = null;
        updateActivePhotoBar();
      }
      return;
    }

    if (!photoEl && !stickerEl) {
      selectedPhotoId = null;
      selectedStickerId = null;
      updateActivePhotoBar();
      document.querySelectorAll(".booth-photo-item, .collage-polaroid, .stage-sticker").forEach(function (el) {
        el.classList.remove("is-selected");
      });
      return;
    }

    if (photoEl) {
      var pId = photoEl.dataset.id;
      var photo = boothPhotos.find(function (p) { return p.id === pId; });
      if (!photo) {
        return;
      }
      selectedPhotoId = pId;
      selectedStickerId = null;
      photo.zIndex = ++boothZCounter;
      photoEl.style.zIndex = photo.zIndex;

      document.querySelectorAll(".booth-photo-item, .collage-polaroid, .stage-sticker").forEach(function (el) {
        el.classList.toggle("is-selected", el.dataset.id === pId);
      });
      updateActivePhotoBar();

      activePointerDrag = {
        type: "photo",
        id: pId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origX: photo.x,
        origY: photo.y,
        el: photoEl,
      };
      photoEl.classList.add("is-dragging");
      try {
        photoEl.setPointerCapture(event.pointerId);
      } catch (ignore) {}
      event.preventDefault();
    } else if (stickerEl) {
      var sId = stickerEl.dataset.id;
      var sticker = boothStickers.find(function (s) { return s.id === sId; });
      if (!sticker) {
        return;
      }
      selectedStickerId = sId;
      selectedPhotoId = null;
      sticker.zIndex = ++boothZCounter;
      stickerEl.style.zIndex = sticker.zIndex;

      document.querySelectorAll(".booth-photo-item, .collage-polaroid, .stage-sticker").forEach(function (el) {
        el.classList.toggle("is-selected", el.dataset.id === sId);
      });
      updateActivePhotoBar();

      activePointerDrag = {
        type: "sticker",
        id: sId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origX: sticker.x,
        origY: sticker.y,
        el: stickerEl,
      };
      stickerEl.classList.add("is-dragging");
      try {
        stickerEl.setPointerCapture(event.pointerId);
      } catch (ignore) {}
      event.preventDefault();
    }
  }

  function handleStagePointerMove(event) {
    if (!activePointerDrag || activePointerDrag.pointerId !== event.pointerId) {
      return;
    }
    var dx = event.clientX - activePointerDrag.startX;
    var dy = event.clientY - activePointerDrag.startY;

    if (activePointerDrag.type === "photo") {
      var photo = boothPhotos.find(function (p) { return p.id === activePointerDrag.id; });
      if (!photo) {
        return;
      }
      photo.x = activePointerDrag.origX + dx;
      photo.y = activePointerDrag.origY + dy;
      activePointerDrag.el.style.left = photo.x + "px";
      activePointerDrag.el.style.top = photo.y + "px";
    } else if (activePointerDrag.type === "sticker") {
      var sticker = boothStickers.find(function (s) { return s.id === activePointerDrag.id; });
      if (!sticker) {
        return;
      }
      sticker.x = activePointerDrag.origX + dx;
      sticker.y = activePointerDrag.origY + dy;
      activePointerDrag.el.style.left = sticker.x + "px";
      activePointerDrag.el.style.top = sticker.y + "px";
    }
  }

  function handleStagePointerUp(event) {
    if (!activePointerDrag || activePointerDrag.pointerId !== event.pointerId) {
      return;
    }
    activePointerDrag.el.classList.remove("is-dragging");
    try {
      activePointerDrag.el.releasePointerCapture(event.pointerId);
    } catch (ignore) {}
    activePointerDrag = null;
  }

  /* High-Resolution Canvas Rendering Engine */
  function drawStrawberryBezier(ctx, cx, cy, w, h) {
    var x0 = cx - w * 0.5;
    var y0 = cy - h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.5, y0 + h * 0.15);
    ctx.bezierCurveTo(x0 + w * 0.62, y0 + h * 0.15, x0 + w * 0.88, y0 + h * 0.19, x0 + w * 0.90, y0 + h * 0.42);
    ctx.bezierCurveTo(x0 + w * 0.92, y0 + h * 0.62, x0 + w * 0.76, y0 + h * 0.82, x0 + w * 0.53, y0 + h * 0.94);
    ctx.bezierCurveTo(x0 + w * 0.51, y0 + h * 0.95, x0 + w * 0.49, y0 + h * 0.95, x0 + w * 0.47, y0 + h * 0.94);
    ctx.bezierCurveTo(x0 + w * 0.24, y0 + h * 0.82, x0 + w * 0.08, y0 + h * 0.62, x0 + w * 0.10, y0 + h * 0.42);
    ctx.bezierCurveTo(x0 + w * 0.12, y0 + h * 0.19, x0 + w * 0.38, y0 + h * 0.15, x0 + w * 0.5, y0 + h * 0.15);
    ctx.closePath();
  }

  function drawStrawberryLeaves(ctx, cx, cy, w, h) {
    var x0 = cx - w * 0.5;
    var y0 = cy - h * 0.5;
    ctx.save();
    // Stem
    ctx.fillStyle = "#73513a";
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.485, y0 + h * 0.03);
    ctx.bezierCurveTo(x0 + w * 0.485, y0 + h * 0.09, x0 + w * 0.49, y0 + h * 0.14, x0 + w * 0.49, y0 + h * 0.16);
    ctx.lineTo(x0 + w * 0.51, y0 + h * 0.16);
    ctx.bezierCurveTo(x0 + w * 0.51, y0 + h * 0.14, x0 + w * 0.515, y0 + h * 0.09, x0 + w * 0.515, y0 + h * 0.03);
    ctx.closePath();
    ctx.fill();

    // 5 Calyx Sepals
    ctx.fillStyle = "#4fa164";
    ctx.strokeStyle = "#377d48";
    ctx.lineWidth = 3;
    var leaves = [
      [0.5, 0.16, 0.18, 0.16, 0.46, 0.17],
      [0.5, 0.16, 0.32, 0.22, 0.48, 0.17],
      [0.5, 0.16, 0.50, 0.26, 0.52, 0.17],
      [0.5, 0.16, 0.68, 0.22, 0.52, 0.17],
      [0.5, 0.16, 0.82, 0.16, 0.54, 0.17],
    ];
    leaves.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(x0 + w * s[0], y0 + h * s[1]);
      ctx.quadraticCurveTo(x0 + w * s[2], y0 + h * s[3] * 0.8, x0 + w * s[2], y0 + h * s[3]);
      ctx.quadraticCurveTo(x0 + w * s[4], y0 + h * s[3], x0 + w * s[0], y0 + h * s[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Blossom Center
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x0 + w * 0.5, y0 + h * 0.16, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.arc(x0 + w * 0.5, y0 + h * 0.16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStrawberrySeeds(ctx, cx, cy, w, h) {
    var x0 = cx - w * 0.5;
    var y0 = cy - h * 0.5;
    ctx.save();
    ctx.fillStyle = "#ffe27a";
    var seeds = [
      [0.35, 0.30], [0.50, 0.28], [0.65, 0.30],
      [0.26, 0.42], [0.42, 0.40], [0.58, 0.40], [0.74, 0.42],
      [0.32, 0.55], [0.50, 0.54], [0.68, 0.55],
      [0.40, 0.68], [0.60, 0.68],
      [0.46, 0.80], [0.54, 0.80],
      [0.50, 0.88],
    ];
    seeds.forEach(function (s) {
      var sx = x0 + w * s[0];
      var sy = y0 + h * s[1];
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3.5, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function renderPhotoboothCanvas(callback) {
    var isStrip = (boothMode === "strip");
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    var width = isStrip ? 600 : 800;
    var height = isStrip ? 1160 : 960;
    canvas.width = width;
    canvas.height = height;

    // Backgrounds based on border theme
    if (boothTheme === "strawberry-milk") {
      ctx.fillStyle = "#fff5f9";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffd4e2";
      for (var x = 20; x < width; x += 32) {
        for (var y = 20; y < height; y += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (boothTheme === "berry-gingham") {
      ctx.fillStyle = "#ffeef3";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(227, 56, 84, 0.15)";
      for (var gx = 0; gx < width; gx += 32) {
        ctx.fillRect(gx, 0, 16, height);
      }
      for (var gy = 0; gy < height; gy += 32) {
        ctx.fillRect(0, gy, width, 16);
      }
    } else if (boothTheme === "ruby-sweet") {
      var rad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, height * 0.7);
      rad.addColorStop(0, "#ffe6ed");
      rad.addColorStop(1, "#ffb0c5");
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#e33854";
      ctx.strokeRect(10, 10, width - 20, height - 20);
    } else if (boothTheme === "starry-plum") {
      ctx.fillStyle = "#251230";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffe27a";
      for (var s = 0; s < 45; s++) {
        var sx = (s * 73 + 19) % width;
        var sy = (s * 107 + 31) % height;
        ctx.beginPath();
        ctx.arc(sx, sy, (s % 3 === 0 ? 2 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Vintage polaroid
      ctx.fillStyle = "#faf4ea";
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#e2d1be";
      ctx.strokeRect(8, 8, width - 16, height - 16);
    }

    // Pre-load all photo images
    var loaded = 0;
    var totalPhotos = boothPhotos.length;
    var photoImages = [];

    function proceedToDraw() {
      var scale = isStrip ? 1.4 : 1.8;

      if (boothMode === "strawberry") {
        var cx = width * 0.5;
        var cy = height * 0.51;
        var sw = 640;
        var sh = 720;

        // Clip to strawberry
        ctx.save();
        drawStrawberryBezier(ctx, cx, cy, sw, sh);
        ctx.clip();

        // Inner gradient
        var berryGrad = ctx.createLinearGradient(cx, cy - sh * 0.5, cx, cy + sh * 0.5);
        berryGrad.addColorStop(0, "#ffd4e0");
        berryGrad.addColorStop(0.5, "#ffb3c6");
        berryGrad.addColorStop(1, "#ff8ea8");
        ctx.fillStyle = berryGrad;
        ctx.fillRect(cx - sw * 0.5, cy - sh * 0.5, sw, sh);

        // Draw photos inside
        boothPhotos.forEach(function (photo, idx) {
          var pImg = photoImages[idx];
          if (!pImg) return;
          ctx.save();
          // Map stage coordinates (stage approx 390x460) to canvas (sw=640, sh=720)
          var mapRatio = sw / 390;
          var px = (photo.x - 20) * mapRatio + (photo.width * mapRatio * 0.5);
          var py = (photo.y - 10) * mapRatio + (photo.height * mapRatio * 0.5);
          ctx.translate(px, py);
          ctx.rotate((photo.rotation * Math.PI) / 180);
          ctx.scale(photo.scale, photo.scale);
          ctx.drawImage(
            pImg,
            -(photo.width * mapRatio * 0.5),
            -(photo.height * mapRatio * 0.5),
            photo.width * mapRatio,
            photo.height * mapRatio
          );
          ctx.restore();
        });
        ctx.restore();

        // Stroke strawberry border
        ctx.save();
        ctx.lineWidth = 10;
        ctx.strokeStyle = (boothTheme === "starry-plum") ? "#f08bb0" : "#e33854";
        drawStrawberryBezier(ctx, cx, cy, sw, sh);
        ctx.stroke();
        ctx.restore();

        // Strawberry Seeds & Leaves
        drawStrawberrySeeds(ctx, cx, cy, sw, sh);
        drawStrawberryLeaves(ctx, cx, cy, sw, sh);

        // Watermark Banner Top/Bottom
        ctx.save();
        ctx.font = "bold 24px Trebuchet MS, sans-serif";
        ctx.fillStyle = (boothTheme === "starry-plum") ? "#f7e6f0" : "#4a2a3a";
        ctx.textAlign = "center";
        ctx.fillText("🍓 " + (boothCaption || "DONEZO PHOTOBOOTH ♡") + " 🍓", width / 2, height - 38);
        if (boothDateStamp) {
          ctx.font = "16px Trebuchet MS, sans-serif";
          ctx.fillStyle = (boothTheme === "starry-plum") ? "#d7b3c8" : "#8a5d72";
          ctx.fillText("♡ " + todayKey() + " ♡", width / 2, height - 16);
        }
        ctx.restore();
      } else if (boothMode === "strip") {
        // Strip Card Frame
        var cardW = 460;
        var cardH = 1060;
        var cardX = (width - cardW) / 2;
        var cardY = (height - cardH) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 20) : ctx.rect(cardX, cardY, cardW, cardH);
        ctx.fill();
        ctx.shadowColor = "transparent";

        ctx.lineWidth = 6;
        ctx.strokeStyle = "#e36d92";
        ctx.stroke();

        // Header
        ctx.font = "bold 26px Trebuchet MS, sans-serif";
        ctx.fillStyle = "#c74d78";
        ctx.textAlign = "center";
        ctx.fillText("🎀 DONEZO PHOTOBOOTH ✦", width / 2, cardY + 48);

        // 3 Slots
        var slotW = 400;
        var slotH = 260;
        var slotX = cardX + 30;
        var slotYStart = cardY + 70;
        var gap = 18;

        for (var s = 0; s < 3; s++) {
          var sy = slotYStart + s * (slotH + gap);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(slotX, sy, slotW, slotH, 12) : ctx.rect(slotX, sy, slotW, slotH);
          ctx.fillStyle = "#ffeef5";
          ctx.fill();
          ctx.clip();

          if (photoImages[s]) {
            var img = photoImages[s];
            // Center crop fill
            var imgRatio = img.width / img.height;
            var slotRatio = slotW / slotH;
            var dw, dh, dx, dy;
            if (imgRatio > slotRatio) {
              dh = slotH;
              dw = slotH * imgRatio;
              dx = slotX + (slotW - dw) / 2;
              dy = sy;
            } else {
              dw = slotW;
              dh = slotW / imgRatio;
              dx = slotX;
              dy = sy + (slotH - dh) / 2;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
          } else {
            ctx.fillStyle = "#8a5d72";
            ctx.font = "20px Trebuchet MS, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("photo " + (s + 1) + " 🍓", slotX + slotW / 2, sy + slotH / 2);
          }
          ctx.restore();

          ctx.lineWidth = 3;
          ctx.strokeStyle = "#f0b9cd";
          ctx.stroke();
        }

        // Strip Footer
        ctx.font = "bold 24px Snell Roundhand, cursive, Trebuchet MS";
        ctx.fillStyle = "#e36d92";
        ctx.textAlign = "center";
        ctx.fillText(boothCaption || "berry sweet memories ♡", width / 2, cardY + cardH - 50);

        if (boothDateStamp) {
          ctx.font = "16px Trebuchet MS, sans-serif";
          ctx.fillStyle = "#8a5d72";
          ctx.fillText("DATE: " + todayKey() + " · DONEZO", width / 2, cardY + cardH - 24);
        }
      } else {
        // Scrapbook Collage Mode
        boothPhotos.forEach(function (photo, idx) {
          var pImg = photoImages[idx];
          if (!pImg) return;
          ctx.save();
          var mapRatio = 1.6;
          var px = (photo.x + 20) * mapRatio;
          var py = (photo.y + 20) * mapRatio;
          ctx.translate(px, py);
          ctx.rotate((photo.rotation * Math.PI) / 180);
          ctx.scale(photo.scale, photo.scale);

          // Polaroid white frame
          var pw = photo.width * mapRatio;
          var ph = photo.height * mapRatio + 36;
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 6;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(-pw * 0.5 - 10, -ph * 0.5 - 10, pw + 20, ph + 20, 8) : ctx.rect(-pw * 0.5 - 10, -ph * 0.5 - 10, pw + 20, ph + 20);
          ctx.fill();
          ctx.shadowColor = "transparent";

          // Photo
          ctx.drawImage(pImg, -pw * 0.5, -ph * 0.5, pw, photo.height * mapRatio);

          // Washi tape at top
          ctx.fillStyle = "rgba(255, 220, 235, 0.85)";
          ctx.save();
          ctx.rotate(-0.04);
          ctx.fillRect(-35, -ph * 0.5 - 20, 70, 22);
          ctx.restore();

          ctx.restore();
        });

        // Watermark Banner
        ctx.save();
        ctx.font = "bold 24px Trebuchet MS, sans-serif";
        ctx.fillStyle = (boothTheme === "starry-plum") ? "#f7e6f0" : "#4a2a3a";
        ctx.textAlign = "center";
        ctx.fillText("🪞 " + (boothCaption || "DONEZO SCRAPBOOK ♡") + " 🪞", width / 2, height - 38);
        if (boothDateStamp) {
          ctx.font = "16px Trebuchet MS, sans-serif";
          ctx.fillStyle = (boothTheme === "starry-plum") ? "#d7b3c8" : "#8a5d72";
          ctx.fillText("♡ " + todayKey() + " ♡", width / 2, height - 16);
        }
        ctx.restore();
      }

      // Draw Placed Stickers
      boothStickers.forEach(function (stk) {
        ctx.save();
        var mapRatio = (isStrip ? 1.2 : 1.7);
        var sx = stk.x * mapRatio;
        var sy = stk.y * mapRatio;
        ctx.translate(sx, sy);
        ctx.rotate((stk.rotation * Math.PI) / 180);
        ctx.scale(stk.scale, stk.scale);
        ctx.font = "52px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(stk.glyph, 0, 0);
        ctx.restore();
      });

      callback(canvas);
    }

    if (totalPhotos === 0) {
      proceedToDraw();
      return;
    }

    boothPhotos.forEach(function (p, idx) {
      var img = new Image();
      img.onload = function () {
        photoImages[idx] = img;
        loaded++;
        if (loaded === totalPhotos) {
          proceedToDraw();
        }
      };
      img.onerror = function () {
        loaded++;
        if (loaded === totalPhotos) {
          proceedToDraw();
        }
      };
      img.src = p.src;
    });
  }

  function downloadBoothImage() {
    if (boothPhotos.length === 0) {
      showToast("Add at least one photo first! 🍓");
      return;
    }
    showToast("Preparing your high-res strawberry photo… 🍓");
    renderPhotoboothCanvas(function (canvas) {
      var link = qs("booth-download-link");
      var dataUrl = canvas.toDataURL("image/png");
      link.href = dataUrl;
      link.download = "donezo-strawberry-photobooth-" + todayKey() + ".png";
      link.click();
      showToast("Strawberry memory downloaded! 🍓♡");
    });
  }

  function pinBoothToScrapbook() {
    if (boothPhotos.length === 0) {
      showToast("Add at least one photo first! 🍓");
      return;
    }
    renderPhotoboothCanvas(function (canvas) {
      // Resize to optimized thumbnail (~520px max dimension) for safe localStorage usage
      var thumbCanvas = document.createElement("canvas");
      var maxDim = 520;
      var tw = canvas.width;
      var th = canvas.height;
      if (tw > maxDim || th > maxDim) {
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
      }
      thumbCanvas.width = tw;
      thumbCanvas.height = th;
      var tCtx = thumbCanvas.getContext("2d");
      tCtx.drawImage(canvas, 0, 0, tw, th);

      var thumbData = thumbCanvas.toDataURL("image/jpeg", 0.88);

      var memory = {
        id: createId(),
        title: boothCaption || "Strawberry Moment ♡",
        date: todayKey(),
        mode: boothMode,
        theme: boothTheme,
        dataUrl: thumbData,
        createdAt: new Date().toISOString(),
      };

      scrapbook.unshift(memory);
      saveScrapbook();
      renderScrapbook();
      showToast("Pinned to your scrapbook wall! 📌🍓");
    });
  }

  function initPhotobooth() {
    // Mode switcher buttons
    document.querySelectorAll(".mode-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        boothMode = pill.dataset.mode;
        document.querySelectorAll(".mode-pill").forEach(function (other) {
          var active = (other.dataset.mode === boothMode);
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderBoothStage();
      });
    });

    // Theme selector
    var borderSelect = qs("booth-border-select");
    if (borderSelect) {
      borderSelect.addEventListener("change", function () {
        boothTheme = borderSelect.value;
        renderBoothStage();
      });
    }

    // Date toggle
    var dateToggle = qs("booth-date-toggle");
    if (dateToggle) {
      dateToggle.addEventListener("change", function () {
        boothDateStamp = dateToggle.checked;
        renderBoothStage();
      });
    }

    // Caption input
    var captionInput = qs("booth-caption-input");
    if (captionInput) {
      captionInput.addEventListener("input", function () {
        boothCaption = captionInput.value;
        if (boothMode === "strip") {
          qs("strip-caption-display").textContent = boothCaption || "berry sweet memories ♡";
        }
      });
    }

    // File input
    var fileInput = qs("booth-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        if (!files.length) return;
        files.forEach(function (file) {
          if (!file.type.match(/^image\//)) return;
          var reader = new FileReader();
          reader.onload = function (evt) {
            addPhotoToBooth(evt.target.result);
          };
          reader.readAsDataURL(file);
        });
        fileInput.value = "";
      });
    }

    // Demo Photos Button
    var demoBtn = qs("booth-demo-btn");
    if (demoBtn) {
      demoBtn.addEventListener("click", function () {
        var demos = createDemoPhotos();
        demos.forEach(function (src) {
          addPhotoToBooth(src);
        });
      });
    }

    // Clear Stage Button
    var resetStage = qs("booth-reset-stage");
    if (resetStage) {
      resetStage.addEventListener("click", function () {
        askConfirm("Clear all photos and stickers from the photobooth stage?", function () {
          boothPhotos = [];
          boothStickers = [];
          selectedPhotoId = null;
          selectedStickerId = null;
          renderBoothStage();
          showToast("photobooth stage cleared.");
        });
      });
    }

    // Drag and Drop files onto stage
    var stage = qs("booth-stage");
    if (stage) {
      stage.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      stage.addEventListener("drop", function (e) {
        e.preventDefault();
        var files = Array.prototype.slice.call(e.dataTransfer.files || []);
        if (!files.length) return;
        files.forEach(function (file) {
          if (!file.type.match(/^image\//)) return;
          var reader = new FileReader();
          reader.onload = function (evt) {
            addPhotoToBooth(evt.target.result);
          };
          reader.readAsDataURL(file);
        });
      });

      // Pointer event listeners for dragging photos and stickers
      stage.addEventListener("pointerdown", handleStagePointerDown);
      stage.addEventListener("pointermove", handleStagePointerMove);
      stage.addEventListener("pointerup", handleStagePointerUp);
      stage.addEventListener("pointercancel", handleStagePointerUp);
    }

    // Micro-Toolbar Photo Controls
    qs("photo-zoom-in").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      active.scale = Math.min(3, active.scale * 1.15);
      renderBoothStage();
    });

    qs("photo-zoom-out").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      active.scale = Math.max(0.35, active.scale / 1.15);
      renderBoothStage();
    });

    qs("photo-rotate-left").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      active.rotation = (active.rotation - 10) % 360;
      renderBoothStage();
    });

    qs("photo-rotate-right").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      active.rotation = (active.rotation + 10) % 360;
      renderBoothStage();
    });

    qs("photo-layer-up").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      active.zIndex = ++boothZCounter;
      renderBoothStage();
    });

    qs("photo-layer-down").addEventListener("click", function () {
      var active = getActivePhoto();
      if (!active) return;
      var minZ = 1;
      boothPhotos.forEach(function (p) { if (p.zIndex < minZ) minZ = p.zIndex; });
      active.zIndex = Math.max(0, minZ - 1);
      renderBoothStage();
    });

    qs("photo-delete").addEventListener("click", function () {
      if (!selectedPhotoId) return;
      boothPhotos = boothPhotos.filter(function (p) { return p.id !== selectedPhotoId; });
      selectedPhotoId = null;
      renderBoothStage();
      showToast("photo removed from stage.");
    });

    // Sticker Drawer Setup
    var stickerGrid = qs("booth-stickers-grid");
    if (stickerGrid) {
      stickerGrid.replaceChildren();
      BOOTH_STICKERS.forEach(function (glyph) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booth-sticker-btn";
        btn.textContent = glyph;
        btn.setAttribute("aria-label", "Drop sticker " + glyph);
        btn.addEventListener("click", function () {
          addStickerToBooth(glyph);
        });
        stickerGrid.append(btn);
      });
    }

    var clearStickersBtn = qs("booth-stickers-clear-btn");
    if (clearStickersBtn) {
      clearStickersBtn.addEventListener("click", function () {
        boothStickers = [];
        selectedStickerId = null;
        renderBoothStage();
        showToast("stickers cleared.");
      });
    }

    // Export Buttons
    qs("booth-download-btn").addEventListener("click", downloadBoothImage);
    qs("booth-pin-btn").addEventListener("click", pinBoothToScrapbook);

    // Scrapbook Clear Wall
    qs("scrapbook-clear-btn").addEventListener("click", function () {
      askConfirm("Clear all memories from your scrapbook wall?", function () {
        scrapbook = [];
        saveScrapbook();
        renderScrapbook();
        showToast("scrapbook wall cleared.");
      });
    });

    // Photo Modal Close
    qs("photo-modal-close").addEventListener("click", function () {
      qs("photo-modal").close();
    });
    qs("photo-modal-dismiss").addEventListener("click", function () {
      qs("photo-modal").close();
    });
  }

  /* ========================================================
     Spotify Player & Media Session
     ======================================================== */
  function parseSpotifyUrl(input) {
    if (!input || typeof input !== "string") {
      return null;
    }
    var trimmed = input.trim();
    // https://open.spotify.com/(track|playlist|album|artist|episode)/([a-zA-Z0-9]+)
    var webMatch = trimmed.match(/open\.spotify\.com\/(track|playlist|album|artist|episode)\/([a-zA-Z0-9]+)/i);
    if (webMatch) {
      return { type: webMatch[1].toLowerCase(), id: webMatch[2] };
    }
    // spotify:(track|playlist|album):([a-zA-Z0-9]+)
    var uriMatch = trimmed.match(/spotify:(track|playlist|album|artist):([a-zA-Z0-9]+)/i);
    if (uriMatch) {
      return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
    }
    // Raw playlist or track ID
    if (/^[a-zA-Z0-9]{20,24}$/.test(trimmed)) {
      return { type: "playlist", id: trimmed };
    }
    return null;
  }

  function loadSpotifyEmbed(type, id) {
    var iframe = qs("spotify-iframe");
    if (!iframe) {
      return;
    }
    var embedUrl = "https://open.spotify.com/embed/" + type + "/" + id + "?utm_source=generator&theme=0";
    iframe.src = embedUrl;
    saveJson(KEYS.spotifyEmbed, embedUrl);
  }

  function setMusicTab(mode) {
    musicTab = mode;
    var isVinyl = (mode === "vinyl");
    qs("tab-vinyl-btn").classList.toggle("is-active", isVinyl);
    qs("tab-vinyl-btn").setAttribute("aria-selected", isVinyl ? "true" : "false");
    qs("tab-spotify-btn").classList.toggle("is-active", !isVinyl);
    qs("tab-spotify-btn").setAttribute("aria-selected", !isVinyl ? "true" : "false");

    qs("vinyl-player-section").hidden = !isVinyl;
    qs("spotify-player-section").hidden = isVinyl;

    if (!isVinyl && !audio.paused) {
      audio.pause();
    }
  }

  function initSpotify() {
    qs("tab-vinyl-btn").addEventListener("click", function () {
      setMusicTab("vinyl");
    });
    qs("tab-spotify-btn").addEventListener("click", function () {
      setMusicTab("spotify");
    });

    qs("spotify-load-btn").addEventListener("click", function () {
      var val = qs("spotify-input").value;
      var parsed = parseSpotifyUrl(val);
      if (!parsed) {
        showToast("Please enter a valid Spotify track, album, or playlist link.");
        return;
      }
      loadSpotifyEmbed(parsed.type, parsed.id);
      showToast("Spotify loaded into music corner 🍓");
      qs("spotify-input").value = "";
    });

    document.querySelectorAll(".preset-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var presetId = chip.dataset.preset;
        loadSpotifyEmbed("playlist", presetId);
        showToast("Loaded preset: " + chip.textContent + " 🍓");
      });
    });

    var savedEmbed = loadJson(KEYS.spotifyEmbed, null);
    if (savedEmbed && typeof savedEmbed === "string" && qs("spotify-iframe")) {
      qs("spotify-iframe").src = savedEmbed;
    }
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator)) {
      return;
    }
    var track = currentTrack();
    if (!track) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || "Donezo Local Song",
        album: "Donezo Soundtrack ♡",
        artwork: [
          {
            src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect fill='%23ffd4e2' width='96' height='96'/><text y='60' x='20' font-size='48'>🍓</text></svg>",
            sizes: "96x96",
            type: "image/svg+xml"
          }
        ]
      });
    } catch (ignore) {}
  }

  function initMediaSession() {
    if (!("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler("play", function () {
        audio.play().catch(function () {});
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        if (playlist.length > 1) {
          loadTrack(trackIndex - 1, !audio.paused);
        }
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        if (playlist.length > 1) {
          loadTrack(trackIndex + 1, !audio.paused);
        }
      });
    } catch (ignore) {}
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
  scrapbook = loadScrapbook();
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
  renderScrapbook();
  initPhotobooth();
  initSpotify();
  initMediaSession();
  maybeNotifyReminders();
  setInterval(maybeNotifyReminders, 15000);
})();
