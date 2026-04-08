import { Card } from '../../../components/ui/Card';
import type { ProjectItem, ProjectStatus } from '../../../types';

const columns: ProjectStatus[] = ['Backlog', 'In Progress', 'Blocked', 'Complete'];

interface ProjectBoardProps {
  projects: ProjectItem[];
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onOpenProject?: (project: ProjectItem) => void;
}

export function ProjectBoard({ projects, onStatusChange, onOpenProject }: ProjectBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((status) => (
        <Card key={status}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{status}</h3>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
              {projects.filter((project) => project.status === status).length}
            </span>
          </div>
          <div className="space-y-3">
            {projects.filter((project) => project.status === status).map((project) => (
              <div key={project.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-medium text-white">{project.name}</h4>
                <p className="mt-2 text-sm text-slate-400">{project.notes}</p>
                {onOpenProject ? (
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    Open Project
                  </button>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">{tag}</span>
                  ))}
                </div>
                <select
                  value={project.status}
                  onChange={(event) => onStatusChange(project.id, event.target.value as ProjectStatus)}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                >
                  {columns.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
