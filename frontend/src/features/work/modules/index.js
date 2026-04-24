import { UserGroupsModule } from './UserGroupsModule';
import { CompareGroupsModule } from './CompareGroupsModule';
import { UserHardwareModule } from './UserHardwareModule';

export const USER_ACTIONS = [
  { id: 'groups', label: 'Get Groups', component: UserGroupsModule },
  { id: 'compare', label: 'Compare Groups', component: CompareGroupsModule },
  { id: 'hardware', label: 'View Hardware', component: UserHardwareModule },
];
