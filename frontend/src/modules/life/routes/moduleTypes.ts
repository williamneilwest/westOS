import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import type { ModuleId } from '../store/useAppStore';

export interface ModuleNavigationItem {
  id: ModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface LifeOsModule {
  id: ModuleId;
  nav: ModuleNavigationItem;
  routes: RouteObject[];
}
