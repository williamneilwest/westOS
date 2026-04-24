export function isUsableUserValue(value) {
  const text = String(value || '').trim();
  return Boolean(text && text !== '—' && text.toLowerCase() !== 'unknown');
}

export async function openUserRecord(name, navigate) {
  const userName = String(name || '').trim();
  if (!isUsableUserValue(userName) || typeof navigate !== 'function') {
    return;
  }

  const params = new URLSearchParams();
  params.set('query', userName);
  params.set('lookup', 'peoplesoft');
  navigate(`/app/work/users?${params.toString()}`);
}
