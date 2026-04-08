import { Bot, ChefHat, Code2, Folder, HardDrive, Home, MonitorSmartphone, Network, Server, UserCircle2, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

const lucideMap: Record<string, LucideIcon> = {
  portainer: Server,
  plex: MonitorSmartphone,
  jupyter: Code2,
  'home-assistant': Home,
  homebridge: HardDrive,
  'mdi-console': MonitorSmartphone,
  'mdi-folder': Folder,
  'mdi-api': Network,
  'mdi-robot': Bot,
  'mdi-chef-hat': ChefHat,
  'mdi-food': ChefHat,
  'mdi-account-circle': UserCircle2,
};

interface IconProps {
  icon: string;
  name: string;
}

export function getIconComponent(icon: string) {
  return lucideMap[icon] || Server;
}

export function ServiceIcon({ icon, name }: IconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isImage = icon.toLowerCase().endsWith('.png') || icon.toLowerCase().endsWith('.svg') || icon.toLowerCase().endsWith('.jpg');
  const iconPath = useMemo(() => (isImage ? `/icons/${icon}` : ''), [icon, isImage]);
  const FallbackIcon = getIconComponent(icon);

  if (isImage && !imageFailed) {
    return (
      <img
        src={iconPath}
        alt={`${name} icon`}
        className="h-5 w-5 rounded object-contain"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <FallbackIcon className="h-5 w-5" />;
}
