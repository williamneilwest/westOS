import { Card, CardHeader } from '../../../app/ui/Card';
import { EmptyState } from '../../../app/ui/EmptyState';

export function CompareGroupsModule({ user = null }) {
  return (
    <Card>
      <CardHeader eyebrow="Groups" title="Compare Groups" description="Compare memberships and detect drift for the selected user." />
      <EmptyState
        title="Module coming next"
        description={user ? `Compare workflows will target ${user.opid}.` : 'Select a user to start comparisons.'}
      />
    </Card>
  );
}

export default CompareGroupsModule;
