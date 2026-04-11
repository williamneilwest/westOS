import { Network, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserGroups } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

export function GetUserGroupsPage() {
  const [userOpid, setUserOpid] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedOpid = userOpid.trim();
    if (!normalizedOpid) {
      setResult(null);
      setError('Enter a user OPID before running the lookup.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await getUserGroups(normalizedOpid);
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setError(requestError.message || 'User group lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="module">
      <SectionHeader
        tag="/app/work/get-user-groups"
        title="Get User Groups"
        description="Call the Power Automate flow with a user OPID, cache any missing group IDs, and resolve known group names from the reference table."
        actions={
          <Link className="ui-button ui-button--secondary" to="/app/work">
            Back to Work Hub
          </Link>
        }
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <div className="card-grid">
        <Card className="landing__card">
          <CardHeader
            eyebrow="Flow Input"
            title="Lookup User Membership"
            description='Uses scriptName "Get User Groups" and passes the provided user_opid to the flow.'
          />

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field">
              <span>User OPID</span>
              <input
                type="text"
                value={userOpid}
                onChange={(event) => setUserOpid(event.target.value)}
                placeholder="Example: wnwd6f"
              />
            </label>
            <button type="submit" className="ui-button ui-button--primary" disabled={loading}>
              {loading ? 'Loading…' : 'Get User Groups'}
            </button>
          </form>
        </Card>

        <Card className="landing__card">
          <CardHeader
            eyebrow="Summary"
            title="Resolved Groups"
            description="Known groups keep their cached names. Unknown IDs are saved into the group table with the ID as the fallback name."
            action={
              <span className="icon-badge">
                <Network size={16} />
              </span>
            }
          />

          {result ? (
            <div className="association-summary">
              <div className="association-summary__row">
                <span>User OPID</span>
                <strong>{result.userOpid}</strong>
              </div>
              <div className="association-summary__row">
                <span>Identified Groups</span>
                <strong>
                  These groups identified ({result.identifiedCount} out of {result.totalCount} total)
                </strong>
              </div>
              <div className="association-summary__row">
                <span>New IDs Cached</span>
                <strong>{result.created}</strong>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Search size={20} />}
              title="No lookup run yet"
              description="Submit a user OPID to resolve the user’s group IDs against the cached group table."
            />
          )}
        </Card>
      </div>

      <Card className="reference-card reference-card--wide">
        <CardHeader
          eyebrow="Output"
          title="User Group Results"
          description="The table returns each group ID plus the cached name when the group already exists in the reference table."
        />

        {result?.items?.length ? (
          <div className="data-table-wrap reference-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Group ID</th>
                  <th>Name</th>
                  <th>Identified</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <span className="data-table__cell-content" title={group.id}>
                        {group.id}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__cell-content" title={group.name}>
                        {group.name}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__cell-content" title={group.identified ? 'Identified' : 'Cached by ID'}>
                        {group.identified ? 'Identified' : 'Cached by ID'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Search size={20} />}
            title="No groups returned"
            description="The results table will appear here after a successful flow lookup."
          />
        )}
      </Card>
    </section>
  );
}
