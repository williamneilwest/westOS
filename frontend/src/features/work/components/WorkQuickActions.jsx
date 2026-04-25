export function WorkQuickActions({ searchValue, onSearchChange }) {
  return (
    <section className="work-hub-section work-hub-section--compact">
      <header className="work-hub-section__header">
        <div>
          <strong>Search Work</strong>
        </div>
      </header>

      <div className="work-hub-section__body">
        <label className="work-hub-search" htmlFor="work-hub-search">
          <span className="sr-only">Search work tools</span>
          <input
            id="work-hub-search"
            className="work-hub-search__input"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search user, ticket, or device..."
          />
        </label>
      </div>
    </section>
  );
}
