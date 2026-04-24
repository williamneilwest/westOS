import { Link } from 'react-router-dom';

export function DomainCard({ domain, onOpen }) {
  const Icon = domain.icon;
  const visibleItems = (domain.items || []).filter((item) => item.enabled !== false);

  return (
    <article className="ui-card work-domain-card">
      <div className="work-domain-card__head">
        <span className="work-domain-card__icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <div>
          <h3>{domain.title}</h3>
          <p>{domain.description}</p>
        </div>
      </div>

      <div className="work-domain-card__actions" role="group" aria-label={`${domain.title} options`}>
        {visibleItems.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.label}
              className="work-domain-subitem"
              to={item.href}
              onClick={() => onOpen({ title: item.label, href: item.href })}
              state={{ from: '/app/work', label: 'Work Hub' }}
            >
              {ItemIcon ? <ItemIcon size={14} /> : null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </article>
  );
}
