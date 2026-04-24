import { Card, CardHeader } from '../../../app/ui/Card';
import { EmptyState } from '../../../app/ui/EmptyState';

export function UserHardwareModule({ user = null }) {
  return (
    <Card>
      <CardHeader eyebrow="Hardware" title="User Hardware" description="Linked hardware for the currently selected user." />
      <EmptyState
        title="Module coming next"
        description={user ? `Hardware lookups will run for ${user.opid}.` : 'Select a user to inspect hardware.'}
      />
    </Card>
  );
}

export default UserHardwareModule;
