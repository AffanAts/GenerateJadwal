import { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  DAY_NAMES,
  DEFAULT_NAME,
  MONTH_NAMES,
  OPTIONS,
  daysInMonth,
  drawSchedule,
  nextMonth,
  weekdayIndex,
} from './schedule';

function App() {
  const initial = nextMonth();
  const [step, setStep] = useState('month');
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [name, setName] = useState(DEFAULT_NAME);
  const [day, setDay] = useState(1);
  const [entries, setEntries] = useState({});
  const canvasRef = useRef(null);

  const total = daysInMonth(year, month);
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  useEffect(() => {
    if (step === 'result' && canvasRef.current) {
      drawSchedule(canvasRef.current, {
        name: name.trim() || DEFAULT_NAME,
        year,
        month,
        entries,
      });
    }
  }, [step, name, year, month, entries]);

  const changeMonth = (nextYear, nextMonthIndex) => {
    setYear(nextYear);
    setMonth(nextMonthIndex);
    setEntries({});
  };

  const pick = (key) => {
    setEntries((prev) => ({ ...prev, [day]: key }));
    if (day < total) setDay(day + 1);
    else setStep('result');
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
    setDay(1);
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
          <button className="primary" type="submit">Lanjut</button>
        </form>
      )}

      {step === 'name' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            setDay(1);
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
          <div className="options">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`opt${entries[day] === o.key ? ' selected' : ''}`}
                style={{ '--fg': o.fg, '--bg': o.bg, '--bd': o.border }}
                onClick={() => pick(o.key)}
              >
                {o.option}
              </button>
            ))}
          </div>
          <div className="row">
            <button
              className="ghost"
              type="button"
              onClick={() => (day > 1 ? setDay(day - 1) : setStep('name'))}
            >
              Kembali
            </button>
            <button
              className="ghost"
              type="button"
              disabled={!entries[day]}
              onClick={() => (day < total ? setDay(day + 1) : setStep('result'))}
            >
              Lewati
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
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setDay(total);
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
