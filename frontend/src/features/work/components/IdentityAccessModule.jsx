import { useEffect, useMemo, useState } from 'react';
import { Sparkles, UsersRound } from 'lucide-react';
import { getUserGroups, lookupReferenceGroupsFromFlow } from '../../../app/services/api';
import {
  getCachedUsersFromMap,
  cacheGroupLookupResults,
  normalizeFlowMembershipResponse,
  readUserGroupsCacheMap,
  upsertCachedUserRecord,
  writeUserGroupsCacheMap,
} from '../userGroupsCache';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidGroupId(id) {
  const normalized = String(id || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.includes('$metadata')) {
    return false;
  }
  if (normalized.startsWith('https://graph.microsoft.com')) {
    return false;
  }
  return true;
}

function mergeGroups(baseGroups = [], incomingGroups = []) {
  const merged = new Map();
  [...baseGroups, ...incomingGroups].forEach((group) => {
    const groupId = String(group?.group_id || group?.id || '').trim();
    if (!isValidGroupId(groupId)) {
      return;
    }
    const name = String(group?.name || '').trim() || groupId;
    merged.set(groupId, { group_id: groupId, name });
  });
  return Array.from(merged.values());
}

function generateScript(selectedUser, selectedGroup, alreadyAssigned, siteCode = '') {
  const site = String(siteCode || '').trim();
  if (!selectedUser) {
    return '# Select a user.';
  }
  if (!selectedGroup) {
    return '# Search and select a group.';
  }
  if (alreadyAssigned) {
    return '✅ User already has this group. No action needed.';
  }
  return [
    site ? `# Site: ${site}` : '# Site: n/a',
    `Add-UserToGroup -UserId "${selectedUser.opid}" -GroupId "${selectedGroup.group_id}"`,
  ].join('\n');
}

export function IdentityAccessModule({ authenticated = false, canExecuteFlows = false, siteCode = '' }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [flowLoading, setFlowLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const cacheMap = readUserGroupsCacheMap();
    const cachedUsers = getCachedUsersFromMap(cacheMap);
    const cachedGroups = cachedUsers.flatMap((user) => user.groups || []);
    setUsers(cachedUsers);
    setGroups(mergeGroups([], cachedGroups));
    setSelectedUserId(cachedUsers[0]?.opid || '');
    setLoading(false);
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.opid === selectedUserId) || null,
    [users, selectedUserId]
  );

  const selectedUserGroups = useMemo(
    () => (Array.isArray(selectedUser?.groups) ? selectedUser.groups.filter((group) => isValidGroupId(group?.group_id)) : []),
    [selectedUser]
  );

  const selectedUserGroupIds = useMemo(
    () => selectedUserGroups.map((group) => String(group.group_id || '').trim()).filter(Boolean),
    [selectedUserGroups]
  );

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) {
      return null;
    }
    return groups.find((group) => group.group_id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const alreadyAssigned = useMemo(() => {
    if (!selectedGroup || !selectedUserGroupIds.length) {
      return false;
    }
    return selectedUserGroupIds.includes(selectedGroup.group_id);
  }, [selectedGroup, selectedUserGroupIds]);

  const filteredUsers = useMemo(() => {
    const query = normalizeText(userQuery);
    const list = query
      ? users.filter((user) => [user.opid, user.display_name, user.email].some((value) => normalizeText(value).includes(query)))
      : users;
    return list.slice(0, 12);
  }, [userQuery, users]);

  const filteredGroups = useMemo(() => {
    const query = normalizeText(groupQuery);
    if (!selectedUser || !query) {
      return [];
    }
    return groups
      .filter((group) => isValidGroupId(group?.group_id))
      .filter((group) => [group.group_id, group.name].some((value) => normalizeText(value).includes(query)))
      .slice(0, 25);
  }, [groupQuery, groups, selectedUser]);

  async function handleRunUserFlow() {
    const opid = String(selectedUserId || userQuery).trim();
    if (!opid) {
      setMessage('Enter or select an OPID first.');
      return;
    }

    setFlowLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await getUserGroups(opid);
      const normalized = normalizeFlowMembershipResponse(response, opid);
      const cacheMap = readUserGroupsCacheMap();
      const nextCacheMap = upsertCachedUserRecord(normalized, cacheMap);
      writeUserGroupsCacheMap(nextCacheMap);
      const nextUsers = getCachedUsersFromMap(nextCacheMap);
      setUsers(nextUsers);
      setGroups((current) => mergeGroups(current, normalized.groups || []));
      setSelectedUserId(normalized.opid || opid);
      setMessage(`Get User Groups returned ${normalized.groups.length} group${normalized.groups.length === 1 ? '' : 's'}.`);
    } catch (requestError) {
      setError(requestError.message || 'Get User Groups flow failed.');
    } finally {
      setFlowLoading(false);
    }
  }

  async function handleRunGroupFlow() {
    const query = String(groupQuery || '').trim();
    if (!query) {
      setMessage('Enter a group search term first.');
      return;
    }

    setFlowLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await lookupReferenceGroupsFromFlow(query);
      const items = Array.isArray(response?.items) ? response.items : [];
      cacheGroupLookupResults(items);
      setGroups((current) => mergeGroups(current, items));
      setMessage(items.length ? `Power Automate returned ${items.length} groups.` : 'No groups returned from flow.');
    } catch (requestError) {
      setError(requestError.message || 'Group lookup flow failed.');
    } finally {
      setFlowLoading(false);
    }
  }

  const siteSuggestions = useMemo(() => {
    const raw = String(siteCode || '').trim();
    if (!raw) {
      return [];
    }
    return [raw, `${raw}-users`, `${raw}-techs`];
  }, [siteCode]);

  if (loading) {
    return <p className="status-text">Loading cached identity data...</p>;
  }

  return (
    <div className="identity-module">
      <div className="identity-module__context">
        <div className="identity-module__pill">
          <span>Active User</span>
          <strong>{selectedUser ? (selectedUser.display_name || 'Unknown User') : 'None selected'}</strong>
        </div>
          <div className="identity-module__pill">
            <span>Active Group</span>
            <strong>{selectedGroup ? (selectedGroup.name || selectedGroup.group_id) : 'None selected'}</strong>
          </div>
      </div>

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      <div className="identity-module__grid">
        <section className="identity-module__panel">
          <h4>Search</h4>
          <label className="settings-field">
            <span>User</span>
            <input
              type="text"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Search user by OPID/name/email"
            />
          </label>
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => void handleRunUserFlow()}
            disabled={flowLoading}
          >
            <UsersRound size={14} />
            {flowLoading ? 'Running...' : 'Run Get User Groups'}
          </button>

          <div className="association-list association-list--fit">
            {filteredUsers.length ? filteredUsers.map((user) => (
              <button
                type="button"
                key={user.opid}
                className={user.opid === selectedUserId ? 'association-list__item association-list__item--selected' : 'association-list__item'}
                onClick={() => setSelectedUserId(user.opid)}
              >
                <span className="association-list__title">{user.display_name || 'Unknown User'}</span>
                <span className="association-list__meta">{user.opid}</span>
                {user.email ? <span className="association-list__meta">{user.email}</span> : null}
              </button>
            )) : (
              <p className="status-text">No matching users.</p>
            )}
          </div>

          <label className="settings-field">
            <span>Group</span>
            <input
              type="text"
              value={groupQuery}
              onChange={(event) => setGroupQuery(event.target.value)}
              placeholder="Type to search groups"
              disabled={!selectedUser}
            />
          </label>
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => void handleRunGroupFlow()}
            disabled={flowLoading || !selectedUser}
          >
            <Sparkles size={14} />
            {flowLoading ? 'Searching...' : 'Search Power Automate'}
          </button>
          {siteSuggestions.length ? (
            <div className="association-history">
              <span className="association-history__label">Site-based suggestions</span>
              <div className="association-chip-list association-chip-list--history">
                {siteSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={`site-suggestion-${suggestion}`}
                    className="association-chip association-chip--button"
                    onClick={() => setGroupQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="association-list association-list--fit">
            {filteredGroups.length ? filteredGroups.map((group) => (
              <button
                type="button"
                key={group.group_id}
                className={group.group_id === selectedGroupId ? 'association-list__item association-list__item--selected' : 'association-list__item'}
                onClick={() => setSelectedGroupId(group.group_id)}
              >
                <span className="association-list__title">{group.name || group.group_id}</span>
                <span className="association-list__meta">{group.group_id}</span>
              </button>
            )) : (
              <p className="status-text">{groupQuery.trim() ? 'No matching groups.' : 'Type in group search to view results.'}</p>
            )}
          </div>
        </section>

        <section className="identity-module__panel">
          <h4>Association</h4>
          <div className="association-summary">
            <div className="association-summary__row">
              <span>User Groups</span>
              <strong>{selectedUserGroups.length}</strong>
            </div>
            <div className="association-summary__row">
              <span>Status</span>
              <strong>
                {selectedGroup ? (alreadyAssigned ? 'Already Assigned' : 'Not Assigned') : 'Select a group'}
              </strong>
            </div>
          </div>
          <div className="association-validation__list">
            {selectedUserGroups.length ? selectedUserGroups.map((group) => (
              <div className="association-validation__row" key={group.group_id}>
                <span>{group.name || group.group_id}</span>
                <span className={selectedGroup && selectedGroup.group_id === String(group.group_id) ? 'association-status association-status--assigned' : 'association-status association-status--missing'}>
                  {selectedGroup && selectedGroup.group_id === String(group.group_id) ? 'Selected' : 'Member'}
                </span>
              </div>
            )) : (
              <p className="status-text">No cached groups for selected user.</p>
            )}
          </div>
        </section>

        <section className="identity-module__panel">
          <h4>Output</h4>
          <div className="association-summary">
            <div className="association-summary__row">
              <span>User</span>
              <strong>{selectedUser ? selectedUser.opid : 'None'}</strong>
            </div>
            <div className="association-summary__row">
              <span>Group</span>
              <strong>{selectedGroup ? selectedGroup.name || selectedGroup.group_id : 'None'}</strong>
            </div>
          </div>
          <div className="textarea-field">
            <textarea
              className="association-script association-script--fit"
              readOnly
              value={generateScript(selectedUser, selectedGroup, alreadyAssigned, siteCode)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default IdentityAccessModule;
