import { ArrowRight, CheckCircle2, ListChecks } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export interface ProjectItem {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'blocked';
  summary: string;
  keyTasks: string[];
  onOpen: () => void;
}

interface ProjectGridProps {
  primary: ProjectItem;
  secondary: ProjectItem[];
}

const statusColor = {
  running: 'bg-emerald-300',
  idle: 'bg-zinc-300',
  blocked: 'bg-amber-300',
} as const;

export function ProjectGrid({ primary, secondary }: ProjectGridProps) {
  return (
    <section>
      <SectionHeader title="Projects" description="Primary and secondary initiatives with direct actions." className="mb-3" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <Card variant="featured" className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Primary Project</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{primary.name}</h3>
              <p className="mt-2 text-sm text-zinc-400">{primary.summary}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/70 px-2 py-1 text-xs uppercase tracking-wide text-zinc-200">
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor[primary.status]} ${primary.status === 'running' ? 'animate-pulse' : ''}`} />
              {primary.status}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Key Tasks</p>
            <ul className="mt-2 space-y-2">
              {primary.keyTasks.map((task) => (
                <li key={task} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  {task}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={primary.onOpen}>
              Open Project
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={primary.onOpen}>
              <ListChecks className="mr-2 h-4 w-4" />
              View Tasks
            </Button>
          </div>
        </Card>

        <div className="space-y-4 md:space-y-6">
          {secondary.map((project) => (
            <Card key={project.id} variant="compact">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-white">{project.name}</h4>
                  <p className="mt-1 text-xs text-zinc-400">{project.summary}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor[project.status]} ${project.status === 'running' ? 'animate-pulse' : ''}`} />
                  {project.status}
                </span>
              </div>
              <button
                type="button"
                onClick={project.onOpen}
                className="mt-3 inline-flex items-center gap-1 text-sm text-zinc-300 transition-all duration-200 hover:text-white"
              >
                Open
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
