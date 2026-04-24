import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBackNavigation } from '../../app/hooks/useBackNavigation';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { getReferenceEndpoints } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { GatedCard } from '../auth/GatedCard';

export function ConsoleEndpointsPage() {
  const { loading: authLoading, authenticated, isAdmin } = useCurrentUser();
  const location = useLocation();
  const goBack = useBackNavigation('/app/console');
  const backLabel = location.state?.label || 'Console';
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canViewModule = authenticated && isAdmin;

  useEffect(() => {
    if (!canViewModule) {
      setEndpoints([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const data = await getReferenceEndpoints();
        if (!ignore) {
          setEndpoints(Array.isArray(data) ? data : []);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(String(requestError.message || requestError));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [canViewModule]);

  if (authLoading) {
    return <section className="module"><p className="status-text">Checking authorization...</p></section>;
  }

  if (!authenticated) {
    return (
      <section className="module">
        <SectionHeader
          tag="/app/console/endpoints"
          title="API Endpoints"
          description="Backend route registry in a dedicated table view."
          actions={
            <button className="compact-toggle" onClick={goBack} type="button">
              {`Back to ${backLabel}`}
            </button>
          }
        />
        <GatedCard message="Sign in to view this module" />
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="module">
        <SectionHeader
          tag="/app/console/endpoints"
          title="API Endpoints"
          description="Backend route registry in a dedicated table view."
          actions={
            <button className="compact-toggle" onClick={goBack} type="button">
              {`Back to ${backLabel}`}
            </button>
          }
        />
        <GatedCard
          title="Admin access required"
          message="Your account does not have permission to view API endpoint registry data."
          showAction={false}
        />
      </section>
    );
  }

  return (
    <section className="module">
      <SectionHeader
        tag="/app/console/endpoints"
        title="API Endpoints"
        description="Backend route registry in a dedicated table view."
        actions={
          <button className="compact-toggle" onClick={goBack} type="button">
            {`Back to ${backLabel}`}
          </button>
        }
      />

      <Card className="reference-card--wide">
        <CardHeader
          eyebrow="Console Table"
          title="API Endpoints Registry"
          description="Dynamically synced list of backend routes."
        />

        {error ? (
          <p className="status-text status-text--error">{error}</p>
        ) : loading ? (
          <p className="status-text">Loading endpoints...</p>
        ) : endpoints.length ? (
          <div className="data-table-wrap reference-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Methods</th>
                  <th>Path</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.id}>
                    <td>
                      <span className="data-table__cell-content" title={endpoint.name}>
                        {endpoint.name}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__cell-content" title={endpoint.methods}>
                        {endpoint.methods}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__cell-content" title={endpoint.rule}>
                        {endpoint.rule}
                      </span>
                    </td>
                    <td>
                      <span className="data-table__cell-content" title={endpoint.description}>
                        {endpoint.description || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="status-text">No endpoints found.</p>
        )}
      </Card>
    </section>
  );
}
