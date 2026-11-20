# Project Sidebar

A VS Code extension (macOS) that adds a "Projects" view to the Activity Bar. It lists all your projects. Click one to jump to its VS Code window, or open it if it isn't open yet.

It works with separate VS Code windows, one per project, so each project keeps its own editors and terminals. The sidebar in every window lets you navigate between them.

## Features

- Project list with status: green dot = open, hollow dot = closed, `● unsaved` = has unsaved changes, `(this window)` = current window.
- Click a project to focus its window (or open it).
- Pin projects, group them, rename and remove them (right-click).
- Shortcuts: `cmd+alt+1..9` opens the Nth project in the list, `cmd+alt+P` opens a quick-pick.
- Any folder you open is added to the list automatically.

## Install

Requires Node.js and VS Code with the `code` command on your PATH.

```sh
npm install
npm run package
code --install-extension project-sidebar-0.0.1.vsix
```

Then reload VS Code. A "Projects" icon appears in the Activity Bar.

## Usage

- Add more projects with the **+** button in the view title, or the "Projects: Add Folder..." command.
- Order is: pinned first, then alphabetical. Ungrouped projects come before groups.

## Development

```sh
npm test        # build + unit tests
npm run build   # compile to out/
```

Press `F5` in VS Code to launch an Extension Development Host.

## How it works

State lives in `~/.vscode-projects/`: `projects.json` holds the list, and `windows/` holds one heartbeat file per open window (refreshed every 3 seconds; a window is considered closed after 10 seconds without a heartbeat). Switching runs `open -a "<VS Code app>" <folder>`.

## Limitations

macOS only. No drag-and-drop reordering. Remote/SSH folders are not supported.
