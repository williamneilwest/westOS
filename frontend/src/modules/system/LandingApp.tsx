import type { ReactNode } from 'react';
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const defaultCockpitUrl = hostname.endsWith('wnwest.com') ? 'https://cockpit.wnwest.com' : '/cockpit';
const defaultCockpitEmbedUrl = hostname.endsWith('wnwest.com') ? '/cockpit' : defaultCockpitUrl;
const cockpitBaseUrl = import.meta.env.VITE_COCKPIT_URL || defaultCockpitUrl;
const cockpitEmbedUrl = import.meta.env.VITE_COCKPIT_EMBED_URL || defaultCockpitEmbedUrl;
const cockpitTerminalUrl = `${cockpitEmbedUrl.replace(/\/$/, '')}/system/terminal`;

const homelabServices = [
  {
    title: 'Cockpit',
    status: 'Admin',
    href: cockpitBaseUrl,
    description:
      'Browser-based Linux administration for the host, including services, logs, storage, updates, and shell access.',
  },
  {
    title: 'OpenWebUI',
    status: 'AI',
    href: 'https://chat.wnwest.com',
    description: 'Primary chat workspace backed by the local AI gateway for browser-based assistant access.',
  },
  {
    title: 'AI Gateway',
    status: 'API',
    href: 'https://ai.wnwest.com',
    description: 'Internal gateway for model traffic, routing application requests into the local AI stack.',
  },
  {
    title: 'Portainer',
    status: 'Ops',
    href: 'https://portainer.wnwest.com',
    description: 'Container operations console for inspecting stacks, logs, deployments, and runtime state.',
  },
  {
    title: 'Home',
    status: 'Dashboard',
    href: 'https://home.wnwest.com',
    description: 'Start page for the homelab with service shortcuts and status visibility.',
  },
  {
    title: 'Code Server',
    status: 'Dev',
    href: 'https://code.wnwest.com',
    description: 'Remote VS Code environment for editing and running code directly in the homelab.',
  },
  {
    title: 'Jupyter',
    status: 'Notebook',
    href: 'https://jupyter.wnwest.com',
    description: 'Notebook environment for experiments, ad hoc scripts, data work, and automation tests.',
  },
  {
    title: 'Kitchen AI',
    status: 'App',
    href: 'https://kitchen-ai.wnwest.com',
    description: 'Custom kitchen and household workflow application running as a dedicated service.',
  },
  {
    title: 'Recipes',
    status: 'Household',
    href: 'https://recipes.wnwest.com',
    description: 'Mealie instance for recipe storage, planning, and kitchen organization.',
  },
  {
    title: 'Pantry',
    status: 'Household',
    href: 'https://pantry.wnwest.com',
    description: 'Grocy inventory and chores system for pantry tracking and household logistics.',
  },
  {
    title: 'Files',
    status: 'Storage',
    href: 'https://files.wnwest.com',
    description: 'Browser file manager for shared storage, media browsing, and quick uploads.',
  },
  {
    title: 'Torrent',
    status: 'Media',
    href: 'https://torrent.wnwest.com',
    description: 'qBittorrent UI routed through the VPN container for isolated download operations.',
  },
  {
    title: 'Plex',
    status: 'Media',
    href: 'https://plex.wnwest.com',
    description: 'Media server for the library hosted on the local storage stack.',
  },
  {
    title: 'Home Assistant',
    status: 'Automation',
    href: 'https://ha.wnwest.com',
    description: 'Smart home automation runtime integrating devices, scenes, and control flows.',
  },
  {
    title: 'Homebridge',
    status: 'Automation',
    href: 'https://hb.wnwest.com',
    description: 'HomeKit bridge used to expose additional devices and integrations into Apple Home.',
  },
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-800/70 p-6 shadow-lg backdrop-blur transition hover:-translate-y-2 hover:bg-slate-800/90 hover:shadow-2xl">
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <div className="text-slate-300">{children}</div>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-5xl font-extrabold text-transparent">
            William West
          </h1>

          <p className="mt-3 text-lg text-slate-400">IT Automation Specialist • Systems Engineer • Builder</p>
        </div>

        <div className="mb-8">
          <Card title="About Me">
            <p>
              William West is an IT Automation Specialist in Colorado focused on building scalable systems
              using Power Platform, ServiceNow, Docker, and DevOps practices.
            </p>
            <p className="mt-2">
              I specialize in automation, infrastructure, and eliminating manual processes through smart
              system design.
            </p>
          </Card>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Link to="/projects">
            <Card title="Projects">
              Explore my homelab, automation systems, and full-stack applications.

              <div className="mt-3 font-medium text-blue-400">View Projects →</div>
            </Card>
          </Link>

          <Card title="Resume">
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Download Resume →
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-center text-4xl font-bold text-transparent">
          Projects
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Homelab Infrastructure">
            <p>
              Docker-based environment with Caddy reverse proxy, SSL automation, Home Assistant integration,
              and VPN-isolated services.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Self-hosted infrastructure powering automation tools, dashboards, and smart home systems.
            </p>

            <div className="mt-4">
              <a
                href="https://pridebytes.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                View Live Homelab →
              </a>
            </div>
          </Card>

          <Card title="Automation & Labeling System">
            <p>
              Built Power Automate + Python workflows to generate and print asset labels using Zebra printers
              and barcode scanners.
            </p>
          </Card>

          <Card title="Custom Web Applications">
            <p>
              Developed Flask + React applications for PDF processing, JSON extraction, and internal
              dashboards.
            </p>
          </Card>

          <Card title="Smart Home Automation">
            <p>
              Home Assistant setup integrating Zigbee, HomeKit, and custom automations for real-time device
              control and monitoring.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ServiceLinkCard({
  title,
  description,
  href,
  status,
}: {
  title: string;
  description: string;
  href: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          {status}
        </span>
      </div>

      <p className="text-slate-300">{description}</p>

      <div className="mt-5">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-400 hover:text-blue-300"
        >
          Open Service →
        </a>
      </div>
    </div>
  );
}

function Services() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-center text-4xl font-bold text-transparent">
          Services
        </h1>

        <p className="mx-auto mb-10 max-w-3xl text-center text-slate-400">
          Operational modules for the westOS stack. Cockpit stays on its own subdomain for full access, and
          the terminal workspace below uses the same-origin proxy path for the browser embed.
        </p>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                    Codex CLI Surface
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Cockpit Terminal Workspace</h2>
                  <p className="mt-3 text-slate-400">
                    The embed points at <span className="text-slate-200">/cockpit/system/terminal</span> so
                    the terminal can render inside the main site, while the full admin console remains on{' '}
                    <span className="text-slate-200">cockpit.wnwest.com</span>.
                  </p>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Browser Shell
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={cockpitBaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  Open Full Cockpit
                </a>

                <a
                  href={cockpitTerminalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Open Full Terminal
                </a>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400">
                If the terminal frame does not render, Cockpit is still sending frame-blocking security
                headers. In that case the full Cockpit link will keep working, but the embedded browser shell
                will require proxy/header changes on the Cockpit side.
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">Homelab Services</h2>
                <span className="text-sm text-slate-400">{homelabServices.length} browser endpoints</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {homelabServices.map((service) => (
                  <ServiceLinkCard key={service.title} {...service} />
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-[78vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-700 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Embedded Terminal</h2>
                <p className="mt-1 text-slate-400">
                  This view targets Cockpit&apos;s terminal page through the same-origin proxy path for the
                  best chance of rendering in-browser.
                </p>
              </div>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                {cockpitTerminalUrl}
              </span>
            </div>

            <iframe title="Cockpit Terminal" src={cockpitTerminalUrl} className="h-[78vh] w-full bg-slate-950" />

            <div className="border-t border-slate-700 px-6 py-4 text-sm text-slate-400">
              This page provides the browser terminal surface. It does not expose a direct Codex-to-shell
              control channel by itself; it gives you a terminal view inside the homelab UI, while command
              automation would need a separate backend execution path.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingApp() {
  return (
    <Router>
      <nav className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 px-6 py-4 text-white backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="text-lg font-bold text-blue-400">
            wnwest
          </Link>

          <div className="space-x-6">
            <Link to="/" className="transition hover:text-blue-400">
              Home
            </Link>
            <Link to="/projects" className="transition hover:text-blue-400">
              Projects
            </Link>
            <Link to="/services" className="transition hover:text-blue-400">
              Services
            </Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/services" element={<Services />} />
      </Routes>
    </Router>
  );
}
