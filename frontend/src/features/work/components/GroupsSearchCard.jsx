import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { searchGroupsCacheFirst } from '../../../app/services/api';
import { Card, CardHeader } from '../../../app/ui/Card';
import { EmptyState } from '../../../app/ui/EmptyState';

function normalizeGroup(group) {
  const id = String(group?.id || group?.group_id || '').trim();
  if (!id) {
    return null;
  }
  const rawName = String(group?.name || '').trim();
  return {
    id,
    name: rawName || null,
    description: String(group?.description || '').trim(),
    enriched: typeof group?.enriched === 'boolean' ? group.enriched : Boolean(rawName),
  };
}

function matchesSearchText(group, searchTerm) {
  const normalizedTerm = String(searchTerm || '').trim().toLowerCase();
  if (!normalizedTerm) {
    return true;
  }
  return String(group?.name || '').toLowerCase().includes(normalizedTerm);
}

function rankSearchResults(groups, searchTerm) {
  const normalizedQuery = String(searchTerm || '').trim().toLowerCase();
  const priorityTokens = ['lah', 'mhd', 'rmr'];
  const priorityScore = (group) => {
    const name = String(group?.name || '').toLowerCase();
    if (!name) {
      return 0;
    }
    return priorityTokens.some((token) => name.includes(token)) ? 1 : 0;
  };

  return [...groups].sort((left, right) => {
    const leftPriority = priorityScore(left);
    const rightPriority = priorityScore(right);
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    const leftName = String(left?.name || '').toLowerCase();
    const rightName = String(right?.name || '').toLowerCase();
    const leftStarts = normalizedQuery ? leftName.startsWith(normalizedQuery) : false;
    const rightStarts = normalizedQuery ? rightName.startsWith(normalizedQuery) : false;
    if (leftStarts && !rightStarts) {
      return -1;
    }
    if (!leftStarts && rightStarts) {
      return 1;
    }
    return String(left.name || left.id || '').localeCompare(String(right.name || right.id || ''));
  });
}

export function GroupsSearchCard({ user = null, userGroupIds = [], onAddGroup = null, className = '' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('cache');
  const hasSelectedUser = Boolean(String(user?.opid || '').trim());
  const membershipIdSet = useMemo(
    () => new Set((Array.isArray(userGroupIds) ? userGroupIds : []).map((value) => String(value || '').trim()).filter(Boolean)),
    [userGroupIds]
  );

  useEffect(() => {
    if (!hasSelectedUser) {
      setLoading(false);
      setSource('cache');
      setResults([]);
      return undefined;
    }

    const normalizedTerm = String(searchTerm || '').trim();
    if (!normalizedTerm) {
      setLoading(false);
      setSource('cache');
      setResults([]);
      return undefined;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      setLoading(true);
      searchGroupsCacheFirst(normalizedTerm)
        .then(async (payload) => {
          if (!isMounted) {
            return;
          }

          const cachedRaw = Array.isArray(payload?.results) ? payload.results.map(normalizeGroup).filter(Boolean) : [];
          const cached = rankSearchResults(cachedRaw.filter((group) => matchesSearchText(group, normalizedTerm)), normalizedTerm);
          setResults(cached);
          setSource(String(payload?.source || 'cache').toLowerCase() === 'flow' ? 'flow' : 'cache');

          if (normalizedTerm.length >= 3 && !cached.length) {
            const livePayload = await searchGroupsCacheFirst(normalizedTerm, { refresh: true });
            if (!isMounted) {
              return;
            }
            const liveRaw = Array.isArray(livePayload?.results) ? livePayload.results.map(normalizeGroup).filter(Boolean) : [];
            const live = rankSearchResults(liveRaw.filter((group) => matchesSearchText(group, normalizedTerm)), normalizedTerm);
            setResults(live);
            setSource(String(livePayload?.source || 'flow').toLowerCase() === 'flow' ? 'flow' : 'cache');
          }
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }
          setResults([]);
          setSource('cache');
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hasSelectedUser, searchTerm]);

  const visibleResults = useMemo(() => results.slice(0, 10), [results]);
  const sourceLabel = source === 'flow' ? 'Live' : 'Cached';
  const memberMatchCount = useMemo(
    () => visibleResults.filter((group) => membershipIdSet.has(group.id)).length,
    [membershipIdSet, visibleResults]
  );

  async function triggerFlowSearch() {
    if (!hasSelectedUser) {
      return;
    }
    const normalizedTerm = String(searchTerm || '').trim();
    if (normalizedTerm.length < 3) {
      return;
    }
    setLoading(true);
    try {
      const livePayload = await searchGroupsCacheFirst(normalizedTerm, { refresh: true });
      const liveRaw = Array.isArray(livePayload?.results) ? livePayload.results.map(normalizeGroup).filter(Boolean) : [];
      const live = rankSearchResults(liveRaw.filter((group) => matchesSearchText(group, normalizedTerm)), normalizedTerm);
      setResults(live);
      setSource(String(livePayload?.source || 'flow').toLowerCase() === 'flow' ? 'flow' : 'cache');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader
        eyebrow="Groups Search"
        title="Search Groups"
        description="Cache-first search with live fallback. Top 10 results shown."
        action={(
          <span className={source === 'flow' ? 'association-status association-status--live' : 'association-status association-status--assigned'}>
            {sourceLabel}
          </span>
        )}
      />

      <label className="settings-field">
        <span>Search Groups</span>
        <div className="association-toolbar">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            disabled={!hasSelectedUser}
            placeholder="Type group name or id"
          />
          <button
            type="button"
            className="compact-toggle"
            disabled={!hasSelectedUser || !String(searchTerm || '').trim()}
            onClick={() => void triggerFlowSearch()}
            title="Run Search Groups flow for current text"
          >
            Flow
          </button>
        </div>
      </label>
      {!hasSelectedUser ? <p className="status-text">Select a user first</p> : null}
      {hasSelectedUser && !String(searchTerm || '').trim() ? <p className="status-text">Enter search text to find groups.</p> : null}
      {loading ? <p className="status-text">Searching groups...</p> : null}
      {!loading && hasSelectedUser && String(searchTerm || '').trim() && visibleResults.length ? (
        <p className="status-text">
          {memberMatchCount > 0
            ? `${memberMatchCount} matching group${memberMatchCount === 1 ? '' : 's'} already include this user.`
            : 'No matching groups currently include this user.'}
        </p>
      ) : null}

      {!loading && visibleResults.length ? (
        <div className="association-list groups-search-results">
          {visibleResults.map((group) => (
            <div
              key={group.id}
              className="association-list__item groups-search-results__item"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (typeof onAddGroup === 'function') {
                  onAddGroup(group);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (typeof onAddGroup === 'function') {
                    onAddGroup(group);
                  }
                }
              }}
            >
              <div>
                <div className="association-list__title">{group.name || 'Unknown Group'}</div>
              </div>
              {group.description ? <span className="association-list__meta">{group.description}</span> : null}
              <div className="association-toolbar">
                {!group.name || !group.enriched ? (
                  <span className="association-status association-status--missing">Not Enriched</span>
                ) : null}
                {membershipIdSet.has(group.id) ? (
                  <span className="association-status association-status--member">Member</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && hasSelectedUser && String(searchTerm || '').trim() && !visibleResults.length ? (
        <div>
          <EmptyState
            icon={<Search size={16} />}
            title="No groups match this search"
            description={source === 'flow' ? 'No groups found in directory.' : 'No cached groups found for this term.'}
          />
          {String(searchTerm || '').trim().length >= 3 ? (
            <div className="association-toolbar">
              <button type="button" className="ui-button ui-button--secondary" onClick={() => void triggerFlowSearch()}>
                <Sparkles size={14} />
                Search Power Automate
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default GroupsSearchCard;
