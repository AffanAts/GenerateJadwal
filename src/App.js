import { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  DAY_NAMES,
  DEFAULT_NAME,
  MONTH_NAMES,
  OPTIONS,
  PARTNERS,
  daysInMonth,
  drawSchedule,
  nextMonth,
  optionByKey,
  weekdayIndex,
} from './schedule';
import { buildPrompt, parseImport } from './importer';
import { loadSaved, removeMonth, saveMonth } from './storage';
import TeamTable from './TeamTable';
import { features } from './features';
import {
  NO_PARTNER_KEYS,
  findSelf,
  groupsOf,
  planFromTeam,
  sameShiftPeers,
  staffingIssues,
} from './team';

const NO_DATA = {};

function App() {
  const [initial] = useState(() => {
    const next = nextMonth();
    return { ...next, saved: loadSaved(next.year, next.month) };
  });
  const [step, setStep] = useState('month');
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [withPartners, setWithPartners] = useState(initial.saved?.withPartners ?? false);
  const [name, setName] = useState(initial.saved?.name ?? DEFAULT_NAME);
  const [day, setDay] = useState(1);
  const [queue, setQueue] = useState(null);
  const [entries, setEntries] = useState(initial.saved?.entries ?? {});
  const [partners, setPartners] = useState(initial.saved?.partners ?? {});
  const [compareOn, setCompareOn] = useState(initial.saved?.compareOn ?? false);
  const [comparePerson, setComparePerson] = useState(initial.saved?.comparePerson ?? 'Arif');
  const [compare, setCompare] = useState(initial.saved?.compare ?? {});
  const [team, setTeam] = useState(initial.saved?.team ?? null);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [notice, setNotice] = useState('');
  const canvasRef = useRef(null);

  const total = daysInMonth(year, month);
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  const selfFirst = name.trim().split(' ')[0].toLowerCase();
  const selfKey = team ? findSelf(team, name) : null;
  const groups = team ? groupsOf(team) : PARTNERS;
  const compareData = team ? team[comparePerson]?.shifts ?? NO_DATA : compare;
  const hasData = Object.keys(entries).length > 0 || team !== null;
  const issues = team ? staffingIssues(team, total) : [];
  // Partner choices sit under the shift choices; with team data they need the shift first.
  const partnersVisible =
    step === 'days' &&
    withPartners &&
    (queue || (!NO_PARTNER_KEYS.includes(entries[day]) && (!team || Boolean(entries[day]))));

  const peersFor = (d, key) =>
    team
      ? sameShiftPeers(team, selfKey, d, key)
      : { L1: PARTNERS.L1.filter((n) => n.toLowerCase() !== selfFirst), L2: PARTNERS.L2 };

  useEffect(() => {
    if (step === 'result' && canvasRef.current) {
      drawSchedule(canvasRef.current, {
        name: name.trim() || DEFAULT_NAME,
        year,
        month,
        entries,
        partners,
        compare: compareData,
        compareName: compareOn ? comparePerson : null,
      });
    }
  }, [step, name, year, month, entries, partners, compareData, compareOn, comparePerson]);

  useEffect(() => {
    if (!hasData) return;
    saveMonth(year, month, {
      name,
      withPartners,
      compareOn,
      comparePerson,
      entries,
      partners,
      compare,
      team,
    });
  }, [
    hasData, year, month, name, withPartners, compareOn, comparePerson, entries, partners, compare, team,
  ]);

  const changeMonth = (nextYear, nextMonthIndex) => {
    const saved = loadSaved(nextYear, nextMonthIndex);
    setYear(nextYear);
    setMonth(nextMonthIndex);
    setEntries(saved?.entries ?? {});
    setPartners(saved?.partners ?? {});
    setCompare(saved?.compare ?? {});
    setTeam(saved?.team ?? null);
    if (saved) {
      setName(saved.name);
      setWithPartners(saved.withPartners);
      setCompareOn(saved.compareOn);
      setComparePerson(saved.comparePerson);
    }
  };

  const deleteSaved = () => {
    removeMonth(year, month);
    setEntries({});
    setPartners({});
    setCompare({});
    setTeam(null);
  };

  const promptText = buildPrompt({ year, month });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setImportMsg('Prompt disalin.');
    } catch {
      setImportMsg('Gagal menyalin otomatis. Pilih teks prompt lalu salin manual.');
    }
  };

  // Turns the stored team schedule into this person's own schedule and routes to the next screen.
  const routeFromTeam = (teamData, personName, monthTotal, extraNotes = []) => {
    const self = findSelf(teamData, personName);
    if (!self) {
      setEntries({});
      setPartners({});
      setQueue(null);
      setNotice(
        `Nama "${personName.trim().split(' ')[0]}" tidak ada di data tim. Ganti nama di bawah.`,
      );
      setStep('team');
      return;
    }
    const plan = planFromTeam(teamData, self, monthTotal, withPartners);
    const missing = [];
    for (let d = 1; d <= monthTotal; d++) if (!plan.entries[d]) missing.push(d);
    const notes = [...extraNotes];
    if (missing.length) notes.push(`Tanggal ${self} yang belum terbaca: ${missing.join(', ')}.`);
    setNotice(notes.join(' '));
    setEntries(plan.entries);
    setPartners(plan.partners);
    if (plan.queue.length) {
      setQueue(plan.queue);
      setDay(plan.queue[0]);
      setStep('days');
    } else {
      setQueue(null);
      setStep('result');
    }
  };

  const applyImport = () => {
    const r = parseImport(importText, { year, month });
    const people = Object.keys(r.team);
    if (!people.length) {
      setImportMsg('Tidak ada baris jadwal yang terbaca. Cek formatnya.');
      return;
    }
    setYear(r.year);
    setMonth(r.month);
    setTeam(r.team);
    setCompare({});
    if (!r.team[comparePerson]) {
      setComparePerson(people.find((n) => n.toLowerCase() !== selfFirst) ?? people[0]);
    }
    setImportMsg('');
    const notes = [`${people.length} orang terbaca.`];
    if (r.problems.length) notes.push(`Perlu dicek: ${r.problems.slice(0, 5).join('; ')}.`);
    const odd = staffingIssues(r.team, r.total).map((i) => i.day);
    if (odd.length) {
      const shown = odd.slice(0, 12).join(', ');
      notes.push(
        `Komposisi shift tidak sesuai aturan (2 L1 + 1 L2) di tanggal ${shown}${odd.length > 12 ? ', ...' : ''}.`,
      );
    }
    setEntries({});
    setPartners({});
    setNotice(notes.join(' '));
    setStep('team');
  };

  const startFromName = () => {
    setNotice('');
    if (team) {
      routeFromTeam(team, name, total);
      return;
    }
    setQueue(null);
    setDay(1);
    setStep('days');
  };

  const advance = () => {
    if (queue) {
      const next = queue.find((d) => d > day);
      if (next) {
        setDay(next);
      } else {
        setStep('result');
      }
    } else if (day < total) {
      setDay(day + 1);
    } else if (compareOn && !team) {
      setDay(1);
      setStep('compare');
    } else {
      setStep('result');
    }
  };

  const removePartner = () => setPartners(({ [day]: _removed, ...rest }) => rest);

  const neededLevels = (d, key) => {
    const peers = peersFor(d, key);
    return Object.keys(peers).filter((l) => peers[l].length);
  };

  const pickShift = (key) => {
    setEntries((prev) => ({ ...prev, [day]: key }));
    if (!withPartners || NO_PARTNER_KEYS.includes(key)) {
      removePartner();
      advance();
      return;
    }
    // team data: fill levels that have a single candidate; manual: keep partners tapped before the shift
    const peers = peersFor(day, key);
    const levels = neededLevels(day, key);
    const chosen = { ...partners[day] };
    levels.forEach((l) => {
      if (peers[l].length === 1) [chosen[l]] = peers[l];
      else if (!peers[l].includes(chosen[l])) delete chosen[l];
    });
    setPartners((prev) => ({ ...prev, [day]: chosen }));
    if (levels.every((l) => chosen[l])) advance();
  };

  const pickPartner = (level, partner) => {
    const next = { ...partners[day], [level]: partner };
    setPartners((prev) => ({ ...prev, [day]: next }));
    const key = entries[day];
    if (key && neededLevels(day, key).every((l) => next[l])) advance();
  };

  const clearPartner = () => {
    if (!entries[day]) return;
    removePartner();
    advance();
  };

  const nextCompare = () => (day < total ? setDay(day + 1) : setStep('result'));

  const pickCompare = (key) => {
    setCompare((prev) => ({ ...prev, [day]: key }));
    nextCompare();
  };

  const skipCompare = () => {
    setCompare(({ [day]: _old, ...rest }) => rest);
    nextCompare();
  };

  useEffect(() => {
    if (!partnersVisible && step !== 'compare') return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'x' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (step === 'compare') skipCompare();
      else clearPartner();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const back = () => {
    if (queue) {
      const prev = [...queue].reverse().find((d) => d < day);
      if (prev) setDay(prev);
      else setStep(team ? 'team' : 'name');
    } else if (day > 1) setDay(day - 1);
    else setStep(team ? 'team' : 'name');
  };

  const backCompare = () => {
    if (day > 1) {
      setDay(day - 1);
    } else {
      setDay(total);
      setStep('days');
    }
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = `jadwal-soc-${year}-${String(month + 1).padStart(2, '0')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const restart = () => {
    setNotice('');
    setDay(1);
    setQueue(null);
    setStep('month');
  };

  const settings = (
    <>
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={withPartners}
              onChange={(e) => setWithPartners(e.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
            <span>Isi nama partner shift</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={compareOn}
              onChange={(e) => setCompareOn(e.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
            <span>Compare person</span>
          </label>
          {compareOn && (
            <select
              aria-label="Orang yang dibandingkan"
              value={comparePerson}
              onChange={(e) => setComparePerson(e.target.value)}
            >
              {Object.entries(groups).map(([level, names]) => (
                <optgroup key={level} label={level}>
                  {names
                    .filter((n) => n.toLowerCase() !== selfFirst)
                    .map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
    </>
  );

  const peers = partnersVisible ? peersFor(day, entries[day]) : {};

  return (
    <main className={`app${step === 'team' ? ' wide' : ''}`}>
      <h1 className="brand">JADWAL SHIFT SOC</h1>
      {notice && <p className="hint">{notice}</p>}

      {step === 'month' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice('');
            setStep(team ? 'team' : 'name');
          }}
        >
          <label className="label" htmlFor="month">Bulan</label>
          <div className="row">
            <select
              id="month"
              value={month}
              onChange={(e) => changeMonth(year, Number(e.target.value))}
              autoFocus
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              aria-label="Tahun"
              value={year}
              onChange={(e) => changeMonth(Number(e.target.value), month)}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {hasData && (
            <div className="saved">
              <span>
                Jadwal {MONTH_NAMES[month]} {year} tersimpan di perangkat ini
                {team ? ` (${Object.keys(team).length} orang)` : ''}.
              </span>
              <div className="row">
                {team && <button type="button" onClick={() => setStep('team')}>Jadwal tim</button>}
                {Object.keys(entries).length > 0 && (
                  <button type="button" onClick={() => setStep('result')}>Lihat hasil</button>
                )}
                <button type="button" onClick={deleteSaved}>Hapus</button>
              </div>
            </div>
          )}
          {features.import && (
            <details className="import" open>
              <summary>Import jadwal tim dari gambar (via Gemini / Claude)</summary>
              <p className="hint">
                1. Salin prompt ini, tempel ke Gemini atau Claude bersama gambar jadwal dari PM.
              </p>
              <textarea readOnly rows={6} value={promptText} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={copyPrompt}>Salin prompt</button>
              <p className="hint">
                Kalau hasilnya masih meleset: potong gambar jadi 3 bagian (tgl 1-10, 11-20, 21-30),
                kirim satu per satu dengan prompt yang sama, lalu tempel semua jawabannya berurutan di bawah.
              </p>
              <p className="hint">2. Tempel jawabannya di sini.</p>
              <textarea
                rows={6}
                value={importText}
                placeholder={'BULAN: 2026-12\nT1,TUE,Feby=2,Arif=1,...\nT2,WED,Feby=OFF,Arif=2,...'}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button type="button" className="primary" onClick={applyImport}>
                Terapkan
              </button>
              {importMsg && <p className="hint">{importMsg}</p>}
            </details>
          )}
          <button className={team || !features.import ? 'primary' : 'ghost'} type="submit">
            {team || !features.import ? 'Lanjut' : 'Isi manual tanpa import'}
          </button>
        </form>
      )}

      {step === 'team' && team && (
        <section className="team">
          <TeamTable
            team={team}
            year={year}
            month={month}
            selfKey={selfKey}
            compareKey={compareOn ? comparePerson : null}
            issues={issues}
          />
          {issues.length > 0 && (
            <div className="issues">
              <p className="hint">
                Tanggal bertanda ● tidak sesuai aturan (tiap shift 2 L1 + 1 L2). Cocokkan dengan gambar:
              </p>
              <ul>
                {issues.slice(0, 12).map((i) => (
                  <li key={i.day}>
                    <b>{i.day}</b> {i.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form
            className="card settings"
            onSubmit={(e) => {
              e.preventDefault();
              routeFromTeam(team, name, total);
            }}
          >
            <label className="label" htmlFor="name">Nama</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            {settings}
            <div className="row">
              <button className="ghost" type="button" onClick={() => setStep('month')}>
                Kembali
              </button>
              <button className="primary" type="submit">Buat wallpaper</button>
            </div>
          </form>
        </section>
      )}

      {step === 'name' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            startFromName();
          }}
        >
          <label className="label" htmlFor="name">Nama</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          {settings}
          <div className="row">
            <button className="ghost" type="button" onClick={() => setStep('month')}>
              Kembali
            </button>
            <button className="primary" type="submit">Lanjut</button>
          </div>
        </form>
      )}

      {step === 'days' && (
        <section className="card">
          <p className="sub">{MONTH_NAMES[month]} {year} · {total} hari</p>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${((day - 1) / total) * 100}%` }} />
          </div>
          <div className="dayhead">
            <span className="daynum">{day}</span>
            <span className="daytotal">/ {total}</span>
            <span className={`dayname${weekdayIndex(year, month, day) >= 5 ? ' weekend' : ''}`}>
              {DAY_NAMES[weekdayIndex(year, month, day)]}
            </span>
          </div>

          {!queue && (
            <div className="options">
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`opt${entries[day] === o.key ? ' selected' : ''}`}
                  style={{ '--fg': o.fg, '--bg': o.bg, '--bd': o.border }}
                  onClick={() => pickShift(o.key)}
                >
                  {o.option}
                </button>
              ))}
            </div>
          )}

          {partnersVisible && (
            <>
              <p className="sub">Partner shift: pilih L1 dan L2</p>
              {Object.entries(peers)
                .filter(([, list]) => list.length)
                .map(([level, list]) => (
                  <div key={level}>
                    <p className="group">{level}</p>
                    <div className="options">
                      {list.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`opt name${partners[day]?.[level] === n ? ' selected' : ''}`}
                          onClick={() => pickPartner(level, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              <button type="button" disabled={!entries[day]} onClick={clearPartner}>
                Tanpa partner <kbd className="key">X</kbd>
              </button>
            </>
          )}

          <div className="row">
            <button className="ghost" type="button" onClick={back}>
              Kembali
            </button>
            {!queue && (
              <button className="ghost" type="button" disabled={!entries[day]} onClick={advance}>
                Lewati
              </button>
            )}
          </div>
        </section>
      )}

      {step === 'compare' && (
        <section className="card">
          <p className="sub">{MONTH_NAMES[month]} {year} · Shift {comparePerson}</p>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${((day - 1) / total) * 100}%` }} />
          </div>
          <div className="dayhead">
            <span className="daynum">{day}</span>
            <span className="daytotal">/ {total}</span>
            <span className={`dayname${weekdayIndex(year, month, day) >= 5 ? ' weekend' : ''}`}>
              {DAY_NAMES[weekdayIndex(year, month, day)]}
            </span>
          </div>
          <p className="hint">Shift kamu: {optionByKey(entries[day])?.label ?? '-'}</p>
          <div className="options">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`opt${compare[day] === o.key ? ' selected' : ''}`}
                style={{ '--fg': o.fg, '--bg': o.bg, '--bd': o.border }}
                onClick={() => pickCompare(o.key)}
              >
                {o.option}
              </button>
            ))}
          </div>
          <button type="button" onClick={skipCompare}>
            Kosongkan <kbd className="key">X</kbd>
          </button>
          <div className="row">
            <button className="ghost" type="button" onClick={backCompare}>
              Kembali
            </button>
          </div>
        </section>
      )}

      {step === 'result' && (
        <section className="result">
          <canvas ref={canvasRef} className="preview" />
          <div className="row">
            <button className="primary" type="button" onClick={download}>
              Download PNG
            </button>
          </div>
          <div className="row">
            {team && (
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setNotice('');
                  setStep('team');
                }}
              >
                Jadwal tim
              </button>
            )}
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setNotice('');
                setQueue(null);
                setDay(total);
                setStep('days');
              }}
            >
              Edit
            </button>
            <button className="ghost" type="button" onClick={restart}>
              Ganti bulan
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
