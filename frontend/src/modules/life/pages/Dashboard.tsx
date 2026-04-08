import { Activity, FolderKanban, GripVertical, ListChecks, Server, TerminalSquare, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { CommandCenter } from '../modules/dashboard/components/CommandCenter';
import { FeaturedCards } from '../modules/dashboard/components/FeaturedCards';
import { ProjectGrid } from '../modules/dashboard/components/ProjectGrid';
import { QuickActions } from '../modules/dashboard/components/QuickActions';
import { Recommendation, RecommendationsPanel } from '../modules/dashboard/components/RecommendationsPanel';
import { RightSidebar } from '../modules/dashboard/components/RightSidebar';
import { usePlanning } from '../modules/planning/hooks/usePlanning';
import { useProjects } from '../modules/projects/hooks/useProjects';
import { useTasks } from '../modules/tasks/hooks/useTasks';
import { getDashboardSummary } from '../services/api';

type DashboardMode = 'overview' | 'workspace' | 'homelab' | 'tools';
type OverviewSection = 'quick' | 'active' | 'modules';
type CardSize = 'small' | 'medium' | 'large';

type OverviewBlock = {
  id: string;
  label: string;
  section: OverviewSection;
  size: CardSize;
  visible: boolean;
};

const MODE_STORAGE_KEY = 'lifeos-dashboard-mode';
const OVERVIEW_LAYOUT_STORAGE_KEY = 'lifeos-overview-layout-v1';

const MODE_TABS: Array<{ id: DashboardMode; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'tools', label: 'Tools' },
  { id: 'homelab', label: 'Homelab' },
];

const DEFAULT_BLOCKS: OverviewBlock[] = [
  { id: 'quick-actions', label: 'Quick Actions', section: 'quick', size: 'large', visible: true },
  { id: 'command-center', label: 'Command Center', section: 'quick', size: 'large', visible: true },
  { id: 'recommendations', label: 'Recommendations', section: 'active', size: 'large', visible: true },
  { id: 'featured-cards', label: 'Featured Systems', section: 'active', size: 'medium', visible: true },
  { id: 'project-grid', label: 'Project Grid', section: 'active', size: 'large', visible: true },
  { id: 'focus-sidebar', label: 'Focus Sidebar', section: 'modules', size: 'small', visible: true },
];

type HomelabService = {
  id: string;
  category: string;
  name: string;
  status: 'online' | 'offline';
  url: string;
  description: string;
};

const HOMELAB_SERVICES: HomelabService[] = [
  { id: 'portainer', category: 'Infrastructure', name: 'Portainer', status: 'online', url: 'https://portainer.pridebytes.com', description: 'Docker Management' },
  { id: 'cockpit', category: 'Infrastructure', name: 'Cockpit', status: 'online', url: 'https://cockpit.pridebytes.com', description: 'Server Management Interface' },
  { id: 'file-browser', category: 'Infrastructure', name: 'File Browser', status: 'online', url: 'https://files.pridebytes.com', description: 'Media File Management' },
  { id: 'home-assistant', category: 'Smart Home', name: 'Home Assistant', status: 'online', url: 'https://ha.pridebytes.com', description: 'Primary Automation Engine' },
  { id: 'homebridge', category: 'Smart Home', name: 'Homebridge', status: 'online', url: 'https://hb.pridebytes.com', description: 'HomeKit Compatibility Layer' },
  { id: 'plex', category: 'Media', name: 'Plex', status: 'online', url: 'https://plex.pridebytes.com', description: 'Media Server' },
  { id: 'jupyter', category: 'Development', name: 'Jupyter', status: 'online', url: 'https://jupyter.pridebytes.com', description: 'Python notebooks and data science' },
  { id: 'flask-api', category: 'Development', name: 'Flask API', status: 'online', url: 'https://api.pridebytes.com', description: 'PrideBytes Flask automation API' },
  { id: 'recipes', category: 'Kitchen', name: 'Recipes', status: 'online', url: 'https://recipes.pridebytes.com', description: 'Recipe manager' },
  { id: 'pantry', category: 'Kitchen', name: 'Pantry', status: 'online', url: 'https://pantry.pridebytes.com', description: 'Food inventory' },
  { id: 'qbittorrent', category: 'Downloads', name: 'qBittorrent', status: 'online', url: 'https://torrent.pridebytes.com', description: 'Torrent Client' },
  { id: 'portfolio', category: 'Personal', name: 'Portfolio', status: 'online', url: 'https://wnwest.com', description: 'Personal site, projects, and automation systems' },
];

function toGridStatus(status: string): 'running' | 'idle' | 'blocked' {
  if (status === 'In Progress') return 'running';
  if (status === 'Blocked') return 'blocked';
  return 'idle';
}

function loadDashboardMode(): DashboardMode {
  const raw = localStorage.getItem(MODE_STORAGE_KEY);
  if (raw === 'overview' || raw === 'workspace' || raw === 'tools' || raw === 'homelab') {
    return raw;
  }
  return 'overview';
}

function normalizeOverviewBlocks(value: unknown): OverviewBlock[] {
  if (!Array.isArray(value)) return DEFAULT_BLOCKS;
  const parsed = value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const id = String(item.id || '');
      const base = DEFAULT_BLOCKS.find((block) => block.id === id);
      if (!base) return null;
      const size = item.size === 'small' || item.size === 'medium' || item.size === 'large' ? item.size : base.size;
      return {
        ...base,
        size,
        visible: item.visible !== false,
      } as OverviewBlock;
    })
    .filter((item): item is OverviewBlock => Boolean(item));

  const missing = DEFAULT_BLOCKS.filter((block) => !parsed.some((candidate) => candidate.id === block.id));
  return [...parsed, ...missing];
}

function loadOverviewBlocks(): OverviewBlock[] {
  const raw = localStorage.getItem(OVERVIEW_LAYOUT_STORAGE_KEY);
  if (!raw) return DEFAULT_BLOCKS;
  try {
    return normalizeOverviewBlocks(JSON.parse(raw));
  } catch {
    return DEFAULT_BLOCKS;
  }
}

function sizeClass(size: CardSize): string {
  if (size === 'small') return 'md:col-span-1';
  if (size === 'large') return 'md:col-span-2 xl:col-span-3';
  return 'md:col-span-1 xl:col-span-2';
}

function sectionTitle(section: OverviewSection): string {
  if (section === 'quick') return 'Quick Actions';
  if (section === 'active') return 'Active Systems';
  return 'Modules';
}

export function Dashboard() {
  const navigate = useNavigate();
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState<DashboardMode>(() => loadDashboardMode());
  const [editMode, setEditMode] = useState(false);
  const [blocks, setBlocks] = useState<OverviewBlock[]>(() => loadOverviewBlocks());

  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { goals, loading: planningLoading, error: planningError } = usePlanning();
  const {
    data: dashboardSummary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(OVERVIEW_LAYOUT_STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  const today = new Date().toISOString().slice(0, 10);
  const activeTasks = dashboardSummary?.pending_tasks ?? tasks.filter((task) => task.status !== 'done').length;
  const blockers = projects.filter((project) => project.status === 'Blocked').length;
  const overdue = tasks.filter((task) => task.dueDate < today && task.status !== 'done').length;
  const totalProjects = dashboardSummary?.total_projects ?? projects.length;
  const planningCount = dashboardSummary?.planning_count ?? goals.length;
  const totalBalance = dashboardSummary?.total_balance ?? 0;

  const commandStats = {
    tasks: activeTasks,
    blockers,
    urgent: tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length,
    pending: activeTasks,
    financialFlow: totalBalance >= 0 ? 'strong' : 'watch',
  };

  const recommendations = useMemo<Recommendation[]>(
    () => [
      {
        id: 'r1',
        title: `${overdue} overdue tasks need triage`,
        detail: 'Clear overdue project reviews to prevent release delays this evening.',
        severity: overdue > 0 ? 'high' : 'low',
        actionLabel: 'Open Task Queue',
        onAction: () => navigate('/tasks'),
      },
      {
        id: 'r2',
        title: activeTasks > 0 ? 'Task queue needs attention' : 'Task queue is stable',
        detail: 'Review tasks and planning progress to keep weekly execution on track.',
        severity: totalBalance < 0 ? 'high' : 'low',
        actionLabel: 'Open Tasks',
        onAction: () => navigate('/tasks'),
      },
      {
        id: 'r3',
        title: blockers > 0 ? 'Project blockers need attention' : 'Projects moving cleanly',
        detail: 'Inspect blocked items and resolve dependencies to protect delivery pace.',
        severity: blockers > 0 ? 'high' : 'low',
        actionLabel: 'Open Projects',
        onAction: () => navigate('/projects'),
      },
      {
        id: 'r4',
        title: planningCount > 0 ? 'Planning check-in' : 'No planning items yet',
        detail: planningCount > 0 ? 'Review goal progress and update target milestones for this week.' : 'Create planning items to track future milestones.',
        severity: planningCount > 0 ? 'low' : 'medium',
        actionLabel: 'Open Planning',
        onAction: () => navigate('/planning'),
      },
    ],
    [navigate, overdue, totalBalance, blockers, planningCount, activeTasks],
  );

  const filteredRecommendations = focusMode ? recommendations.filter((item) => item.severity !== 'low') : recommendations;

  const orderedProjects = [...projects].sort((a, b) => {
    const aScore = a.status === 'In Progress' ? 3 : a.status === 'Blocked' ? 2 : 1;
    const bScore = b.status === 'In Progress' ? 3 : b.status === 'Blocked' ? 2 : 1;
    return bScore - aScore;
  });

  const primaryProject = orderedProjects[0];
  const secondaryProjects = orderedProjects.slice(1, 3);
  const dashboardError = [projectsError, tasksError, planningError, summaryError instanceof Error ? summaryError.message : null].find(Boolean);
  const isLoadingDashboard = projectsLoading || tasksLoading || planningLoading || summaryLoading;

  const blockById = (id: string) => blocks.find((block) => block.id === id);

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlocks((previous) => {
      const next = [...previous];
      const index = next.findIndex((item) => item.id === blockId);
      if (index < 0) return previous;

      const target = next[index];
      const sectionIndexes = next.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => item.section === target.section);
      const currentSectionIndex = sectionIndexes.findIndex(({ item }) => item.id === blockId);
      if (currentSectionIndex < 0) return previous;

      const swapWith = direction === 'up' ? currentSectionIndex - 1 : currentSectionIndex + 1;
      if (swapWith < 0 || swapWith >= sectionIndexes.length) return previous;

      const sourceIndex = sectionIndexes[currentSectionIndex].itemIndex;
      const destinationIndex = sectionIndexes[swapWith].itemIndex;
      [next[sourceIndex], next[destinationIndex]] = [next[destinationIndex], next[sourceIndex]];
      return next;
    });
  };

  const cycleBlockSize = (blockId: string) => {
    setBlocks((previous) => previous.map((block) => {
      if (block.id !== blockId) return block;
      if (block.size === 'small') return { ...block, size: 'medium' };
      if (block.size === 'medium') return { ...block, size: 'large' };
      return { ...block, size: 'small' };
    }));
  };

  const toggleBlockVisibility = (blockId: string) => {
    setBlocks((previous) => previous.map((block) => (block.id === blockId ? { ...block, visible: !block.visible } : block)));
  };

  const resetLayout = () => {
    setBlocks(DEFAULT_BLOCKS);
    setEditMode(false);
  };

  const renderOverviewBlock = (block: OverviewBlock) => {
    if (!block.visible) return null;

    let content: ReactNode = null;

    if (block.id === 'quick-actions') {
      content = (
        <QuickActions
          actions={[
            { id: 'qa1', label: 'Run Daily Sync', icon: Activity, onClick: () => navigate('/projects') },
            { id: 'qa2', label: 'Log Progress', icon: ListChecks, onClick: () => navigate('/tasks') },
            { id: 'qa3', label: 'Update Goal', icon: FolderKanban, onClick: () => navigate('/planning') },
            { id: 'qa4', label: 'Open Projects', icon: FolderKanban, onClick: () => navigate('/projects') },
            { id: 'qa5', label: 'Execute Script', icon: TerminalSquare, onClick: () => navigate('/tools') },
          ]}
          onConfigure={() => navigate('/tools')}
        />
      );
    }

    if (block.id === 'command-center') {
      content = (
        <CommandCenter
          userName="Will"
          stats={commandStats}
          focusMode={focusMode}
          onRunMyDay={() => navigate('/projects')}
          onToggleFocusMode={() => setFocusMode((prev) => !prev)}
          onSyncAllData={() => navigate('/tools')}
        />
      );
    }

    if (block.id === 'recommendations') {
      content = <RecommendationsPanel items={filteredRecommendations} />;
    }

    if (block.id === 'featured-cards') {
      content = (
        <FeaturedCards
          items={[
            {
              id: 'f1',
              title: 'Daily Orchestration',
              description: 'Morning workflow bundle and task sync pipeline.',
              progress: activeTasks > 0 ? Math.max(30, 100 - activeTasks * 5) : 90,
              status: blockers > 0 ? 'idle' : 'running',
              metric: `${activeTasks} active tasks / ${totalProjects} projects`,
              onOpen: () => navigate('/projects'),
            },
            {
              id: 'f2',
              title: 'Planning Control Loop',
              description: 'Goal tracking, target updates, and progress checks.',
              progress: planningCount > 0 ? Math.max(20, Math.min(95, planningCount * 20)) : 40,
              status: 'idle',
              metric: `${planningCount} tracked goals`,
              onOpen: () => navigate('/planning'),
            },
          ]}
        />
      );
    }

    if (block.id === 'project-grid' && primaryProject) {
      content = (
        <ProjectGrid
          primary={{
            id: primaryProject.id,
            name: primaryProject.name,
            status: toGridStatus(primaryProject.status),
            summary: primaryProject.notes,
            keyTasks: tasks.slice(0, 3).map((task) => task.title),
            onOpen: () => navigate('/projects'),
          }}
          secondary={secondaryProjects.map((project) => ({
            id: project.id,
            name: project.name,
            status: toGridStatus(project.status),
            summary: project.notes,
            keyTasks: [],
            onOpen: () => navigate('/projects'),
          }))}
        />
      );
    }

    if (block.id === 'focus-sidebar') {
      content = <RightSidebar onStartFocus={() => setFocusMode(true)} />;
    }

    if (!content) return null;

    return (
      <div key={block.id} className={`rounded-2xl border border-white/10 bg-zinc-900/35 p-2 transition-all ${sizeClass(block.size)}`}>
        {editMode ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 px-2 py-1">
            <div className="inline-flex items-center gap-2 text-xs text-slate-300">
              <GripVertical className="h-3.5 w-3.5 text-cyan-300" />
              {block.label}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => moveBlock(block.id, 'up')}>Up</Button>
              <Button variant="ghost" onClick={() => moveBlock(block.id, 'down')}>Down</Button>
              <Button variant="ghost" onClick={() => cycleBlockSize(block.id)}>{block.size}</Button>
              <Button variant="ghost" onClick={() => toggleBlockVisibility(block.id)}>Hide</Button>
            </div>
          </div>
        ) : null}
        {content}
      </div>
    );
  };

  const overviewSections: OverviewSection[] = ['quick', 'active', 'modules'];

  return (
    <div className="space-y-4 overflow-x-hidden pb-6 md:space-y-6">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-2 sm:min-w-0">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`rounded-full border px-3 py-2 text-xs transition-all ${
                mode === tab.id
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-zinc-900/40 text-slate-300 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'overview' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
          <p className="text-xs text-slate-300">Customize your command center modules, layout, and visibility.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setEditMode((prev) => !prev)}>{editMode ? 'Done' : 'Edit Mode'}</Button>
            <Button variant="ghost" onClick={resetLayout}>Reset Layout</Button>
          </div>
        </div>
      ) : null}

      {isLoadingDashboard ? <p className="text-sm text-slate-400">Loading dashboard data...</p> : null}
      {dashboardError ? <p className="text-sm text-rose-300">Dashboard data partially unavailable: {dashboardError}</p> : null}

      {mode === 'overview' ? (
        <>
          {editMode ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/35 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Visible Modules</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {blocks.map((block) => (
                  <label key={block.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/50 px-2 py-2 text-xs text-slate-200">
                    <input type="checkbox" checked={block.visible} onChange={() => toggleBlockVisibility(block.id)} className="h-4 w-4" />
                    {block.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {overviewSections.map((section) => (
            <section key={section} className="space-y-3">
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400">{sectionTitle(section)}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {blocks.filter((block) => block.section === section).map((block) => renderOverviewBlock(block))}
              </div>
            </section>
          ))}
        </>
      ) : null}

      {mode === 'workspace' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/workplace')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Workspace</p>
            <p className="mt-1 text-lg font-semibold text-white">Ticket Operations</p>
            <p className="mt-2 text-sm text-slate-300">Open the focused ticket dashboard with quick links and analysis actions.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Tasks</p>
            <p className="mt-1 text-lg font-semibold text-white">Execution Queue</p>
            <p className="mt-2 text-sm text-slate-300">Review active tasks, prioritize blockers, and clear overdue work quickly.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <p className="text-xs uppercase tracking-wide text-cyan-200">Projects</p>
            <p className="mt-1 text-lg font-semibold text-white">Delivery Board</p>
            <p className="mt-2 text-sm text-slate-300">Track milestones, unblock stalled workstreams, and update status in one place.</p>
          </button>
        </div>
      ) : null}

      {mode === 'homelab' ? (
        <div className="space-y-5">
          {Array.from(new Set(HOMELAB_SERVICES.map((service) => service.category))).map((category) => (
            <section key={category} className="space-y-3">
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400">{category}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {HOMELAB_SERVICES.filter((service) => service.category === category).map((service) => (
                  <a
                    key={service.id}
                    href={service.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-emerald-300/30 hover:shadow-[0_0_22px_rgba(16,185,129,0.14)]"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Server className="h-4 w-4 text-emerald-300" />
                      <p className="text-base font-semibold text-white">{service.name}</p>
                    </div>
                    <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] uppercase tracking-wide ${service.status === 'online' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                      {service.status}
                    </p>
                    <p className="mt-3 text-sm text-slate-300">{service.description}</p>
                    <span className="mt-3 inline-flex rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200">Open</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {mode === 'tools' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">Tool Modules</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Open utility modules sorted by usage and add new tools.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">API / Dev Tools</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Jump to API modules for endpoint checks and quick operational calls.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="rounded-2xl border border-white/10 bg-zinc-900/45 p-4 text-left transition-all hover:border-cyan-300/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          >
            <div className="inline-flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-cyan-300" />
              <p className="text-base font-semibold text-white">Quick Actions</p>
            </div>
            <p className="mt-3 text-sm text-slate-300">Run shortcuts and automation actions from one mobile-friendly panel.</p>
          </button>
        </div>
      ) : null}
    </div>
  );
}
