import LifeOSApp from '@/modules/life/app/App';
import { LandingApp } from '@/modules/system/LandingApp';
import { UnknownHostPage } from '@/components/UnknownHostPage';
import { useActiveHostname } from '@/hooks/useActiveHostname';

export function AppRouter() {
  const { hostname, appId } = useActiveHostname();

  if (appId === 'life') {
    return <LifeOSApp />;
  }

  if (appId === 'landing') {
    return <LandingApp />;
  }

  return <UnknownHostPage hostname={hostname} />;
}
