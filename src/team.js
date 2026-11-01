export const NO_PARTNER_KEYS = ['OFF', 'CUTI'];

// team = { Nama: { level: 'L1' | 'L2', shifts: { [tanggal]: kode } } }
export const findSelf = (team, name) => {
  const first = name.trim().split(' ')[0].toLowerCase();
  return Object.keys(team).find((n) => n.toLowerCase() === first) ?? null;
};

export const groupsOf = (team) => {
  const groups = { L1: [], L2: [] };
  Object.entries(team).forEach(([n, p]) => {
    (groups[p.level] ??= []).push(n);
  });
  return groups;
};

export const sameShiftPeers = (team, self, day, key) => {
  const peers = { L1: [], L2: [] };
  Object.entries(team).forEach(([n, p]) => {
    if (n !== self && p.shifts[day] === key) (peers[p.level] ??= []).push(n);
  });
  return peers;
};

export function planFromTeam(team, self, total, withPartners) {
  const entries = { ...team[self].shifts };
  const partners = {};
  const queue = [];
  if (withPartners) {
    for (let d = 1; d <= total; d++) {
      const key = entries[d];
      if (!key || NO_PARTNER_KEYS.includes(key)) continue;
      const peers = sameShiftPeers(team, self, d, key);
      const levels = Object.keys(peers).filter((l) => peers[l].length);
      const preset = {};
      levels.forEach((l) => {
        if (peers[l].length === 1) [preset[l]] = peers[l];
      });
      if (Object.keys(preset).length) partners[d] = preset;
      if (!levels.every((l) => preset[l])) queue.push(d);
    }
  }
  return { entries, partners, queue };
}

// Every shift of every day must hold exactly 2 L1 and 1 L2 (extra people are REG).
export const SHIFT_RULE = { L1: 2, L2: 1 };

export function staffingIssues(team, total) {
  const people = Object.values(team);
  const issues = [];
  for (let day = 1; day <= total; day++) {
    const bad = ['1', '2', '3'].flatMap((shift) => {
      const count = { L1: 0, L2: 0 };
      people.forEach((p) => {
        if ((p.shifts[day] ?? '').replace('+', '') === shift && count[p.level] !== undefined) {
          count[p.level] += 1;
        }
      });
      const ok = count.L1 === SHIFT_RULE.L1 && count.L2 === SHIFT_RULE.L2;
      return ok ? [] : [`S${shift}: ${count.L1} L1 + ${count.L2} L2`];
    });
    if (bad.length) issues.push({ day, text: bad.join('; ') });
  }
  return issues;
}
