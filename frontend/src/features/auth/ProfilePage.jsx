import { ExternalLink, Pencil, Plus, Save, Shield, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../../app/ui/Card';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { getAdminUsers, getProfile, updateProfile } from '../../app/services/auth';

function normalizeLinks(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ({
      label: String(item?.label || '').trim(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => item.label && item.url);
}

function normalizeFormSnapshot(form) {
  return JSON.stringify({
    preferred_name: String(form?.preferred_name || '').trim(),
    site_code: String(form?.site_code || '').trim(),
    site_name: String(form?.site_name || '').trim(),
    default_assignment_group: String(form?.default_assignment_group || '').trim(),
    default_location: String(form?.default_location || '').trim(),
    quick_links: normalizeLinks(form?.quick_links),
  });
}

const EMPTY_FORM = {
  preferred_name: '',
  site_code: '',
  site_name: '',
  default_assignment_group: '',
  default_location: '',
  quick_links: [],
};

const EMPTY_LINK_EDITOR = {
  open: false,
  index: -1,
  label: '',
  url: '',
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAdmin, refreshUser } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(normalizeFormSnapshot(EMPTY_FORM));
  const [adminUsers, setAdminUsers] = useState([]);
  const [linkEditor, setLinkEditor] = useState(EMPTY_LINK_EDITOR);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const payload = await getProfile();
        if (!mounted) {
          return;
        }
        const profile = payload?.profile || {};
        const nextForm = {
          preferred_name: String(profile?.preferred_name || ''),
          site_code: String(profile?.site_code || ''),
          site_name: String(profile?.site_name || ''),
          default_assignment_group: String(profile?.default_assignment_group || ''),
          default_location: String(profile?.default_location || ''),
          quick_links: normalizeLinks(profile?.quick_links),
        };
        setForm(nextForm);
        setInitialSnapshot(normalizeFormSnapshot(nextForm));
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || 'Could not load profile.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAdminUsers([]);
      return;
    }
    let mounted = true;
    getAdminUsers()
      .then((payload) => {
        if (mounted) {
          setAdminUsers(Array.isArray(payload?.items) ? payload.items : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setAdminUsers([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const quickLinks = useMemo(() => normalizeLinks(form.quick_links), [form.quick_links]);
  const isDirty = useMemo(() => normalizeFormSnapshot(form) !== initialSnapshot, [form, initialSnapshot]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAddLinkModal() {
    setLinkEditor({ open: true, index: -1, label: '', url: '' });
  }

  function openEditLinkModal(index) {
    const target = quickLinks[index];
    if (!target) {
      return;
    }
    setLinkEditor({
      open: true,
      index,
      label: String(target.label || ''),
      url: String(target.url || ''),
    });
  }

  function closeLinkModal() {
    setLinkEditor(EMPTY_LINK_EDITOR);
  }

  function saveLinkModal(event) {
    event.preventDefault();
    const label = String(linkEditor.label || '').trim();
    const url = String(linkEditor.url || '').trim();
    if (!label || !url) {
      return;
    }

    setForm((current) => {
      const nextLinks = [...normalizeLinks(current.quick_links)];
      if (linkEditor.index >= 0 && nextLinks[linkEditor.index]) {
        nextLinks[linkEditor.index] = { label, url };
      } else {
        nextLinks.push({ label, url });
      }
      return {
        ...current,
        quick_links: nextLinks,
      };
    });
    closeLinkModal();
  }

  function removeQuickLink(index) {
    setForm((current) => ({
      ...current,
      quick_links: normalizeLinks(current.quick_links).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave(event) {
    event?.preventDefault?.();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await updateProfile({
        preferred_name: form.preferred_name,
        site_code: form.site_code,
        site_name: form.site_name,
        default_assignment_group: form.default_assignment_group,
        default_location: form.default_location,
        quick_links: normalizeLinks(form.quick_links),
      });
      const profile = payload?.profile || {};
      const nextForm = {
        preferred_name: String(profile?.preferred_name || form.preferred_name || ''),
        site_code: String(profile?.site_code || form.site_code || ''),
        site_name: String(profile?.site_name || form.site_name || ''),
        default_assignment_group: String(profile?.default_assignment_group || form.default_assignment_group || ''),
        default_location: String(profile?.default_location || form.default_location || ''),
        quick_links: normalizeLinks(profile.quick_links || form.quick_links),
      };
      setForm(nextForm);
      setInitialSnapshot(normalizeFormSnapshot(nextForm));
      await refreshUser();
      setMessage('Profile saved.');
    } catch (requestError) {
      setError(requestError.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module profile-page">
      <Card>
        <CardHeader
          eyebrow="/app/profile"
          title="Profile"
          description="Compact personal control center for identity and work defaults."
          action={
            <button className="ui-button ui-button--primary" type="button" onClick={() => void handleSave()} disabled={saving || !isDirty || loading}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          }
        />

        <div className="profile-summary-row">
          <div className="profile-summary-pill"><span>Username</span><strong>{user?.username || 'user'}</strong></div>
          <div className="profile-summary-pill"><span>Preferred</span><strong>{form.preferred_name || 'Not set'}</strong></div>
          <div className="profile-summary-pill"><span>Site</span><strong>{form.site_code || form.site_name || 'Not set'}</strong></div>
          <div className="profile-summary-pill"><span>Default Group</span><strong>{form.default_assignment_group || 'Not set'}</strong></div>
          <div className="profile-summary-pill"><span>Default Location</span><strong>{form.default_location || 'Not set'}</strong></div>
        </div>
      </Card>

      {loading ? <p className="status-text">Loading profile...</p> : null}
      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      {!loading ? (
        <form onSubmit={handleSave} className="profile-layout">
          <div className="profile-col profile-col--left">
            <Card>
              <CardHeader eyebrow="Personal" title="Personal Info" action={<span className="icon-badge"><UserRound size={16} /></span>} />
              <div className="settings-form profile-tight-form">
                <label className="settings-field">
                  <span>Preferred Name</span>
                  <input type="text" value={form.preferred_name} onChange={(event) => updateField('preferred_name', event.target.value)} />
                </label>
                <label className="settings-field">
                  <span>Site Code</span>
                  <input type="text" value={form.site_code} onChange={(event) => updateField('site_code', event.target.value)} />
                </label>
                <label className="settings-field">
                  <span>Site Name</span>
                  <input type="text" value={form.site_name} onChange={(event) => updateField('site_name', event.target.value)} />
                </label>
              </div>
            </Card>

            <Card>
              <CardHeader eyebrow="Defaults" title="Work Defaults" />
              <div className="settings-form profile-tight-form">
                <label className="settings-field">
                  <span>Default Assignment Group</span>
                  <input type="text" value={form.default_assignment_group} onChange={(event) => updateField('default_assignment_group', event.target.value)} />
                </label>
                <label className="settings-field">
                  <span>Default Location</span>
                  <input type="text" value={form.default_location} onChange={(event) => updateField('default_location', event.target.value)} />
                </label>
              </div>
            </Card>
          </div>

          <div className="profile-col profile-col--right">
            <Card>
              <CardHeader
                eyebrow="Links"
                title="Quick Links"
                action={
                  <button type="button" className="compact-toggle" onClick={openAddLinkModal}>
                    <Plus size={14} />
                    Add Link
                  </button>
                }
              />

              {quickLinks.length ? (
                <div className="stack-list">
                  {quickLinks.map((link, index) => (
                    <div className="stack-row" key={`quick-link-${index}`}>
                      <span className="stack-row__label">
                        <span>
                          <strong>{link.label}</strong>
                          <small className="quick-link-url" title={link.url}>{link.url}</small>
                        </span>
                      </span>
                      <div className="stack-row__actions">
                        <a className="compact-toggle" href={link.url} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} />
                          Open
                        </a>
                        <button type="button" className="compact-toggle" onClick={() => openEditLinkModal(index)}>
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button type="button" className="compact-toggle" onClick={() => removeQuickLink(index)}>
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="status-text">No quick links configured.</p>
              )}
            </Card>

            {isAdmin ? (
              <Card>
                <CardHeader eyebrow="Admin" title="Admin Panel" action={<span className="icon-badge"><Shield size={16} /></span>} />
                <div className="table-actions profile-admin-actions">
                  <button type="button" className="compact-toggle" onClick={() => navigate('/app/admin/users')}>
                    View Users
                  </button>
                  <button type="button" className="compact-toggle" onClick={() => navigate('/app/admin/users')}>
                    Manage Roles
                  </button>
                  <button type="button" className="compact-toggle" onClick={() => navigate('/app/admin/flow-builder')}>
                    Flow Templates
                  </button>
                </div>
                <p className="status-text">{`${adminUsers.length} registered users available.`}</p>
              </Card>
            ) : null}
          </div>

          <div className="profile-save-sticky">
            <div className="profile-save-sticky__state">
              <span className={isDirty ? 'association-status association-status--missing' : 'association-status association-status--assigned'}>
                {isDirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </div>
            <button type="submit" className="ui-button ui-button--primary" disabled={saving || !isDirty}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : null}

      {linkEditor.open ? (
        <div className="auth-modal" role="presentation" onClick={closeLinkModal}>
          <div className="auth-modal__surface" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Card className="auth-modal__card">
              <CardHeader
                eyebrow="Quick Links"
                title={linkEditor.index >= 0 ? 'Edit Link' : 'Add Link'}
                description="Save reusable links for faster navigation."
              />
              <form className="settings-form" onSubmit={saveLinkModal}>
                <label className="settings-field">
                  <span>Label</span>
                  <input
                    type="text"
                    value={linkEditor.label}
                    onChange={(event) => setLinkEditor((current) => ({ ...current, label: event.target.value }))}
                    required
                  />
                </label>
                <label className="settings-field">
                  <span>URL</span>
                  <input
                    type="url"
                    value={linkEditor.url}
                    onChange={(event) => setLinkEditor((current) => ({ ...current, url: event.target.value }))}
                    required
                  />
                </label>
                <div className="table-actions">
                  <button type="button" className="compact-toggle" onClick={closeLinkModal}>Cancel</button>
                  <button type="submit" className="ui-button ui-button--primary">Save Link</button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
