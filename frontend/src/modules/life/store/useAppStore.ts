import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ToolModule } from '../modules/tools/types';

export type ThemeMode = 'dark' | 'light';
export type ModuleId = 'dashboard' | 'services' | 'workplace' | 'scripts' | 'finance' | 'projects' | 'homelab' | 'tasks' | 'planning' | 'tools' | 'database';

export interface UserPreferences {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  hideMobileTabs: boolean;
}

export interface QuickStats {
  netWorth: number;
  activeProjects: number;
  pendingTasks: number;
  homelabUptime: number;
}

interface AppStore {
  preferences: UserPreferences;
  quickStats: QuickStats;
  activeModules: ModuleId[];
  tools: ToolModule[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleHideMobileTabs: () => void;
  setActiveModules: (modules: ModuleId[]) => void;
  setQuickStats: (stats: Partial<QuickStats>) => void;
  setTools: (tools: ToolModule[]) => void;
  addTool: (tool: ToolModule) => void;
  updateTool: (tool: ToolModule) => void;
  removeTool: (toolId: string) => void;
}

export const defaultActiveModules: ModuleId[] = ['workplace', 'dashboard', 'finance', 'tools', 'database'];
const validModules = new Set<ModuleId>(['dashboard', 'services', 'workplace', 'scripts', 'finance', 'projects', 'homelab', 'tasks', 'planning', 'tools', 'database']);

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      preferences: {
        theme: 'dark',
        sidebarCollapsed: false,
        hideMobileTabs: false,
      },
      quickStats: {
        netWorth: 248500,
        activeProjects: 4,
        pendingTasks: 9,
        homelabUptime: 99.7,
      },
      activeModules: defaultActiveModules,
      tools: [],
      toggleTheme: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            theme: state.preferences.theme === 'dark' ? 'light' : 'dark',
          },
        })),
      toggleSidebar: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            sidebarCollapsed: !state.preferences.sidebarCollapsed,
          },
        })),
      toggleHideMobileTabs: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            hideMobileTabs: !state.preferences.hideMobileTabs,
          },
        })),
      setActiveModules: (modules) => set({ activeModules: modules }),
      setQuickStats: (stats) =>
        set((state) => ({
          quickStats: {
            ...state.quickStats,
            ...stats,
          },
        })),
      setTools: (tools) => set({ tools }),
      addTool: (tool) =>
        set((state) => ({
          tools: [...state.tools, tool],
        })),
      updateTool: (tool) =>
        set((state) => ({
          tools: state.tools.map((candidate) => (candidate.id === tool.id ? tool : candidate)),
        })),
      removeTool: (toolId) =>
        set((state) => ({
          tools: state.tools.filter((candidate) => candidate.id !== toolId),
        })),
    }),
    {
      name: 'life-os-app-store',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppStore> | undefined;
        const persistedModules = Array.isArray(state?.activeModules) ? state.activeModules : defaultActiveModules;
        const normalizedActiveModules = [...new Set(persistedModules.filter((module): module is ModuleId => validModules.has(module as ModuleId)))];
        if (!normalizedActiveModules.includes('database')) {
          normalizedActiveModules.push('database');
        }

        return {
          ...state,
          tools: Array.isArray(state?.tools) ? state.tools : [],
          preferences: state?.preferences || {
            theme: 'dark',
            sidebarCollapsed: false,
            hideMobileTabs: false,
          },
          activeModules: normalizedActiveModules,
        } as AppStore;
      },
      partialize: (state) => ({
        preferences: state.preferences,
        activeModules: state.activeModules,
      }),
    },
  ),
);
