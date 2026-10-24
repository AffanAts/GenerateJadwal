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
  weekdayIndex,
} from './schedule';

const NO_PARTNER_KEYS = ['OFF', 'CUTI'];

function App() {
  const initial = nextMonth();
  const [step, setStep] = useState('month');
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [withPartners, setWithPartners] = useState(false);
  const [name, setName] = useState(DEFAULT_NAME);
  const [day, setDay] = useState(1);
  const [phase, setPhase] = useState('shift');
  const [entries, setEntries] = useState({});
  const [partners, setPartners] = useState({});
  const [compareOn, setCompareOn] = useState(false);
  const [comparePerson, setComparePerson] = useState('Arif');
  const [compare, setCompare] = useState({});
  const canvasRef = useRef(null);

  const total = daysInMonth(year, month);
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  const self = name.trim().split(' ')[0].toLowerCase();

  useEffect(() => {
    if (step === 'result' && canvasRef.current) {
      drawSchedule(canvasRef.current, {
        name: name.trim() || DEFAULT_NAME,
        year,
        month,
        entries,
        partners,
        compare,
        compareName: compareOn ? comparePerson : null,
      });
    }
  }, [step, name, year, month, entries, partners, compare, compareOn, comparePerson]);

  const changeMonth = (nextYear, nextMonthIndex) => {
    setYear(nextYear);
    setMonth(nextMonthIndex);
    setEntries({});
    setPartners({});
    setCompare({});
  };

  const advance = () => {
    if (day < total) {
      setDay(day + 1);
      setPhase('shift');
    } else {
      setStep('result');
    }
  };

  const afterPartner = () => (compareOn ? setPhase('compare') : advance());

  const pickShift = (key) => {
    setEntries((prev) => ({ ...prev, [day]: key }));
    if (withPartners && !NO_PARTNER_KEYS.includes(key)) {
      setPhase('partner');
      return;
    }
    setPartners(({ [day]: _removed, ...rest }) => rest);
    afterPartner();
  };

  const pickPartner = (level, partner) => {
    const next = { ...partners[day], [level]: partner };
    setPartners((prev) => ({ ...prev, [day]: next }));
    if (next.L1 && next.L2) afterPartner();
  };

  const clearPartner = () => {
    setPartners(({ [day]: _old, ...rest }) => rest);
    afterPartner();
  };

  const pickCompare = (key) => {
    setCompare((prev) => ({ ...prev, [day]: key }));
    advance();
  };

  const skipCompare = () => {
    setCompare(({ [day]: _old, ...rest }) => rest);
    advance();
  };

  useEffect(() => {
    if (step !== 'days' || (phase !== 'partner' && phase !== 'compare')) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'x' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (phase === 'partner') clearPartner();
      else skipCompare();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const back = () => {
    if (phase === 'compare') {
      setPhase(withPartners && !NO_PARTNER_KEYS.includes(entries[day]) ? 'partner' : 'shift');
    } else if (phase === 'partner') setPhase('shift');
    else if (day > 1) setDay(day - 1);
    else setStep('name');
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = `jadwal-soc-${year}-${String(month + 1).padStart(2, '0')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const restart = () => {
    const next = nextMonth();
    changeMonth(next.year, next.month);
    setName(DEFAULT_NAME);
    setWithPartners(false);
    setCompareOn(false);
    setComparePerson('Arif');
    setDay(1);
    setPhase('shift');
    setStep('month');
  };

  return (
    <main className="app">
      <h1 className="brand">JADWAL SHIFT SOC</h1>

      {step === 'month' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep('name');
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
              {Object.entries(PARTNERS).map(([level, names]) => (
                <optgroup key={level} label={level}>
                  {names
                    .filter((n) => n.toLowerCase() !== self)
                    .map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
          <button className="primary" type="submit">Lanjut</button>
        </form>
      )}

      {step === 'name' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            setDay(1);
            setPhase('shift');
            setStep('days');
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

          {phase === 'shift' && (
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

          {phase === 'partner' && (
            <>
              <p className="sub">Pilih partner L1 dan L2</p>
              {Object.entries(PARTNERS).map(([level, names]) => (
                <div key={level}>
                  <p className="group">{level}</p>
                  <div className="options">
                    {names
                      .filter((n) => n.toLowerCase() !== self)
                      .map((n) => (
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
              <button type="button" onClick={clearPartner}>
                Tanpa partner <kbd className="key">X</kbd>
              </button>
            </>
          )}

          {phase === 'compare' && (
            <>
              <p className="sub">Shift {comparePerson}</p>
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
            </>
          )}

          <div className="row">
            <button className="ghost" type="button" onClick={back}>
              Kembali
            </button>
            {phase === 'shift' && (
              <button className="ghost" type="button" disabled={!entries[day]} onClick={advance}>
                Lewati
              </button>
            )}
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
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setDay(total);
                setPhase('shift');
                setStep('days');
              }}
            >
              Edit
            </button>
            <button className="ghost" type="button" onClick={restart}>
              Buat baru
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
