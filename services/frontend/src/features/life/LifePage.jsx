const systems = [
  'Calendar and commitments',
  'Health and routines',
  'Home and family logistics'
];

export function LifePage() {
  return (
    <section className="module">
      <header className="module__header">
        <span className="module__tag">/life</span>
        <h2>Life</h2>
        <p>Personal systems stay visible here without bleeding into work or service operations.</p>
      </header>

      <div className="card-grid">
        <article className="card card--accent">
          <h3>Core loops</h3>
          <ul className="card__list">
            {systems.map((system) => (
              <li key={system}>{system}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3>Intent</h3>
          <p>Keep this module small and opinionated so it can grow without becoming a dashboard graveyard.</p>
        </article>
      </div>
    </section>
  );
}
