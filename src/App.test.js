import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { daysInMonth, nextMonth } from './schedule';
import { buildPrompt, parseImport } from './importer';
import { planFromTeam, staffingIssues } from './team';
import { features } from './features';

beforeEach(() => localStorage.clear());
const importDefault = features.import;
afterEach(() => {
  features.import = importDefault;
});

const toManual = () =>
  userEvent.click(screen.getByRole('button', { name: /^(Lanjut|Isi manual tanpa import)$/ }));
const next = () => userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
const dayNumber = () => document.querySelector('.daynum');
const days = (n, fn) => Array.from({ length: n }, (_, i) => fn(i + 1)).join(',');

test('walks from month to name to day picker', () => {
  render(<App />);
  toManual();
  expect(screen.getByLabelText('Nama')).toHaveValue('Affan Ats');
  next();
  expect(dayNumber()).toHaveTextContent('1');
  for (const label of ['1', '2', '2+', '3', '3+', 'REG', 'OFF', 'Cuti']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  }
});

test('counts days in a month', () => {
  expect(daysInMonth(2026, 7)).toBe(31);
  expect(daysInMonth(2026, 1)).toBe(28);
});

test('month page has no partner or compare toggles', () => {
  render(<App />);
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});

test('partner choices sit right under the shift choices', () => {
  render(<App />);
  toManual();
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  next();
  expect(screen.getByRole('button', { name: 'Feby' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bram' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Affan' })).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: '1' }));
  expect(dayNumber()).toHaveTextContent('1');
  userEvent.click(screen.getByRole('button', { name: 'Feby' }));
  expect(dayNumber()).toHaveTextContent('1');
  userEvent.click(screen.getByRole('button', { name: 'Bram' }));
  expect(dayNumber()).toHaveTextContent('2');
});

test('partners can be tapped before the shift', () => {
  render(<App />);
  toManual();
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  next();
  userEvent.click(screen.getByRole('button', { name: 'Feby' }));
  userEvent.click(screen.getByRole('button', { name: 'Bram' }));
  expect(dayNumber()).toHaveTextContent('1');
  userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(dayNumber()).toHaveTextContent('2');
});

test('skips partner for OFF', () => {
  render(<App />);
  toManual();
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  next();
  userEvent.click(screen.getByRole('button', { name: 'OFF' }));
  expect(dayNumber()).toHaveTextContent('2');
});

test('X key skips the partner step', () => {
  render(<App />);
  toManual();
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  next();
  userEvent.click(screen.getByRole('button', { name: '1' }));
  userEvent.keyboard('x');
  expect(dayNumber()).toHaveTextContent('2');
});

test('compare person is asked after all own days are filled', () => {
  render(<App />);
  toManual();
  userEvent.click(screen.getByRole('switch', { name: 'Compare person' }));
  expect(screen.getByLabelText('Orang yang dibandingkan')).toHaveValue('Arif');
  next();
  const total = daysInMonth(nextMonth().year, nextMonth().month);
  for (let i = 1; i <= total; i++) {
    expect(screen.queryByText(/Shift Arif/)).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: i % 2 ? '1' : 'OFF' }));
  }
  expect(screen.getByText(/Shift Arif/)).toBeInTheDocument();
  expect(dayNumber()).toHaveTextContent('1');
  expect(screen.getByText('Shift kamu: S1')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(dayNumber()).toHaveTextContent('2');
  userEvent.keyboard('x');
  expect(dayNumber()).toHaveTextContent('3');
});

test('parses a whole-team schedule', () => {
  const text = [
    '```',
    'BULAN: 2026-11',
    `Feby,L1,${days(30, (d) => (d % 2 ? '1' : 'OFF'))}`,
    `bram,L2,${days(30, () => 'S2')}`,
    `Bewit,L1,${days(29, () => 'REF')}`,
    `Baru,${days(30, () => '3+')}`,
    'Catatan: Feby tgl 5, tidak jelas, mohon dicek',
    '```',
  ].join('\n');
  const r = parseImport(text, { year: 2026, month: 0 });
  expect(r.month).toBe(10);
  expect(Object.keys(r.team)).toEqual(['Feby', 'Bewit', 'Bram', 'Baru']);
  expect(r.team.Feby).toMatchObject({ level: 'L1', shifts: { 1: '1', 2: 'OFF' } });
  expect(r.team.Bram.level).toBe('L2');
  expect(r.team.Bram.shifts[30]).toBe('2');
  expect(r.team.Bewit.shifts[1]).toBe('REG');
  expect(r.problems).toEqual([
    'Bewit: 29 kode, seharusnya 30',
    'Baru: role (L1/L2) tidak jelas, dianggap L1',
    'Bewit: tanggal belum terisi 30',
    'Tidak ada di hasil: Arif, Kelvin, Resvi, Ragil, Imam, Ryo, Affan, Adel, Adam, Fuad, Rahmad, Farhan',
  ]);
});

test('merges block lines marked with @start into one person', () => {
  const text = [
    'BULAN: 2026-12',
    'Feby,L1,@1,1,2,3,OFF,1,2,3',
    'Bram,L2,@1,3,3,3,3,3,3,3',
    'Feby,L1,@8,OFF,OFF,2,2,2,2,2',
    'Feby,L1,@29,1,1,1',
    'Feby,L1,@30,1,1,1,1',
  ].join('\n');
  const r = parseImport(text, { year: 2026, month: 0 });
  expect(r.month).toBe(11);
  expect(r.team.Feby.shifts[1]).toBe('1');
  expect(r.team.Feby.shifts[8]).toBe('OFF');
  expect(r.team.Feby.shifts[14]).toBe('2');
  expect(r.team.Feby.shifts[31]).toBe('1');
  expect(r.team.Bram.level).toBe('L2');
  expect(r.problems).toContain('Feby: kode melewati tanggal 31 (mulai @30)');
  expect(r.problems).toContain('Bram: tanggal belum terisi 8, 9, 10, 11, 12, 13, ...');
});

test('prompt asks for everyone and uses the month length', () => {
  const prompt = buildPrompt({ year: 2026, month: 10 });
  expect(prompt).toContain('NOVEMBER 2026');
  expect(prompt).toContain('SEMUA orang');
  expect(prompt).toContain('Eka Aryo Prasetyo = Ryo');
  expect(prompt).toContain('30 kolom tanggal');
});

test('prompt maps sheet rows to L1 and L2 before anything else', () => {
  const prompt = buildPrompt({ year: 2026, month: 11 });
  expect(prompt).toContain('Baris 1 = judul bulan, baris 2 = header tanggal dan hari');
  expect(prompt).toContain('Baris 3-12 = L1 (10 orang)');
  expect(prompt).toContain('Baris 3: Valentina Febrianti = Feby');
  expect(prompt).toContain('Baris 12: Bewitraj Singh = Bewit');
  expect(prompt).toContain('Baris 13-17 = L2 (5 orang)');
  expect(prompt).toContain('Baris 13: Abraham Caesar YP = Bram');
  expect(prompt).toContain('Baris 17: Farhan Aditya = Farhan');
  expect(prompt).toContain('Jangan pernah menulis L2 sebagai L1');
});

test('known people keep the role from the team list even if the AI says otherwise', () => {
  const text = [
    'BULAN: 2026-12',
    'Bram,L1,@1,1,2',
    'T3,THU,Fuad/L1=2,Feby/L2=3,Baru/L2=OFF',
  ].join('\n');
  const r = parseImport(text, { year: 2026, month: 0 });
  expect(r.team.Bram.level).toBe('L2');
  expect(r.team.Fuad.level).toBe('L2');
  expect(r.team.Feby.level).toBe('L1');
  expect(r.team.Baru.level).toBe('L2');
  expect(r.problems).toContain('Bram: role L1 diabaikan, di daftar tim L2');
  expect(r.problems).toContain('Fuad: role L1 diabaikan, di daftar tim L2');
  expect(r.problems).toContain('Feby: role L2 diabaikan, di daftar tim L1');
});

test('rows come back in sheet order, L1 before L2', () => {
  const text = ['BULAN: 2026-12', 'T1,TUE,Farhan=1,Bram=2,Bewit=3,Feby=OFF,Baru/L1=REG'].join('\n');
  const r = parseImport(text, { year: 2026, month: 0 });
  expect(Object.keys(r.team)).toEqual(['Feby', 'Bewit', 'Bram', 'Farhan', 'Baru']);
});

test('prompt asks for a vertical, anchored, small-batch reading', () => {
  const prompt = buildPrompt({ year: 2026, month: 11 });
  expect(prompt).toContain('lurus dari atas ke bawah');
  expect(prompt).toContain('1=TUE, 2=WED');
  expect(prompt).toContain('di bawahnya tertulis nama hari');
  expect(prompt).toContain('5 tanggal sekali');
  expect(prompt).toContain('potongan');
  expect(prompt).toContain('T1,TUE,Feby=');
  expect(prompt).toContain('T2,WED,Feby=');
});

test('parses vertical per-date lines and merges several answers', () => {
  const text = [
    'BULAN: 2026-12',
    'T1,TUE,Feby=2,Arif=1,Bram=3,Baru/L2=OFF',
    'T2,WED,Feby=OFF,Arif=2+,Bram=REF,Baru/L2=-',
    '```',
    'BULAN: 2026-12',
    'T31,THU,Feby=3,Arif=S1,Bram=?',
    'T40,MON,Feby=1',
  ].join('\n');
  const r = parseImport(text, { year: 2026, month: 0 });
  expect(r.month).toBe(11);
  expect(r.team.Feby.shifts).toEqual({ 1: '2', 2: 'OFF', 31: '3' });
  expect(r.team.Arif.shifts).toEqual({ 1: '1', 2: '2+', 31: '1' });
  expect(r.team.Bram.level).toBe('L2');
  expect(r.team.Bram.shifts).toEqual({ 1: '3', 2: 'REG' });
  expect(r.team.Baru).toMatchObject({ level: 'L2', shifts: { 1: 'OFF' } });
  expect(r.problems).toContain('Bram tgl 31: "?" tidak dikenal');
  expect(r.problems).toContain('T40: tanggal di luar bulan');
});

test('plans own schedule and partners from the team data', () => {
  const team = {
    Affan: { level: 'L1', shifts: { 1: '1', 2: '2', 3: 'OFF' } },
    Feby: { level: 'L1', shifts: { 1: '1', 2: '2', 3: '1' } },
    Arif: { level: 'L1', shifts: { 1: '2', 2: '2', 3: '1' } },
    Bram: { level: 'L2', shifts: { 1: '1', 2: '2', 3: '1' } },
  };
  const plan = planFromTeam(team, 'Affan', 3, true);
  expect(plan.entries).toEqual({ 1: '1', 2: '2', 3: 'OFF' });
  expect(plan.partners).toEqual({ 1: { L1: 'Feby', L2: 'Bram' }, 2: { L2: 'Bram' } });
  expect(plan.queue).toEqual([2]);
});

test('flags days where a shift is not exactly 2 L1 + 1 L2', () => {
  const who = (level, shifts) => ({ level, shifts });
  const team = {
    a: who('L1', { 1: '1', 2: '1', 3: 'OFF' }),
    b: who('L1', { 1: '1', 2: '1', 3: 'OFF' }),
    c: who('L1', { 1: '2', 2: '1', 3: 'OFF' }),
    d: who('L1', { 1: '2+', 2: '2', 3: 'OFF' }),
    e: who('L1', { 1: '3', 2: '3', 3: 'OFF' }),
    f: who('L1', { 1: '3+', 2: '3', 3: 'OFF' }),
    x: who('L2', { 1: '1', 2: '1', 3: 'OFF' }),
    y: who('L2', { 1: '2', 2: '2', 3: 'OFF' }),
    z: who('L2', { 1: '3', 2: '3', 3: 'OFF' }),
  };
  const issues = staffingIssues(team, 3);
  expect(issues.map((i) => i.day)).toEqual([2, 3]);
  expect(issues[0].text).toBe('S1: 3 L1 + 1 L2; S2: 1 L1 + 1 L2');
  expect(buildPrompt({ year: 2026, month: 11 })).toContain('tepat 2 orang L1 dan 1 orang L2');
});

test('import panel is hidden by default and can be shown by the feature switch', () => {
  const first = render(<App />);
  expect(screen.queryByText('Terapkan')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Lanjut' })).toBeInTheDocument();
  first.unmount();

  features.import = true;
  render(<App />);
  expect(screen.getByText('Terapkan')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Isi manual tanpa import' })).toBeInTheDocument();
});

test('importing shows the whole team table first, then builds the wallpaper on request', () => {
  features.import = true;
  render(<App />);
  const rows = [
    `Affan,L1,${days(31, (d) => (d % 3 ? '1' : 'OFF'))}`,
    `Arif,L1,${days(31, () => '2')}`,
  ].join('\n');
  fireEvent.change(screen.getByPlaceholderText(/BULAN: 2026-12/), {
    target: { value: `BULAN: 2026-12\n${rows}` },
  });
  userEvent.click(screen.getByText('Terapkan'));

  expect(screen.getByText(/2 orang terbaca/)).toBeInTheDocument();
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByRole('rowheader', { name: /Affan/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download PNG' })).not.toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Isi nama partner shift' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Compare person' })).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Buat wallpaper' }));
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Jadwal tim' }));
  expect(screen.getByRole('table')).toBeInTheDocument();
});

test('filled schedule is saved per month and offered again after reload', () => {
  const first = render(<App />);
  toManual();
  next();
  userEvent.click(screen.getByRole('button', { name: 'OFF' }));
  first.unmount();

  render(<App />);
  expect(screen.getByText(/tersimpan di perangkat ini/)).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Hapus' }));
  expect(screen.queryByText(/tersimpan di perangkat ini/)).not.toBeInTheDocument();
});
