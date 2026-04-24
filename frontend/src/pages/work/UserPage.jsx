import { useEffect, useMemo, useState } from 'react';
import { HardDrive, RefreshCcw, Users, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserTemplate } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';

function clean(value) {
  return String(value || '').trim();
}

function toProfileRows(profile = {}) {
  const rows = [];
  const entries = [
    ['Title', profile.job_title || profile.title],
    ['Department', profile.department],
    ['Location', profile.location],
    ['Account Enabled', profile.account_enabled === null || profile.account_enabled === undefined ? '' : String(Boolean(profile.account_enabled))],
    ['Source', profile.source],
  ];
  entries.forEach(([label, value]) => {
    const text = clean(value);
    if (text) {
      rows.push({ label, value: text });
    }
  });
  return rows;
}

function toGroupRows(groups = []) {
  return (Array.isArray(groups) ? groups : []).map((group) => {
    const id = clean(group.group_id || group.id);
    const name = clean(group.name) || id;
    return {
      id: id || name || 'group',
      name: name || 'Unknown Group',
    };
  }).filter((group) => clean(group.id || group.name));
}

function toDeviceRows(devices = []) {
  return (Array.isArray(devices) ? devices : []).map((device) => {
    const name = clean(device.name || device.device_name || device.computer_name || device.asset_tag) || 'Unknown Device';
    return {
      id: clean(device.id || device.asset_tag || name) || name,
      name,
      location: clean(device.location),
      status: clean(device.status) || 'Unknown',
    };
  });
}

export function UserPage() {
  const { identifier = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [groupQuery, setGroupQuery] = useState('');

  const user = payload?.user || {};
  const profile = payload?.profile || {};
  const groupRows = useMemo(() => toGroupRows(payload?.groups || []), [payload]);
  const deviceRows = useMemo(() => toDeviceRows(payload?.devices || []), [payload]);
  const profileRows = useMemo(() => toProfileRows(profile), [profile]);

  const filteredGroups = useMemo(() => {
    const query = clean(groupQuery).toLowerCase();
    if (!query) {
      return groupRows;
    }
    return groupRows.filter((group) => clean(group.name).toLowerCase().includes(query) || clean(group.id).toLowerCase().includes(query));
  }, [groupQuery, groupRows]);

  async function loadData({ refresh = false } = {}) {
    if (!clean(identifier)) {
      return;
    }
    setError('');
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const nextPayload = await getUserTemplate(identifier, { refresh });
      setPayload(nextPayload || null);
    } catch (requestError) {
      setError(requestError.message || 'User context could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData({ refresh: false });
  }, [identifier]);

  if (!clean(identifier)) {
    return (
      <section className="module user-template-page">
        <EmptyState title="No identifier supplied" description="Open this page with a user OPID or name in the URL." />
      </section>
    );
  }

  return (
    <section className="module user-template-page">
      <Card className="user-template-card user-template-header">
        <CardHeader
          eyebrow="User Template"
          title={clean(user.name) || clean(identifier)}
          description={clean(user.email) || 'No email on record'}
          action={<span className="user-template-opid">{clean(user.opid) || 'Unknown OPID'}</span>}
        />
        <div className="user-template-header__actions">
          <button className="compact-toggle" disabled={refreshing} onClick={() => void loadData({ refresh: true })} type="button">
            <RefreshCcw size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="compact-toggle" disabled type="button">Compare (Soon)</button>
        </div>
      </Card>

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <div className="user-template-tabs" role="tablist" aria-label="User context tabs">
        <button className={activeTab === 'overview' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'} onClick={() => setActiveTab('overview')} type="button">
          <UserRound size={14} />
          Overview
        </button>
        <button className={activeTab === 'groups' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'} onClick={() => setActiveTab('groups')} type="button">
          <Users size={14} />
          Groups
        </button>
        <button className={activeTab === 'devices' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'} onClick={() => setActiveTab('devices')} type="button">
          <HardDrive size={14} />
          Devices
        </button>
      </div>

      <div className="user-template-grid">
        {(activeTab === 'overview' || activeTab === 'groups') ? (
          <Card className="user-template-card">
            <CardHeader eyebrow="Membership" title="Groups" description="Power Automate-backed membership results." />
            {loading ? <div className="user-template-skeleton-list" /> : null}
            {!loading && groupRows.length ? (
              <>
                <label className="settings-field user-template-group-search">
                  <span>Search groups</span>
                  <input
                    type="text"
                    value={groupQuery}
                    onChange={(event) => setGroupQuery(event.target.value)}
                    placeholder="Filter group name or id"
                  />
                </label>
                <div className="user-template-scroll">
                  {filteredGroups.map((group) => (
                    <div className="user-template-list-row" key={group.id}>
                      <strong title={group.name}>{group.name}</strong>
                      <span className="user-template-pill">Member</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {!loading && !groupRows.length ? (
              <EmptyState title="No groups available" description="No memberships were returned yet for this user." />
            ) : null}
          </Card>
        ) : null}

        {(activeTab === 'overview') ? (
          <Card className="user-template-card">
            <CardHeader eyebrow="Directory" title="Profile" description="Resolved profile from cached source + flow refresh." />
            {loading ? <div className="user-template-skeleton-grid" /> : null}
            {!loading && profileRows.length ? (
              <div className="user-template-profile-grid">
                {profileRows.map((item) => (
                  <div className="user-template-profile-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong title={item.value}>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            {!loading && !profileRows.length ? (
              <EmptyState title="No profile fields" description="Profile data is still empty for this user." />
            ) : null}
          </Card>
        ) : null}

        {(activeTab === 'overview' || activeTab === 'devices') ? (
          <Card className="user-template-card">
            <CardHeader eyebrow="Inventory" title="Devices" description="Matched from local hardware datasets." />
            {loading ? <div className="user-template-skeleton-list" /> : null}
            {!loading && deviceRows.length ? (
              <div className="user-template-device-list">
                {deviceRows.map((device) => (
                  <button
                    className="user-template-list-row user-template-list-row--button"
                    key={device.id}
                    onClick={() => navigate(`/app/work/hardware/rmr-record?device=${encodeURIComponent(device.name)}`)}
                    type="button"
                  >
                    <strong title={device.name}>{device.name}</strong>
                    <small title={`${device.location || 'Unknown'} · ${device.status}`}>{`${device.location || 'Unknown'} · ${device.status}`}</small>
                  </button>
                ))}
              </div>
            ) : null}
            {!loading && !deviceRows.length ? (
              <EmptyState title="No devices matched" description="No local hardware records matched owner or assigned user fields." />
            ) : null}
          </Card>
        ) : null}
      </div>
    </section>
  );
}

export default UserPage;
