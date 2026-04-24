import { useLocation, useNavigate } from 'react-router-dom';

export function useBackNavigation(defaultRoute = '/app') {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    const from = location.state?.from;
    if (typeof from === 'string' && from.trim()) {
      navigate(from);
      return;
    }

    navigate(defaultRoute);
  };
}

export default useBackNavigation;
