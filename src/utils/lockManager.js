const LOCK_KEY = 'auth_lock_info';

export const getLockInfo = () => {
  const info = localStorage.getItem(LOCK_KEY);
  if (!info) return null;
  
  const lockInfo = JSON.parse(info);
  const now = new Date();
  const lockEnd = new Date(lockInfo.endTime);

  // Clear expired lock
  if (now >= lockEnd) {
    localStorage.removeItem(LOCK_KEY);
    return null;
  }
  
  return lockInfo;
};

export const setLockInfo = (usernameOrEmail, endTime, attempts) => {
  localStorage.setItem(LOCK_KEY, JSON.stringify({
    usernameOrEmail,
    endTime,
    attempts,
    timestamp: new Date().toISOString()
  }));
};

export const clearLockInfo = () => {
  localStorage.removeItem(LOCK_KEY);
};
