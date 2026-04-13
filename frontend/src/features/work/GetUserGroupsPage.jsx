import { Database, HardDrive, MapPin, Network, RefreshCcw, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBackNavigation } from '../../app/hooks/useBackNavigation';
import { getUploadFile, getUploads, getUserGroups } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { parseCsvText } from './workDatasetCache';
import {
  getCachedUsersFromMap,
  normalizeFlowMembershipResponse,
  readUserGroupsCacheMap,
  upsertCachedUserRecord,
  writeUserGroupsCacheMap,
} from './userGroupsCache';

let HARDWARE_DATASET_CACHE = null;
let HARDWARE_DATASET_PROMISE = null;

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function readFirst(row, keys) {
  for (const key of keys) {
    const value = String(row?.[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function normalizeHardwareRow(row) {
  const assignedTo = readFirst(row, ['u_hardware_1.assigned_to', 'assigned_to', 'assignedto', 'assignee', 'assigned']);
  const assetTag = readFirst(row, ['u_hardware_1.asset_tag', 'asset_tag', 'assettag']);
  const serial = readFirst(row, ['u_hardware_1.serial_number', 'serial_number', 'serial']);
  const ip = readFirst(row, ['u_hardware_1.ip_address', 'ip_address', 'ip']);
  const mac = readFirst(row, ['u_hardware_1.mac_address', 'mac_address', 'mac']);
  const status = readFirst(row, ['u_hardware_1.install_status', 'install_status', 'status']);
  const lastSeen = readFirst(row, ['u_hardware_1.last_discovered', 'last_discovered', 'last_seen', 'updated_at']);
  const location = readFirst(row, ['u_hardware_1.location', 'location', 'site']);
  const type = readFirst(row, ['u_hardware_1.model_category', 'model_category', 'type', 'category', 'class']);
  const deviceName = readFirst(row, ['u_hardware_1.name', 'name', 'display_name', 'ci_name', 'computer_name']) || serial || assetTag || 'Unknown device';

  return {
    id: assetTag || serial || deviceName,
    deviceName,
    type: type || 'Hardware',
    assignedTo,
    assetTag,
    serial,
    ip,
    mac,
    status: status || 'Unknown',
    lastSeen,
    location: location || 'Unknown',
    raw: row,
  };
}

function extractAgeDays(value) {
  const parsed = Date.parse(String(value || ''));
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - parsed) / 86400000));
}

function hasValidHardwareFilename(file) {
  const name = String(file?.filename || '').toLowerCase();
  return name.includes('hardware') && name.endsWith('.csv');
}

async function loadHardwareDataset() {
  if (HARDWARE_DATASET_CACHE) {
    return HARDWARE_DATASET_CACHE;
  }
  if (HARDWARE_DATASET_PROMISE) {
    return HARDWARE_DATASET_PROMISE;
  }

  HARDWARE_DATASET_PROMISE = (async () => {
    const uploads = await getUploads();
    const files = Array.isArray(uploads) ? uploads : [];
    const candidates = files
      .filter(hasValidHardwareFilename)
      .sort((left, right) => (Date.parse(right?.modifiedAt || '') || 0) - (Date.parse(left?.modifiedAt || '') || 0));

    const selected = candidates[0];
    if (!selected?.url) {
      HARDWARE_DATASET_CACHE = { rows: [], fileName: '', modifiedAt: '' };
      return HARDWARE_DATASET_CACHE;
    }

    const csvText = await getUploadFile(selected.url);
    const parsed = parseCsvText(csvText);
    HARDWARE_DATASET_CACHE = {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      fileName: String(selected.filename || ''),
      modifiedAt: String(selected.modifiedAt || ''),
    };
    return HARDWARE_DATASET_CACHE;
  })();

  try {
    return await HARDWARE_DATASET_PROMISE;
  } finally {
    HARDWARE_DATASET_PROMISE = null;
  }
}

function matchesSelectedUser(device, selectedUser) {
  const assigned = normalizeText(device?.assignedTo);
  if (!assigned || !selectedUser) {
    return false;
  }
  const candidates = [
    selectedUser.opid,
    selectedUser.display_name,
    selectedUser.email,
  ].map(normalizeText).filter(Boolean);
  return candidates.some((candidate) => assigned.includes(candidate));
}

export function GetUserGroupsPage() {
  const location = useLocation();
  const goBack = useBackNavigation('/app/work');
  const backLabel = location.state?.label || 'Work Hub';
  const [userOpid, setUserOpid] = useState('');
  const [cache, setCache] = useState({});
  const [selectedOpid, setSelectedOpid] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hardwareLoading, setHardwareLoading] = useState(false);
  const [hardwareError, setHardwareError] = useState('');
  const [hardwareDataset, setHardwareDataset] = useState({ rows: [], fileName: '', modifiedAt: '' });

  useEffect(() => {
    const nextCache = readUserGroupsCacheMap();
    const normalizedUsers = getCachedUsersFromMap(nextCache);
    setCache(nextCache);
    setSelectedOpid(normalizedUsers[0]?.opid || '');
  }, []);

  useEffect(() => {
    let mounted = true;
    setHardwareLoading(true);
    setHardwareError('');
    loadHardwareDataset()
      .then((dataset) => {
        if (mounted) {
          setHardwareDataset(dataset || { rows: [], fileName: '', modifiedAt: '' });
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setHardwareError(requestError.message || 'Hardware dataset could not be loaded.');
        }
      })
      .finally(() => {
        if (mounted) {
          setHardwareLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const cachedUsers = useMemo(() => getCachedUsersFromMap(cache), [cache]);
  const selectedUser = useMemo(
    () => (selectedOpid ? cachedUsers.find((user) => user.opid === selectedOpid) || null : null),
    [cachedUsers, selectedOpid]
  );

  const filteredGroups = useMemo(() => {
    const groups = Array.isArray(selectedUser?.groups) ? selectedUser.groups : [];
    const query = normalizeText(groupQuery);
    const visible = groups.filter((group) => {
      const id = String(group?.id || '').trim();
      if (!id || id.includes('$metadata') || id.startsWith('https://graph.microsoft.com')) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [group?.name, group?.id].some((value) => normalizeText(value).includes(query));
    });
    return visible.sort((left, right) => String(left?.name || left?.id).localeCompare(String(right?.name || right?.id)));
  }, [groupQuery, selectedUser]);

  const userDevices = useMemo(() => {
    const rows = Array.isArray(hardwareDataset?.rows) ? hardwareDataset.rows : [];
    if (!selectedUser) {
      return [];
    }
    return rows
      .map(normalizeHardwareRow)
      .filter((device) => matchesSelectedUser(device, selectedUser))
      .map((device) => {
        const ageDays = extractAgeDays(device.lastSeen);
        return {
          ...device,
          ageDays,
          stale: typeof ageDays === 'number' && ageDays > 30,
          missingNetwork: !device.ip || !device.mac,
        };
      });
  }, [hardwareDataset?.rows, selectedUser]);

  const groupedDevices = useMemo(() => {
    const groups = {};
    userDevices.forEach((device) => {
      const groupKey = device.location || device.type || 'Unspecified';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(device);
    });
    return Object.entries(groups).sort((left, right) => left[0].localeCompare(right[0]));
  }, [userDevices]);

  const staleCount = useMemo(() => userDevices.filter((device) => device.stale).length, [userDevices]);

  async function loadUserGroups(normalizedOpid, forceRefresh = false) {
    if (!normalizedOpid) {
      setError('Enter a user OPID before running the lookup.');
      return;
    }

    if (!forceRefresh && cache[normalizedOpid]) {
      setSelectedOpid(normalizedOpid);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getUserGroups(normalizedOpid);
      const normalized = normalizeFlowMembershipResponse(response, normalizedOpid);
      const nextCache = upsertCachedUserRecord(normalized, cache);
      setCache(nextCache);
      writeUserGroupsCacheMap(nextCache);
      setSelectedOpid(normalizedOpid);
    } catch (requestError) {
      setError(requestError.message || 'User group lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadUserGroups(userOpid.trim(), false);
  }

  async function handleRefresh() {
    await loadUserGroups((selectedOpid || userOpid).trim(), true);
  }

  return (
    <section className="module">
      <SectionHeader
        tag="/app/work/user-context"
        title="User Context"
        description="Operational view of user identity, membership, and associated hardware."
        actions={
          <button className="ui-button ui-button--secondary" onClick={goBack} type="button">
            {`Back to ${backLabel}`}
          </button>
        }
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <div className="card-grid">
        <Card className="landing__card">
          <CardHeader
            eyebrow="Lookup"
            title="Get User Groups"
            description='Uses scriptName "Get User Groups" and keeps cached memberships for faster context switching.'
          />

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field">
              <span>User OPID</span>
              <input
                type="text"
                value={userOpid}
                onChange={(event) => setUserOpid(event.target.value)}
                placeholder="Example: wnwd6f"
              />
            </label>
            <div className="stack-row__actions">
              <button type="submit" className="ui-button ui-button--primary" disabled={loading}>
                {loading ? 'Loading...' : 'Get User Groups'}
              </button>
              <button
                type="button"
                className="compact-toggle"
                onClick={() => void handleRefresh()}
                disabled={loading || (!selectedOpid && !userOpid.trim())}
              >
                <RefreshCcw size={14} />
                Refresh
              </button>
            </div>
          </form>
        </Card>

        <Card className="landing__card">
          <CardHeader
            eyebrow="User Context"
            title="Selected User"
            action={<span className="icon-badge"><UserRound size={16} /></span>}
          />
          {selectedUser ? (
            <div className="association-summary">
              <div className="association-summary__row">
                <span>Name / OPID</span>
                <strong>{selectedUser.display_name || selectedUser.opid}</strong>
              </div>
              <div className="association-summary__row">
                <span>Department</span>
                <strong>{String(selectedUser.department || '').trim() || 'Unknown'}</strong>
              </div>
              <div className="association-summary__row">
                <span>Location</span>
                <strong>{String(selectedUser.location || '').trim() || (userDevices[0]?.location || 'Unknown')}</strong>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Search size={20} />}
              title="No user selected"
              description="Run a lookup or select a cached user to open full user context."
            />
          )}
        </Card>

        <Card className="landing__card">
          <CardHeader
            eyebrow="Cache"
            title="Cached Users"
            action={<span className="icon-badge"><Database size={16} /></span>}
          />

          {cachedUsers.length ? (
            <div className="stack-list">
              {cachedUsers.map((item) => (
                <button
                  key={item.opid}
                  type="button"
                  className={item.opid === selectedOpid ? 'stack-row stack-row--interactive association-list__item--selected' : 'stack-row stack-row--interactive'}
                  onClick={() => setSelectedOpid(item.opid)}
                >
                  <span className="stack-row__label">
                    <span>
                      <strong>{item.display_name || item.opid}</strong>
                      <small>{item.opid}{item.email ? ` · ${item.email}` : ''}</small>
                    </span>
                  </span>
                  <strong>{item.total_count}</strong>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Database size={20} />}
              title="No cached users yet"
              description="User lookups will appear here after the first successful run."
            />
          )}
        </Card>
      </div>

      <div className="card-grid">
        <Card className="reference-card">
          <CardHeader
            eyebrow="Module"
            title="Group Membership"
            description="Clean list of user groups with local filtering."
            action={<span className="icon-badge"><Network size={16} /></span>}
          />

          <label className="settings-field">
            <span>Filter groups</span>
            <input
              type="text"
              value={groupQuery}
              onChange={(event) => setGroupQuery(event.target.value)}
              placeholder="Search by group name or id"
              disabled={!selectedUser}
            />
          </label>

          <div className="association-list association-list--fit">
            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <div className="association-list__item" key={group.id}>
                  <span className="association-list__title">{group.name || group.id}</span>
                  <span className="association-list__meta">{group.id}</span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Search size={18} />}
                title={selectedUser ? 'No groups found' : 'No user selected'}
                description={selectedUser ? 'Try another filter value.' : 'Select a user to view memberships.'}
              />
            )}
          </div>
        </Card>

        <Card className="reference-card reference-card--wide">
          <CardHeader
            eyebrow="Module"
            title="Associated Hardware Devices"
            description={hardwareDataset?.fileName ? `Source: ${hardwareDataset.fileName} · Updated ${formatTimestamp(hardwareDataset.modifiedAt)}` : 'Source: hardware upload dataset'}
            action={<span className="icon-badge"><HardDrive size={16} /></span>}
          />

          {hardwareLoading ? <p className="status-text">Loading hardware dataset...</p> : null}
          {hardwareError ? <p className="status-text status-text--error">{hardwareError}</p> : null}

          {!hardwareLoading && !hardwareError ? (
            <>
              <div className="dataset-metrics-grid">
                <div className="metric-tile"><span>Devices</span><strong>{userDevices.length}</strong></div>
                <div className="metric-tile"><span>Stale (&gt;30d)</span><strong>{staleCount}</strong></div>
                <div className="metric-tile"><span>Missing IP/MAC</span><strong>{userDevices.filter((device) => device.missingNetwork).length}</strong></div>
                <div className="metric-tile"><span>Groups</span><strong>{groupedDevices.length}</strong></div>
              </div>

              {groupedDevices.length ? (
                <div className="analysis-grid analysis-grid--tight">
                  {groupedDevices.map(([groupLabel, devices]) => (
                    <Card key={`devices-${groupLabel}`}>
                      <CardHeader
                        eyebrow="Location / Type"
                        title={groupLabel}
                        description={`${devices.length} device${devices.length === 1 ? '' : 's'}`}
                        action={<span className="icon-badge"><MapPin size={14} /></span>}
                      />
                      <div className="stack-list">
                        {devices.map((device) => (
                          <div className="stack-row" key={`${groupLabel}-${device.id}-${device.serial}`}>
                            <span className="stack-row__label">
                              <span>
                                <strong>{device.deviceName}</strong>
                                <small>{device.type}</small>
                                <small>{`Asset: ${device.assetTag || 'n/a'} · Serial: ${device.serial || 'n/a'}`}</small>
                                <small>{`IP: ${device.ip || 'missing'} · MAC: ${device.mac || 'missing'}`}</small>
                                <small>{`Status: ${device.status} · Last seen: ${device.lastSeen || 'unknown'} · Location: ${device.location}`}</small>
                              </span>
                            </span>
                            <div className="association-chip-list association-chip-list--history">
                              {device.stale ? <span className="association-chip">Stale</span> : null}
                              {device.missingNetwork ? <span className="association-chip">Missing IP/MAC</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<HardDrive size={20} />}
                  title="No associated hardware"
                  description={selectedUser ? 'No devices matched assigned_to for this user.' : 'Select a user to view associated devices.'}
                />
              )}
            </>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
