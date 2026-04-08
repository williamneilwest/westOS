import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Badge, Button, Modal, SectionHeader } from '../../../components/ui';
import { projectService, type ExampleProject } from '../../../services/projectService';
import { taskService } from '../../../services/taskService';
import type { Project, Task } from '../../../types';
import { ProjectBoard } from '../components/ProjectBoard';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectsOverview } from '../components/ProjectsOverview';
import { useProjects } from '../hooks/useProjects';

const CATEGORY_ORDER = ['Backend', 'Frontend', 'Integration', 'Optimization'];

function groupedTasks(tasks: Task[]) {
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const category = task.category || 'General';
    acc[category] = acc[category] || [];
    acc[category].push(task);
    return acc;
  }, {});

  return Object.entries(grouped).sort(([left], [right]) => {
    const leftIndex = CATEGORY_ORDER.indexOf(left);
    const rightIndex = CATEGORY_ORDER.indexOf(right);
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    return safeLeft - safeRight || left.localeCompare(right);
  });
}

export function ProjectsPage() {
  const { projects, addProject, updateStatus, loading, error, successMessage } = useProjects();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const {
    data: examplePayload,
    isLoading: examplesLoading,
    error: examplesError,
  } = useQuery({
    queryKey: ['projects', 'examples'],
    queryFn: projectService.getExamples,
    refetchInterval: 30_000,
  });

  const { data: taskPayload } = useQuery({
    queryKey: ['tasks', 'projects'],
    queryFn: taskService.getAll,
    refetchInterval: 15_000,
  });

  const exampleProjects = examplePayload?.data || [];
  const nonExampleProjects = projects.filter((project) => project.type !== 'example');

  const summary = {
    total: nonExampleProjects.length,
    active: nonExampleProjects.filter((project) => project.status === 'In Progress').length,
    blocked: nonExampleProjects.filter((project) => project.status === 'Blocked').length,
  };

  const selectedProjectTasks = useMemo(() => {
    if (!selectedProject) {
      return [] as Task[];
    }

    const exampleMatch = exampleProjects.find((project) => project.id === selectedProject.id);
    if (exampleMatch) {
      return exampleMatch.tasks || [];
    }

    const allTasks = taskPayload?.data || [];
    return allTasks.filter((task) => task.projectId === selectedProject.id);
  }, [selectedProject, exampleProjects, taskPayload?.data]);

  const categorizedTasks = useMemo(() => groupedTasks(selectedProjectTasks), [selectedProjectTasks]);

  const openProjectDetails = (project: Project) => {
    setSelectedProject(project);
    setShowAllDetails(false);
    setExpandedTasks({});
  };

  const toggleTaskDetails = (taskId: string) => {
    setExpandedTasks((current) => ({
      ...current,
      [taskId]: !current[taskId],
    }));
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <SectionHeader
        eyebrow="Module"
        title="Projects"
        description="Run your personal and professional projects through a lightweight board."
        actions={
          <>
            <Badge variant="info">Persistent</Badge>
            <Button onClick={() => setOpen(true)}>Add Project</Button>
          </>
        }
      />

      <ProjectsOverview summary={summary} />
      {loading ? <p className="text-sm text-slate-400">Loading projects...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

      <ProjectBoard projects={nonExampleProjects} onStatusChange={updateStatus} onOpenProject={openProjectDetails} />

      <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-emerald-500/10 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Example Projects
            </h3>
            <p className="mt-1 text-sm text-slate-300">Prebuilt completed workflows generated from major app capabilities.</p>
          </div>
          <Badge variant="info">Feature Examples</Badge>
        </div>

        {examplesLoading ? <p className="text-sm text-slate-300">Loading example projects...</p> : null}
        {examplesError instanceof Error ? <p className="text-sm text-rose-300">{examplesError.message}</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {exampleProjects.map((project: ExampleProject) => (
            <article key={project.id} className="rounded-xl border border-white/15 bg-black/20 p-4 transition hover:border-cyan-300/40">
              <h4 className="text-base font-semibold text-white">{project.name}</h4>
              <p className="mt-2 text-sm text-slate-300">{project.description}</p>
              <p className="mt-2 text-xs text-cyan-100/80">{project.tasks.length} completed tasks</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.tags.slice(0, 4).map((tag) => (
                  <span key={`${project.id}-${tag}`} className="rounded-full border border-white/15 px-2 py-1 text-xs text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => openProjectDetails(project)}>
                Open Project
              </Button>
            </article>
          ))}
        </div>
      </section>

      <Modal title={selectedProject?.name || 'Project Details'} open={Boolean(selectedProject)} onClose={() => setSelectedProject(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-300 break-words">{selectedProject?.description || selectedProject?.notes || 'No project description available.'}</p>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-sm text-slate-200">Show Details</span>
            <button
              type="button"
              className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              onClick={() => setShowAllDetails((current) => !current)}
            >
              {showAllDetails ? 'Hide All' : 'Expand All'}
            </button>
          </div>

          {categorizedTasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks found for this project yet.</p>
          ) : (
            categorizedTasks.map(([category, tasks]) => (
              <section key={category} className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">{category}</h4>
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const isExpanded = showAllDetails || Boolean(expandedTasks[task.id]);
                    const details = task.details || 'No implementation details provided.';

                    return (
                      <article key={task.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium text-white break-words">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300 animate-[pulse_3s_ease-in-out_infinite]" />
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-300 break-words">{task.description || 'No task description.'}</p>
                          </div>

                          {!showAllDetails ? (
                            <button
                              type="button"
                              onClick={() => toggleTaskDetails(task.id)}
                              className="shrink-0 rounded-md border border-white/15 p-1 text-slate-200 transition hover:border-cyan-300/40"
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          ) : null}
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'mt-2 max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2 text-xs leading-5 text-cyan-50 break-words">
                            {details}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </Modal>

      <Modal title="Create Project" open={open} onClose={() => setOpen(false)}>
        <ProjectForm
          onSubmit={(project) => {
            void addProject(project);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
