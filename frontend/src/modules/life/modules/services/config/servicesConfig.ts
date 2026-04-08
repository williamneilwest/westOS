import type { ServiceCategory } from '../types';

export const servicesConfig: ServiceCategory[] = [
  {
    category: 'Infrastructure',
    items: [
      {
        name: 'Portainer',
        icon: 'portainer',
        href: 'https://portainer.pridebytes.com',
        description: 'Docker Management',
      },
      {
        name: 'Cockpit',
        icon: 'mdi-console',
        href: 'https://cockpit.pridebytes.com',
        description: 'Server Management Interface',
      },
      {
        name: 'File Browser',
        icon: 'mdi-folder',
        href: 'https://files.pridebytes.com',
        description: 'Media File Management',
      },
    ],
  },
  {
    category: 'Smart Home',
    items: [
      {
        name: 'Home Assistant',
        icon: 'home-assistant',
        href: 'https://ha.pridebytes.com',
        description: 'Primary Automation Engine',
        widget: {
          type: 'homeassistant',
          url: 'https://ha.pridebytes.com',
          key: '<KEEP EXISTING KEY>',
        },
      },
      {
        name: 'Homebridge',
        icon: 'homebridge',
        href: 'https://hb.pridebytes.com',
        description: 'HomeKit Compatibility Layer',
      },
    ],
  },
  {
    category: 'Media',
    items: [
      {
        name: 'Plex',
        icon: 'plex',
        href: 'https://plex.pridebytes.com',
        description: 'Media Server',
      },
    ],
  },
  {
    category: 'Development',
    items: [
      {
        name: 'Jupyter',
        icon: 'jupyter',
        href: 'https://jupyter.pridebytes.com',
        description: 'Python notebooks and data science',
      },
      {
        name: 'Flask API',
        icon: 'mdi-api',
        href: 'https://api.pridebytes.com',
        description: 'PrideBytes Flask automation API',
      },
    ],
  },
  {
    category: 'Kitchen',
    items: [
      {
        name: 'Recipes',
        icon: 'mdi-chef-hat',
        href: 'https://recipes.pridebytes.com',
        description: 'Recipe manager',
      },
      {
        name: 'Pantry',
        icon: 'mdi-food',
        href: 'https://pantry.pridebytes.com',
        description: 'Food inventory',
      },
    ],
  },
  {
    category: 'Downloads',
    items: [
      {
        name: 'qBittorrent',
        icon: 'qbittorrent.png',
        href: 'https://torrent.pridebytes.com',
        description: 'Torrent Client',
      },
    ],
  },
  {
    category: 'Personal',
    items: [
      {
        name: 'Portfolio',
        icon: 'mdi-account-circle',
        href: 'https://wnwest.com',
        description: 'Personal site, projects, and automation systems',
        target: '_blank',
      },
    ],
  },
];
