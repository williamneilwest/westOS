import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getDataSourceRecord } from '../app/services/api';
import { useBackNavigation } from '../app/hooks/useBackNavigation';
import { Card, CardHeader } from '../app/ui/Card';
import { SectionHeader } from '../app/ui/SectionHeader';

function formatLabel(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DataRecordPage() {
  const { source = '', id = '' } = useParams();
  const goBack = useBackNavigation('/app/data-sources');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadRecord() {
      if (!source || !id) {
        setError('Missing source or record id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const payload = await getDataSourceRecord(source, id);
        if (ignore) {
          return;
        }
        setRecord(payload?.record && typeof payload.record === 'object' ? payload.record : null);
      } catch (requestError) {
        if (ignore) {
          return;
        }
        setRecord(null);
        setError(requestError.message || 'Record could not be loaded.');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadRecord();
    return () => {
      ignore = true;
    };
  }, [id, source]);

  const entries = useMemo(() => (record && typeof record === 'object' ? Object.entries(record) : []), [record]);

  return (
    <section className="module">
      <SectionHeader
        tag={`/data/view/${source}/${id}`}
        title="Data Record"
        description={`Source: ${source || 'unknown'}`}
        actions={(
          <button className="compact-toggle" type="button" onClick={goBack}>
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      />

      {loading ? <p className="status-text">Loading record...</p> : null}
      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {!loading && !error && !entries.length ? <p className="status-text">No fields available for this record.</p> : null}

      {!loading && !error && entries.length ? (
        <div className="data-grid">
          {entries.map(([key, value]) => (
            <Card key={key}>
              <CardHeader title={formatLabel(key)} />
              <p className="status-text">{String(value ?? '—')}</p>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default DataRecordPage;
