import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useThemeSetup() {
  const theme = useAppStore((state) => state.preferences.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);
}
