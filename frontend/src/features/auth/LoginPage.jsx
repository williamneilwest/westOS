import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../app/ui/Button';
import { Card, CardHeader } from '../../app/ui/Card';
import { getCurrentUser, login } from '../../app/services/auth';

const LAST_USERNAME_STORAGE_KEY = 'westos.auth.lastUsername';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return String(window.localStorage.getItem(LAST_USERNAME_STORAGE_KEY) || '');
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((result) => {
        if (!mounted) {
          return;
        }
        if (result?.authenticated) {
          navigate('/app/life', { replace: true });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      if (typeof window !== 'undefined' && username.trim()) {
        window.localStorage.setItem(LAST_USERNAME_STORAGE_KEY, username.trim());
      }
      window.dispatchEvent(new CustomEvent('westos:auth-changed'));
      const redirectTo = location.state?.from || '/app/life';
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__layout">
        <Card className="login-page__brand">
          <span className="ui-eyebrow">westOS</span>
          <h1 className="login-page__title">westOS</h1>
          <p className="login-page__subtitle">System Control • Data • AI</p>

          <ul className="login-page__bullets">
            <li>
              <CheckCircle2 size={14} />
              Monitor system health
            </li>
            <li>
              <CheckCircle2 size={14} />
              Run scripts and workflows
            </li>
            <li>
              <CheckCircle2 size={14} />
              Analyze data with AI
            </li>
          </ul>

          <Button
            type="button"
            variant="secondary"
            className="login-page__guest"
            onClick={() => navigate('/app/work')}
          >
            Continue as Guest
          </Button>
        </Card>

        <Card className="login-page__card">
          <CardHeader
            eyebrow="westOS"
            title="Sign in to continue"
            description="Use your westOS account to access protected modules."
          />

          <p className="ui-card__description login-page__card-copy">Session authentication is required outside the public Work portal.</p>

          <form onSubmit={onSubmit} className="login-page__form">
            <label className="login-field">
              <User size={15} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </label>
            <label className="login-field">
              <Lock size={15} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="status-text status-text--error">{error}</p> : null}
            <Button type="submit" disabled={loading} className="login-page__submit">
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
