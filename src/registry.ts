import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface Project { path: string; name: string; group?: string; pinned?: boolean }
export interface WindowInfo { path: string; dirty: boolean; seen: number }

export const STALE_MS = 10_000;
const dir = path.join(os.homedir(), '.vscode-projects');
const projectsFile = path.join(dir, 'projects.json');
const windowsDir = path.join(dir, 'windows');

export function loadProjects(): Project[] {
  try { return JSON.parse(fs.readFileSync(projectsFile, 'utf8')); } catch { return []; }
}

export function saveProjects(p: Project[]): void {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = projectsFile + '.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(p, null, 2));
  fs.renameSync(tmp, projectsFile);
}

// One file per window, so windows never write the same file.
export function writeWindow(id: string, info: WindowInfo): void {
  fs.mkdirSync(windowsDir, { recursive: true });
  fs.writeFileSync(path.join(windowsDir, id + '.json'), JSON.stringify(info));
}

export function removeWindow(id: string): void {
  try { fs.unlinkSync(path.join(windowsDir, id + '.json')); } catch { /* already gone */ }
}

export function loadWindows(): WindowInfo[] {
  try {
    return fs.readdirSync(windowsDir).flatMap(f => {
      try { return [JSON.parse(fs.readFileSync(path.join(windowsDir, f), 'utf8')) as WindowInfo]; } catch { return []; }
    });
  } catch { return []; }
}

export function status(p: Project, windows: WindowInfo[], now = Date.now()) {
  const live = windows.filter(w => w.path === p.path && now - w.seen < STALE_MS);
  return { running: live.length > 0, dirty: live.some(w => w.dirty) };
}

// Pinned first, then name. Ungrouped projects come before groups.
export function layout(projects: Project[]): { group?: string; projects: Project[] }[] {
  const sort = (a: Project, b: Project) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name);
  const groups = [...new Set(projects.map(p => p.group).filter((g): g is string => !!g))].sort();
  return [
    { projects: projects.filter(p => !p.group).sort(sort) },
    ...groups.map(g => ({ group: g, projects: projects.filter(p => p.group === g).sort(sort) })),
  ];
}

export const flatOrder = (projects: Project[]): Project[] => layout(projects).flatMap(l => l.projects);
