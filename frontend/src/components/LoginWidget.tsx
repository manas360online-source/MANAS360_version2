import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginWidget() {
  const { login, logout, token } = useAuth();
  const [value, setValue] = useState('');

  const onLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value) return;
    login(value);
    setValue('');
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, maxWidth: 420 }}>
      <div style={{ marginBottom: 8 }}><strong>Auth</strong></div>
      <form onSubmit={onLogin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input placeholder="Paste token or enter mock" value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1 }} />
        <button type="submit">Set Token</button>
        <button type="button" onClick={() => logout()}>Clear</button>
      </form>
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Current token: {token ? 'set' : 'none'}</div>
    </div>
  );
}
