import { NavLink, Outlet } from 'react-router-dom';

const modules = [
  { href: '/life', label: 'Life', summary: 'Personal systems' },
  { href: '/work', label: 'Work', summary: 'Delivery and planning' },
  { href: '/ai', label: 'AI', summary: 'Gateway and automation' },
  { href: '/console', label: 'Console', summary: 'Service status' }
];

export function AppShell() {
  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__eyebrow">westOS</span>
          <h1>Platform Control Surface</h1>
          <p>One frontend, four modules, clean service boundaries.</p>
        </div>

        <nav className="shell__nav" aria-label="Primary">
          {modules.map((module) => (
            <NavLink
              key={module.href}
              to={module.href}
              className={({ isActive }) =>
                isActive ? 'shell__nav-link shell__nav-link--active' : 'shell__nav-link'
              }
            >
              <strong>{module.label}</strong>
              <span>{module.summary}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
