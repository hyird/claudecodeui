import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { createCollaborator, listUsers, removeCollaborator } from './api';
import type { AuthUser } from './types';

type Props = {
  token: string;
  onClose: () => void;
};

export default function CollaboratorsDialog({ token, onClose }: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let disposed = false;
    void listUsers(token).then(
      (next) => { if (!disposed) setUsers(next); },
      (reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : '无法加载协作者。'); },
    );
    return () => { disposed = true; };
  }, [token]);

  const addUser = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await createCollaborator(token, username, password);
      setUsers((current) => [...current, user]);
      setUsername('');
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法创建协作者。');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (user: AuthUser) => {
    if (busy || !window.confirm(`移除 ${user.username}？该用户的终端会话将结束。`)) return;
    setBusy(true);
    setError('');
    try {
      await removeCollaborator(token, user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法移除协作者。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="collaborators-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="collaborators-dialog" role="dialog" aria-modal="true" aria-label="管理协作者">
        <div className="collaborators-heading">
          <div>
            <h2>协作者</h2>
            <p>每个账号有独立的终端和标签。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭协作者管理">关闭</button>
        </div>
        {error && <p className="collaborators-error" role="alert">{error}</p>}
        <ul className="collaborators-list">
          {users.map((user) => (
            <li key={user.id}>
              <span>{user.username} <small>{user.role === 'admin' ? '管理员' : '协作者'}</small></span>
              {user.role === 'member' && (
                <button type="button" disabled={busy} onClick={() => { void removeUser(user); }}>移除</button>
              )}
            </li>
          ))}
        </ul>
        <form className="collaborators-form" onSubmit={(event) => { void addUser(event); }}>
          <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={80} required autoComplete="off" /></label>
          <label>初始密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required autoComplete="new-password" /></label>
          <button type="submit" disabled={busy}>创建账号</button>
        </form>
      </section>
    </div>
  );
}
