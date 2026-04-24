import { Navigate, useLocation } from 'react-router-dom';
import { isWorkDomainHost } from '../constants/domain';
import { useCurrentUser } from '../hooks/useCurrentUser';

const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
const isWorkSubdomain = isWorkDomainHost(hostname);

export function RequireAuth({ children }) {
  const location = useLocation();
  const { loading, authenticated } = useCurrentUser();

  if (isWorkSubdomain) {
    return children;
  }

  if (loading) {
    return <section className="module"><p className="status-text">Checking authentication...</p></section>;
  }

  if (!authenticated) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return children;
}
