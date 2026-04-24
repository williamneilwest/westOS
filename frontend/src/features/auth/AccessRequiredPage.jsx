import { Button } from '../../app/ui/Button';
import { Card, CardHeader } from '../../app/ui/Card';

function goToWorkPortal() {
  window.location.href = 'https://work.westos.dev';
}

function reloadPage() {
  window.location.reload();
}

export function AccessRequiredPage() {
  return (
    <section
      className="module"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '560px', width: '100%' }}>
        <Card className="readme-panel">
          <CardHeader
            eyebrow="Authentication"
            title="Access Required"
            description="This area of the application is restricted. Please authenticate to continue."
          />

          <Card className="readme-panel" tone="emerald">
            <p className="ui-card__description" style={{ margin: 0 }}>
              If you recently entered incorrect credentials, refresh the page to try again.
            </p>
          </Card>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button onClick={reloadPage} type="button" variant="secondary">
              Reload Page
            </Button>
            <Button onClick={goToWorkPortal} type="button">
              Go to Work Portal
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
