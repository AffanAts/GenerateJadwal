const keyFor = (year, month) => `jadwal-soc:${year}-${String(month + 1).padStart(2, '0')}`;

export function loadSaved(year, month) {
  try {
    const raw = localStorage.getItem(keyFor(year, month));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMonth(year, month, data) {
  try {
    localStorage.setItem(keyFor(year, month), JSON.stringify(data));
  } catch {
    // storage full or blocked (private mode): the app still works, just without saving
  }
}

export function removeMonth(year, month) {
  try {
    localStorage.removeItem(keyFor(year, month));
  } catch {
    // nothing to remove if storage is blocked
  }
}
