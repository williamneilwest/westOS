import { useEffect, useState } from 'react';
import { getSystemStatus } from '../../app/services/api';

export function ConsolePage() {
  const [services, setServices] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const result = await getSystemStatus();

        if (!isMounted) {
          return;
        }

        const status = result.data;
        setSystemStatus(status);
        setServices([
          { label: 'backend', status: status.backend },
          { label: 'ai-gateway', status: status.ai_gateway },
          { label: 'frontend', status: status.frontend }
        ]);
      } catch {
        if (!isMounted) {
          return;
        }

        setSystemStatus(null);
        setServices([
          { label: 'backend', status: 'down' },
          { label: 'ai-gateway', status: 'down' },
          { label: 'frontend', status: 'down' }
        ]);
      }
    }

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="module">
      <header className="module__header">
        <span className="module__tag">/console</span>
        <h2>Console</h2>
        <p>A narrow status surface for service checks and runtime visibility.</p>
      </header>

      <section className="console">
        <div className="console__row console__row--header">
          <span>service</span>
          <span>state</span>
        </div>
        {services.map((service) => (
          <div className="console__row" key={service.label}>
            <span className="console__service">
              <i className={`status-dot status-dot--${service.status}`} />
              {service.label}
            </span>
            <strong>{service.status}</strong>
          </div>
        ))}
      </section>

      {systemStatus ? (
        <section className="card console-summary">
          <h3>Backend status</h3>
          <div className="stack-list">
            <div className="stack-row">
              <span>environment</span>
              <strong>{systemStatus.environment}</strong>
            </div>
            <div className="stack-row">
              <span>timestamp</span>
              <strong>{systemStatus.timestamp}</strong>
            </div>
            <div className="stack-row">
              <span>backend http</span>
              <strong>{systemStatus.details.backend.httpStatus || 'n/a'}</strong>
            </div>
            <div className="stack-row">
              <span>ai http</span>
              <strong>{systemStatus.details.ai_gateway.httpStatus || 'n/a'}</strong>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
