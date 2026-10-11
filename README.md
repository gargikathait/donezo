# Donezo — Your Daily Task Manager

A lightweight daily task manager that runs entirely in your browser. Add tasks, check them off, filter the list, and keep going — your work is saved on this device.

## Features

- Add tasks with the button or the Enter key
- Mark tasks complete or active with a checkbox
- Delete individual tasks
- Filter by All, Active, or Completed
- Live totals for all tasks, completed tasks, remaining tasks, and progress
- Clear all completed tasks in one click
- Friendly empty states for an empty list or an empty filter
- Tasks persist in localStorage across refreshes and browser restarts
- Responsive layout for desktop and mobile
- Keyboard-friendly controls and accessible labels

## Technologies

- HTML
- CSS
- Vanilla JavaScript
- Browser localStorage

No frameworks, build tools, servers, or packages are required.

## How to run locally

1. Open the project folder.
2. Double-click `index.html`, or open it from your browser:
   - File → Open File → select `index.html`
3. Use the app. No installation or internet connection is needed.

You can also drag `index.html` into a browser window.

## How tasks are saved

Donezo stores your task list in the browser’s localStorage under the key `donezo.tasks`. Every add, complete, delete, and clear-completed action writes the updated list. When you reopen the page, the app reads that data back. If stored data is missing or invalid, Donezo starts with an empty list instead of crashing.

Clearing site data for this file/origin in your browser will remove saved tasks.
