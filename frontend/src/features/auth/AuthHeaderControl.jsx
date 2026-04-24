import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle2 } from 'lucide-react';
import { Button } from '../../app/ui/Button';
import { logout } from '../../app/services/auth';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';

export function AuthHeaderControl({ onOpenLogin }) {
  const { authenticated, user, role } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [open]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      window.dispatchEvent(new CustomEvent('westos:auth-changed'));
      setOpen(false);
    }
  }

  if (!authenticated) {
    return (
      <Button type="button" variant="secondary" onClick={onOpenLogin}>
        Login
      </Button>
    );
  }

  return (
    <div className="auth-header" ref={menuRef}>
      <button
        type="button"
        className="auth-header__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <UserCircle2 size={16} />
        <span>{user?.username || 'user'}</span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="auth-header__menu">
          <div className="auth-header__identity">
            <strong>{user?.username || 'user'}</strong>
            <small>{String(role || 'user')}</small>
          </div>
          <button type="button" className="auth-header__menu-item" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default AuthHeaderControl;
