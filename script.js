(function () {
  "use strict";

  var STORAGE_KEY = "donezo.tasks";
  var tasks = [];
  var currentFilter = "all";

  var form = document.getElementById("task-form");
  var input = document.getElementById("task-input");
  var list = document.getElementById("task-list");
  var emptyState = document.getElementById("empty-state");
  var emptyMessage = document.getElementById("empty-message");
  var clearCompletedBtn = document.getElementById("clear-completed");
  var filterButtons = document.querySelectorAll(".filter");
  var statTotal = document.getElementById("stat-total");
  var statCompleted = document.getElementById("stat-completed");
  var statRemaining = document.getElementById("stat-remaining");
  var progressFill = document.getElementById("progress-fill");
  var progressBar = document.getElementById("progress-bar");
  var progressLabel = document.getElementById("progress-label");

  function createId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter(function (item) {
          return (
            item &&
            typeof item === "object" &&
            typeof item.text === "string" &&
            item.text.trim() !== ""
          );
        })
        .map(function (item) {
          return {
            id: typeof item.id === "string" ? item.id : createId(),
            text: item.text.trim(),
            completed: Boolean(item.completed),
          };
        });
    } catch (error) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      // Storage may be full or blocked; keep the in-memory list usable.
    }
  }

  function getVisibleTasks() {
    if (currentFilter === "active") {
      return tasks.filter(function (task) {
        return !task.completed;
      });
    }
    if (currentFilter === "completed") {
      return tasks.filter(function (task) {
        return task.completed;
      });
    }
    return tasks.slice();
  }

  function updateStats() {
    var total = tasks.length;
    var completed = tasks.filter(function (task) {
      return task.completed;
    }).length;
    var remaining = total - completed;
    var percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    statTotal.textContent = String(total);
    statCompleted.textContent = String(completed);
    statRemaining.textContent = String(remaining);
    progressFill.style.width = percent + "%";
    progressBar.setAttribute("aria-valuenow", String(percent));
    progressLabel.textContent = percent + "% complete";

    var hasCompleted = completed > 0;
    clearCompletedBtn.hidden = !hasCompleted;
    clearCompletedBtn.disabled = !hasCompleted;
  }

  function updateEmptyState(visibleCount) {
    if (visibleCount > 0) {
      emptyState.hidden = true;
      return;
    }

    emptyState.hidden = false;
    if (tasks.length === 0) {
      emptyMessage.textContent = "No tasks yet. Add one above to get started.";
    } else if (currentFilter === "active") {
      emptyMessage.textContent = "Nothing left to do. Enjoy the quiet.";
    } else if (currentFilter === "completed") {
      emptyMessage.textContent = "No completed tasks yet. Check something off.";
    } else {
      emptyMessage.textContent = "No tasks to show.";
    }
  }

  function render() {
    var visible = getVisibleTasks();
    list.replaceChildren();

    visible.forEach(function (task) {
      var item = document.createElement("li");
      item.className = "task-item" + (task.completed ? " is-complete" : "");
      item.dataset.id = task.id;

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", "Mark \"" + task.text + "\" as " + (task.completed ? "active" : "complete"));

      var name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.text;

      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "icon-btn";
      deleteBtn.setAttribute("aria-label", "Delete \"" + task.text + "\"");
      deleteBtn.innerHTML =
        '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.5 1.75A.75.75 0 0 1 7.25 1h1.5a.75.75 0 0 1 .75.75V3h3.25a.75.75 0 0 1 0 1.5h-.38l-.5 8.12A2.25 2.25 0 0 1 9.63 14.8H6.37a2.25 2.25 0 0 1-2.24-2.18L3.63 4.5H3.25a.75.75 0 0 1 0-1.5H6.5V1.75Zm1.5.75v.5h-1.5v-.5h1.5ZM5.14 4.5l.49 8.02c.03.46.41.8.87.8h3.26c.46 0 .84-.34.87-.8L11.12 4.5H5.14Z"/></svg>';

      item.append(checkbox, name, deleteBtn);
      list.append(item);
    });

    updateEmptyState(visible.length);
    updateStats();
  }

  function addTask(text) {
    var trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    tasks.unshift({
      id: createId(),
      text: trimmed,
      completed: false,
    });
    saveTasks();
    render();
  }

  function toggleTask(id) {
    var task = tasks.find(function (item) {
      return item.id === id;
    });
    if (!task) {
      return;
    }
    task.completed = !task.completed;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });
    saveTasks();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter(function (task) {
      return !task.completed;
    });
    saveTasks();
    render();
  }

  function setFilter(nextFilter) {
    currentFilter = nextFilter;
    filterButtons.forEach(function (button) {
      var isActive = button.dataset.filter === nextFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    render();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  list.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }
    var item = target.closest(".task-item");
    if (!item) {
      return;
    }
    toggleTask(item.dataset.id);
  });

  list.addEventListener("click", function (event) {
    var button = event.target.closest(".icon-btn");
    if (!button) {
      return;
    }
    var item = button.closest(".task-item");
    if (!item) {
      return;
    }
    deleteTask(item.dataset.id);
  });

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setFilter(button.dataset.filter);
    });
  });

  clearCompletedBtn.addEventListener("click", clearCompleted);

  tasks = loadTasks();
  render();
})();
