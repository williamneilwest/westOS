import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom'

const pillars = [
  {
    eyebrow: 'Operate',
    title: 'One surface for the full stack',
    body:
      'Proxy, AI, media, automation, storage, and internal apps are organized as one system instead of a pile of unrelated containers.',
  },
  {
    eyebrow: 'Scale',
    title: 'Service-first by design',
    body:
      'Each service owns its own compose file, docs, and deployment boundary so the platform can grow without turning brittle.',
  },
  {
    eyebrow: 'Persist',
    title: 'Durable data paths',
    body:
      'State lives in predictable locations, which keeps rebuilds safer and migrations more deliberate.',
  },
]

const products = [
  {
    name: 'Infrastructure Core',
    description: 'Caddy, Portainer, code-server, and Jupyter provide the control layer that keeps the platform maintainable.',
    accent: 'from-cyan-400/30 via-sky-300/10 to-transparent',
  },
  {
    name: 'AI Layer',
    description: 'OpenWebUI, ai-gateway, and custom services like kitchen-ai make model access part of the system, not a side integration.',
    accent: 'from-emerald-400/30 via-teal-300/10 to-transparent',
  },
  {
    name: 'Home Systems',
    description: 'Grocy, Mealie, barcode flows, and future Home Assistant integrations connect the stack to real daily workflows.',
    accent: 'from-amber-300/25 via-orange-200/10 to-transparent',
  },
  {
    name: 'Media and Downloads',
    description: 'Plex, torrents, filebrowser, and Minecraft run as first-class services instead of disconnected experiments.',
    accent: 'from-fuchsia-400/25 via-pink-300/10 to-transparent',
  },
]

const highlights = [
  {
    label: 'Public front door',
    title: 'A clean landing surface',
    body: 'The main domain introduces the platform, explains the ecosystem, and points visitors to the right services without turning into a cluttered dashboard.',
  },
  {
    label: 'AI and tools',
    title: 'Useful internal products',
    body: 'The stack includes a model gateway, browser chat UI, notebook workspace, and custom automation services built for actual use.',
  },
  {
    label: 'Household workflows',
    title: 'Software tied to real life',
    body: 'Inventory, recipes, barcode intake, and future home automation services are part of the same system architecture.',
  },
  {
    label: 'Self-hosted media',
    title: 'Streaming, downloads, and storage',
    body: 'Media and file services live alongside the app stack with cleaner boundaries, persistent data paths, and better operational visibility.',
  },
]

const services = [
  { name: 'wnwest.com', role: 'main app surface', detail: 'Product, docs, and portfolio frontend' },
  { name: 'ai.wnwest.com', role: 'model gateway', detail: 'OpenAI-style internal API access' },
  { name: 'chat.wnwest.com', role: 'AI workspace', detail: 'Browser UI for model interaction' },
  { name: 'pantry.wnwest.com', role: 'inventory', detail: 'Grocy-powered household system' },
  { name: 'recipes.wnwest.com', role: 'meal planning', detail: 'Recipe library and food workflows' },
  { name: 'files.wnwest.com', role: 'storage browser', detail: 'Filebrowser for media and shared data' },
]

const metrics = [
  { value: '19', label: 'service directories' },
  { value: '10', label: 'durable data paths' },
  { value: '1', label: 'unified platform repo' },
  { value: '24/7', label: 'self-hosted mindset' },
]

function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold text-white shadow-[0_0_40px_rgba(73,213,255,0.12)]">
        W
      </span>
      <span>
        <span className="block text-sm uppercase tracking-[0.28em] text-cyan-200/70">westOS</span>
        <span className="block text-xs text-slate-400">platform landing page</span>
      </span>
    </Link>
  )
}

function Shell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,#07111f_0%,#081321_45%,#050b14_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:96px_96px]" />
      <div className="relative">{children}</div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{body}</p>
    </div>
  )
}

function Home() {
  return (
    <main>
      <section className="px-6 pb-16 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="sticky top-0 z-40 rounded-[28px] border border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Logo />
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Link to="/" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:border-cyan-200/40 hover:bg-white/10">
                  Home
                </Link>
                <Link to="/stack" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
                  Stack
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-12 pb-14 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-100/85">
                Public landing page for the westOS ecosystem
              </p>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                One modern home for apps, AI, media, and self-hosted tools.
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                `wnwest.com` is the public front door to <span className="text-white">westOS</span>, a modular platform for internal apps,
                AI services, household systems, media tooling, and infrastructure. It is designed to feel sharp, fast, and useful without
                overwhelming the page with noise.
              </p>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Visitors should understand what the platform is, what runs inside it, and where the important surfaces live within a few seconds.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/stack"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-100"
                >
                  Explore the platform
                </Link>
                <a
                  href="https://github.com/williamneilwest/westOS"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  View repository
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(5,15,30,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Platform profile</p>
                    <p className="mt-2 text-xl font-medium text-white">westOS / public edge</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
                    live
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-3xl border border-white/8 bg-slate-950/45 p-5">
                      <div className="text-3xl font-semibold tracking-tight text-white">{metric.value}</div>
                      <div className="mt-2 text-sm text-slate-400">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[28px] border border-white/8 bg-gradient-to-br from-white/8 to-white/[0.03] p-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                    <span>Signal</span>
                    <span>Routing</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
                      <span className="text-sm text-slate-300">Caddy edge</span>
                      <span className="text-sm text-cyan-200">active</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
                      <span className="text-sm text-slate-300">AI gateway</span>
                      <span className="text-sm text-emerald-200">internal API</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/45 px-4 py-3">
                      <span className="text-sm text-slate-300">Public landing</span>
                      <span className="text-sm text-amber-100">default domain</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{pillar.eyebrow}</p>
                <h3 className="mt-4 text-xl font-medium text-white">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="What Lives Here"
            title="A focused platform, not just a homepage."
            body="This page should explain the ecosystem at a glance: what the platform does, what kinds of products run inside it, and why the stack feels coherent."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.name}
                className={`group relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/50 p-8 transition hover:-translate-y-1 hover:border-white/20`}
              >
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${product.accent}`} />
                <div className="relative">
                  <h3 className="text-2xl font-medium text-white">{product.name}</h3>
                  <p className="mt-4 max-w-xl leading-7 text-slate-300">{product.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Highlights"
            title="Enough information to be useful."
            body="The homepage should help a new visitor orient quickly. These are the kinds of capabilities the platform is built around."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-[30px] border border-white/10 bg-white/[0.035] p-7 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{item.label}</p>
                <h3 className="mt-4 text-2xl font-medium text-white">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Design"
            title="Minimal, but not blank."
            body="The page uses hierarchy, spacing, contrast, and layered surfaces to stay sleek without looking unfinished."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Large editorial hero with technical framing',
              'Soft glass panels over a dark atmospheric field',
              'Compact cards instead of long paragraphs',
              'Clear calls to action without conversion clutter',
              'Readable density on desktop and mobile',
              'One visual system across docs, routes, and services',
            ].map((item) => (
              <div key={item} className="rounded-[28px] border border-white/10 bg-white/[0.035] px-5 py-6 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function Stack() {
  return (
    <main className="px-6 pb-20 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="sticky top-0 z-40 rounded-[28px] border border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Logo />
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Link to="/" className="rounded-full px-4 py-2 transition hover:bg-white/5 hover:text-white">
                Home
              </Link>
              <Link to="/stack" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:border-cyan-200/40 hover:bg-white/10">
                Stack
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Stack"
            title="The current service layer"
            body="A compact view of the public-facing routes and the jobs they do inside the platform. This stays intentionally selective so the page remains useful instead of turning into raw inventory."
          />

          <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
            <div className="grid gap-3">
              {services.map((service) => (
                <article
                  key={service.name}
                  className="grid gap-3 rounded-[24px] border border-white/8 bg-slate-950/45 px-5 py-5 sm:grid-cols-[1.1fr_0.7fr_1fr] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{service.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{service.detail}</p>
                  </div>
                  <div className="text-sm uppercase tracking-[0.22em] text-cyan-200/80">{service.role}</div>
                  <div className="text-sm text-slate-300">part of the broader `westOS` service graph</div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-8 py-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Next step</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">This page can go further without getting crowded.</h2>
              <p className="mt-4 max-w-3xl leading-7 text-slate-300">
                The next layer would be live service status, animated topology, and direct links into each service area, but the baseline should stay calm, sharp, and readable.
              </p>
            </div>
            <a
              href="https://github.com/williamneilwest/westOS"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-white/15 bg-slate-950/50 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
            >
              Open repository
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

function App() {
  return (
    <Router>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stack" element={<Stack />} />
        </Routes>
      </Shell>
    </Router>
  )
}

export default App
