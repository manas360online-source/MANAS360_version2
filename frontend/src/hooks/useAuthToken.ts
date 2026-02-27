import { useEffect, useState } from 'react';

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'accessToken') setToken(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { token, setToken };
}

export default useAuthToken;
