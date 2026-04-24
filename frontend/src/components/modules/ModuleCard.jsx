import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../../app/ui/Card';

export function ModuleCard({
  title = '',
  actions = null,
  children = null,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
}) {
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));

  return (
    <Card className={`module-card ${className}`.trim()}>
      <div className="module-card__header">
        <h3 className="module-card__title">{title}</h3>
        <div className="module-card__actions">
          {actions}
          {collapsible ? (
            <button
              type="button"
              className="compact-toggle compact-toggle--icon"
              onClick={() => setCollapsed((current) => !current)}
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          ) : null}
        </div>
      </div>
      {!collapsed ? <div className="module-card__body">{children}</div> : null}
    </Card>
  );
}

export default ModuleCard;
