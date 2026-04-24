import { useEffect, useState } from 'react';
import {
  createManagedUser,
  deleteManagedUser,
  getAdminUsers,
  updateAdminUser,
} from '../../app/services/auth';
import { Card, CardHeader } from '../../app/ui/Card';

export function AdminUsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const payload = await getAdminUsers();
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (requestError) {
      setItems([]);
      setError(requestError.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createManagedUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      });
      setForm({ username: '', password: '', role: 'user' });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      await updateAdminUser(userId, { role });
      setItems((current) => current.map((item) => (item.id === userId ? { ...item, role } : item)));
    } catch (requestError) {
      setError(requestError.message || 'Failed to update role.');
    }
  }

  async function handleActiveToggle(userId, isActive) {
    try {
      await updateAdminUser(userId, { is_active: isActive });
      setItems((current) => current.map((item) => (item.id === userId ? { ...item, is_active: isActive } : item)));
    } catch (requestError) {
      setError(requestError.message || 'Failed to update status.');
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteManagedUser(userId);
      setItems((current) => current.filter((item) => item.id !== userId));
    } catch (requestError) {
      setError(requestError.message || 'Failed to delete user.');
    }
  }

  return (
    <section className="module">
      <Card>
        <CardHeader
          eyebrow="/app/admin/users"
          title="User Management"
          description="Admin-only user and role management."
        />
        {error ? <p className="status-text status-text--error">{error}</p> : null}

        <form className="dataset-upload-form" onSubmit={handleCreate}>
          <input
            className="module-search"
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          />
          <input
            className="module-search"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          <select
            className="module-select"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="readonly">readonly</option>
          </select>
          <button className="ui-button ui-button--primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader eyebrow="Users" title="Accounts" />
        {loading ? <p className="status-text">Loading users...</p> : null}
        {!loading && !items.length ? <p className="status-text">No users found.</p> : null}
        {!loading && items.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.username}</td>
                    <td>
                      <select
                        className="module-select"
                        value={item.role || 'user'}
                        onChange={(event) => void handleRoleChange(item.id, event.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="readonly">readonly</option>
                      </select>
                    </td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown'}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(item.is_active)}
                        onChange={(event) => void handleActiveToggle(item.id, event.target.checked)}
                      />
                    </td>
                    <td>
                      <button className="ui-button ui-button--ghost" type="button" onClick={() => void handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
