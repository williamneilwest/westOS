import { Navigate, useLocation } from 'react-router-dom';
import { isWorkDomainHost } from '../constants/domain';
import { useCurrentUser } from '../hooks/useCurrentUser';

const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
const isWorkSubdomain = isWorkDomainHost(hostname);

export function RequireAdmin({ children }) {
  const location = useLocation();
  const { loading, authenticated, isAdmin } = useCurrentUser();

  if (isWorkSubdomain) {
    return <Navigate replace to="/app/work" />;
  }

  if (loading) {
    return <section className="module"><p className="status-text">Checking authorization...</p></section>;
  }

  if (!authenticated) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate replace to="/app/work" />;
  }

  return children;
}
