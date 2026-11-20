import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import { Project, loadProjects, saveProjects, writeWindow, removeWindow, loadWindows, status, layout, flatOrder } from './registry';

type Node = { kind: 'group'; name: string; projects: Project[] } | { kind: 'project'; p: Project };

function openProject(p: Project) {
  // `open -a` reuses the window already showing this folder, else opens a new one.
  execFile('open', ['-a', vscode.env.appName, p.path], err => {
    if (err) vscode.window.showErrorMessage(`Cannot open ${p.path}: ${err.message}`);
  });
}

class Tree implements vscode.TreeDataProvider<Node> {
  private ev = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this.ev.event;
  refresh() { this.ev.fire(); }

  getChildren(n?: Node): Node[] {
    if (n?.kind === 'group') return n.projects.map(p => ({ kind: 'project', p }));
    if (n) return [];
    return layout(loadProjects()).flatMap<Node>(l =>
      l.group ? [{ kind: 'group', name: l.group, projects: l.projects }] : l.projects.map(p => ({ kind: 'project', p })));
  }

  getTreeItem(n: Node): vscode.TreeItem {
    if (n.kind === 'group') {
      const t = new vscode.TreeItem(n.name, vscode.TreeItemCollapsibleState.Expanded);
      t.iconPath = new vscode.ThemeIcon('folder');
      return t;
    }
    const s = status(n.p, loadWindows());
    const current = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath === n.p.path;
    const t = new vscode.TreeItem(n.p.name);
    t.description = [n.p.pinned ? '📌' : '', s.dirty ? '● unsaved' : '', current ? '(this window)' : ''].filter(Boolean).join(' ');
    t.tooltip = n.p.path;
    t.iconPath = new vscode.ThemeIcon(s.running ? 'circle-filled' : 'circle-outline',
      s.running ? new vscode.ThemeColor('testing.iconPassed') : undefined);
    t.contextValue = n.p.pinned ? 'projectPinned' : 'project';
    t.command = { command: 'projectSidebar.open', title: 'Open', arguments: [n.p] };
    return t;
  }
}

export function activate(ctx: vscode.ExtensionContext) {
  const id = vscode.env.sessionId;
  const tree = new Tree();
  const edit = (fn: (ps: Project[]) => Project[]) => { saveProjects(fn(loadProjects())); tree.refresh(); };
  const reg = (c: string, f: (...a: any[]) => unknown) => ctx.subscriptions.push(vscode.commands.registerCommand(c, f));
  const add = (dir: string) => edit(ps => ps.some(p => p.path === dir) ? ps : [...ps, { path: dir, name: path.basename(dir) }]);

  const beat = () => {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (folder) writeWindow(id, { path: folder, dirty: vscode.workspace.textDocuments.some(d => d.isDirty), seen: Date.now() });
    tree.refresh();
  };
  beat();
  const timer = setInterval(beat, 3000);
  ctx.subscriptions.push(
    { dispose: () => { clearInterval(timer); removeWindow(id); } },
    vscode.window.registerTreeDataProvider('projectSidebar.view', tree),
  );

  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (folder) add(folder);

  reg('projectSidebar.open', openProject);
  reg('projectSidebar.addCurrent', () => folder ? add(folder) : vscode.window.showWarningMessage('No folder open'));
  reg('projectSidebar.add', async () => {
    const r = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: true });
    r?.forEach(u => add(u.fsPath));
  });
  reg('projectSidebar.quickSwitch', async () => {
    const pick = await vscode.window.showQuickPick(flatOrder(loadProjects()).map(p => ({ label: p.name, description: p.path, p })));
    if (pick) openProject(pick.p);
  });
  reg('projectSidebar.remove', (n: Node) => n.kind === 'project' && edit(ps => ps.filter(p => p.path !== n.p.path)));
  reg('projectSidebar.pin', (n: Node) => n.kind === 'project' && edit(ps => ps.map(p => p.path === n.p.path ? { ...p, pinned: true } : p)));
  reg('projectSidebar.unpin', (n: Node) => n.kind === 'project' && edit(ps => ps.map(p => p.path === n.p.path ? { ...p, pinned: false } : p)));
  reg('projectSidebar.rename', async (n: Node) => {
    if (n.kind !== 'project') return;
    const name = await vscode.window.showInputBox({ value: n.p.name });
    if (name) edit(ps => ps.map(p => p.path === n.p.path ? { ...p, name } : p));
  });
  reg('projectSidebar.setGroup', async (n: Node) => {
    if (n.kind !== 'project') return;
    const group = await vscode.window.showInputBox({ value: n.p.group ?? '', prompt: 'Group name (empty = none)' });
    if (group !== undefined) edit(ps => ps.map(p => p.path === n.p.path ? { ...p, group: group.trim() || undefined } : p));
  });
  for (let i = 1; i <= 9; i++) {
    reg(`projectSidebar.open${i}`, () => { const p = flatOrder(loadProjects())[i - 1]; if (p) openProject(p); });
  }
}

export function deactivate() {}
