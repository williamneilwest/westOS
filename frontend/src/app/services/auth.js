const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

async function authRequest(path, options = {}) {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    credentials: 'include',
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload || {};
}

export function login(username, password) {
  return authRequest('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return authRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export function getCurrentUser() {
  return authRequest('/api/auth/me');
}

export function getProfile() {
  return authRequest('/api/profile');
}

export function updateProfile(payload) {
  return authRequest('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export function getUsers() {
  return authRequest('/api/users');
}

export function createManagedUser(payload) {
  return authRequest('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export function updateManagedUser(userId, payload) {
  return authRequest(`/api/users/${encodeURIComponent(String(userId || ''))}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}

export function deleteManagedUser(userId) {
  return authRequest(`/api/users/${encodeURIComponent(String(userId || ''))}`, {
    method: 'DELETE',
  });
}

export function getAdminUsers() {
  return authRequest('/api/admin/users');
}

export function updateAdminUser(userId, payload) {
  return authRequest(`/api/admin/users/${encodeURIComponent(String(userId || ''))}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
}
