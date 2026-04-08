const profile = {
  name: 'William West',
  role: 'IT Automation Specialist',
  tagline: 'Systems Engineer • Builder',
  summary:
    'William West is an IT Automation Specialist in Colorado focused on building scalable systems using Power Platform, ServiceNow, Docker, and DevOps practices.',
  detail:
    'I specialize in automation, infrastructure, and eliminating manual processes through smart system design.',
};

const focusAreas = [
  'Power Platform',
  'ServiceNow',
  'Docker',
  'DevOps',
  'Automation',
  'Infrastructure',
];

const projects = [
  {
    title: 'Homelab Infrastructure',
    summary:
      'Docker-based environment with Caddy reverse proxy, SSL automation, Home Assistant integration, and VPN-isolated services.',
    detail:
      'Self-hosted infrastructure powering automation tools, dashboards, and smart home systems.',
    href: 'https://pridebytes.com',
    cta: 'View Live Homelab',
  },
  {
    title: 'Automation & Labeling System',
    summary:
      'Built Power Automate + Python workflows to generate and print asset labels using Zebra printers and barcode scanners.',
    detail:
      'Focused on reducing repetitive operational work and tightening the handoff between physical assets and digital records.',
  },
  {
    title: 'Custom Web Applications',
    summary:
      'Developed Flask + React applications for PDF processing, JSON extraction, and internal dashboards.',
    detail:
      'Designed lightweight tools that turn internal workflow gaps into maintainable, usable web applications.',
  },
  {
    title: 'Smart Home Automation',
    summary:
      'Home Assistant setup integrating Zigbee, HomeKit, and custom automations for real-time device control and monitoring.',
    detail:
      'Built around reliability, practical routines, and a clean bridge between household devices and software logic.',
  },
];

function BackgroundShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,#07111f_0%,#081321_45%,#050b14_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:96px_96px]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{body}</p>
    </div>
  );
}

export function PortfolioApp() {
  return (
    <BackgroundShell>
      <main className="px-6 pb-20 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="sticky top-0 z-40 rounded-[28px] border border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <a href="/portfolio" className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold text-white shadow-[0_0_40px_rgba(73,213,255,0.12)]">
                  W
                </span>
                <span>
                  <span className="block text-sm uppercase tracking-[0.28em] text-cyan-200/70">Portfolio</span>
                  <span className="block text-xs text-slate-400">William West</span>
                </span>
              </a>

              <div className="flex items-center gap-3 text-sm text-slate-300">
                <a
                  href="/"
                  className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white"
                >
                  Home
                </a>
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:border-cyan-200/40 hover:bg-white/10 hover:text-white"
                >
                  Resume
                </a>
              </div>
            </div>
          </div>

          <section className="grid gap-12 pb-14 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-100/85">
                Portfolio / Professional Work
              </p>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                {profile.name}
              </h1>

              <p className="mt-4 text-lg text-slate-300 sm:text-xl">
                {profile.role} <span className="text-slate-500">•</span> {profile.tagline}
              </p>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">{profile.summary}</p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">{profile.detail}</p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-100"
                >
                  Download Resume
                </a>
                <a
                  href="/"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Back to westOS
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                {focusAreas.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(5,15,30,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Profile Snapshot</p>
                    <p className="mt-2 text-xl font-medium text-white">Automation + systems work</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                    active
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/8 bg-slate-950/45 p-5">
                    <div className="text-3xl font-semibold tracking-tight text-white">4</div>
                    <div className="mt-2 text-sm text-slate-400">featured project areas</div>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-slate-950/45 p-5">
                    <div className="text-3xl font-semibold tracking-tight text-white">6</div>
                    <div className="mt-2 text-sm text-slate-400">core focus domains</div>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-slate-950/45 p-5">
                    <div className="text-3xl font-semibold tracking-tight text-white">Full stack</div>
                    <div className="mt-2 text-sm text-slate-400">automation to deployment</div>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-slate-950/45 p-5">
                    <div className="text-3xl font-semibold tracking-tight text-white">Colorado</div>
                    <div className="mt-2 text-sm text-slate-400">based systems builder</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8">
            <SectionHeading
              eyebrow="Projects"
              title="Selected work across infrastructure, automation, and internal applications."
              body="This page keeps the existing portfolio project content, but presents it in a format aligned with the newer westOS visual system."
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.title}
                  className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 backdrop-blur transition hover:-translate-y-1 hover:border-white/20"
                >
                  <h3 className="text-2xl font-medium text-white">{project.title}</h3>
                  <p className="mt-4 leading-7 text-slate-300">{project.summary}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{project.detail}</p>

                  {project.href ? (
                    <div className="mt-6">
                      <a
                        href={project.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:border-cyan-200/35 hover:bg-white/[0.1]"
                      >
                        {project.cta || 'Open project'}
                      </a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </BackgroundShell>
  );
}
