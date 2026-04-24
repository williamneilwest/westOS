import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../app/services/auth';
import { Card } from '../../app/ui/Card';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';

const ROLE_CONFIG = {
  guest: {
    label: 'Guest',
    description: 'Public access to work viewing only.',
    permissions: ['View work module only'],
    routes: ['/api/work/view*'],
    tone: 'guest',
  },
  user: {
    label: 'User',
    description: 'Standard execution access for work and data tools.',
    permissions: ['View work module', 'Run scripts', 'Use AI tools', 'Upload data'],
    routes: ['/api/work/*', '/api/data/*', '/api/ai/*'],
    tone: 'user',
  },
  readonly: {
    label: 'Readonly',
    description: 'View-only access with no mutation or flow execution rights.',
    permissions: ['View tickets', 'View flow history'],
    routes: ['/api/tickets*', '/api/flows/runs*'],
    tone: 'guest',
  },
  admin: {
    label: 'Admin',
    description: 'Full platform access including system and console controls.',
    permissions: ['Full access'],
    routes: ['/api/work/*', '/api/data/*', '/api/ai/*', '/api/system/*', '/api/console/*'],
    tone: 'admin',
  },
};

export function UserPanel() {
  const navigate = useNavigate();
  const { authenticated, user, role } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const effectiveRole = authenticated ? (role || 'user') : 'guest';

  const config = useMemo(() => ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.user, [effectiveRole]);
  const username = authenticated ? (user?.username || 'unknown') : 'Guest';
  const quickLinks = useMemo(
    () => (Array.isArray(user?.quick_links) ? user.quick_links.filter((item) => item?.label && item?.url).slice(0, 4) : []),
    [user?.quick_links]
  );

  async function handleLogout(event) {
    event.stopPropagation();
    if (!authenticated || isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Continue with forced redirect to reset UI session state.
    } finally {
      navigate('/login', { replace: true });
      window.location.assign('/login');
    }
  }

  return (
    <Card className="shell-user-panel">
      <div
        className="shell-user-panel__toggle"
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="shell-user-panel__identity">
          <span className="shell-user-panel__username">{username}</span>
          <span className={`shell-user-panel__role shell-user-panel__role--${config.tone}`}>{config.label}</span>
        </div>
        <div className="shell-user-panel__actions">
          {authenticated ? (
            <button
              type="button"
              className="compact-toggle compact-toggle--icon"
              onClick={handleLogout}
              title="Sign out"
              disabled={isLoggingOut}
            >
              <LogOut size={14} />
            </button>
          ) : null}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <div className={expanded ? 'shell-user-panel__expand shell-user-panel__expand--open' : 'shell-user-panel__expand'}>
        <div className="shell-user-panel__section">
          <div className="shell-user-panel__section-title">
            <Shield size={14} />
            <strong>Role</strong>
          </div>
          <p>{config.description}</p>
        </div>

        <div className="shell-user-panel__section">
          <strong>Permissions</strong>
          <ul>
            {config.permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </div>

        <div className="shell-user-panel__section">
          <strong>Accessible API Routes</strong>
          <ul>
            {config.routes.map((route) => (
              <li key={route}><code>{route}</code></li>
            ))}
          </ul>
        </div>

        {quickLinks.length ? (
          <div className="shell-user-panel__section">
            <strong>Quick Links</strong>
            <ul>
              {quickLinks.map((item) => (
                <li key={`${item.label}-${item.url}`}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default UserPanel;
