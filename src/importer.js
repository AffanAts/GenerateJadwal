import { MONTH_NAMES, OPTIONS, PARTNERS, daysInMonth, weekdayIndex } from './schedule';

const FULL_NAMES = {
  L1: [
    ['Valentina Febrianti', 'Feby'],
    ['Mochamad Arif Rizki', 'Arif'],
    ['Kelvin Pratama Effendi', 'Kelvin'],
    ['Resvianto Virgiansyah', 'Resvi'],
    ['Ragil Ardiansyah', 'Ragil'],
    ['Imam Algiza', 'Imam'],
    ['Eka Aryo Prasetyo', 'Ryo'],
    ['Affan Haidar Atstsabit', 'Affan'],
    ['Adel Rahmad Ilham', 'Adel'],
    ['Bewitraj Singh', 'Bewit'],
  ],
  L2: [
    ['Abraham Caesar YP', 'Bram'],
    ['Adam Rizqi', 'Adam'],
    ['Al Khadri Fuad', 'Fuad'],
    ['Rahmad Hidayat', 'Rahmad'],
    ['Farhan Aditya', 'Farhan'],
  ],
};

const ROSTER = Object.values(PARTNERS).flat();
// Sheet layout: row 1 = month, row 2 = dates, rows 3-12 = L1, rows 13-17 = L2
const FIRST_PERSON_ROW = 3;
const ROW_ORDER = Object.values(FULL_NAMES).flat().map(([, short]) => short);
const EMPTY = ['', '-', '–', '—', 'NONE', 'NULL'];

const normShift = (raw) => {
  let v = raw.trim().toUpperCase().replace(/\s+/g, '');
  v = v.replace(/^(SHIFT|S)(?=[123])/, '');
  if (v === 'LIBUR') v = 'OFF';
  if (v === 'REF') v = 'REG';
  return OPTIONS.some((o) => o.key === v) ? v : null;
};

const canonName = (raw) =>
  ROSTER.find((n) => n.toLowerCase() === raw.trim().toLowerCase()) ?? raw.trim();

const levelOf = (name) => Object.keys(PARTNERS).find((l) => PARTNERS[l].includes(name)) ?? null;

const EN_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_WORDS = /^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i;

export function buildPrompt({ year, month }) {
  const total = daysInMonth(year, month);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dayName = (d) => EN_DAYS[weekdayIndex(year, month, d)];
  let row = FIRST_PERSON_ROW;
  const rowMap = Object.entries(FULL_NAMES)
    .map(([level, list]) => {
      const first = row;
      const lines = list.map(([full, short]) => `  Baris ${row++}: ${full} = ${short}`);
      return `Baris ${first}-${row - 1} = ${level} (${list.length} orang):\n${lines.join('\n')}`;
    })
    .join('\n');
  const dayMap = Array.from({ length: total }, (_, i) => `${i + 1}=${dayName(i + 1)}`).join(', ');
  const order = Object.values(FULL_NAMES).flat().map(([, short]) => short);
  const cycle = ['1', '2', '3', 'OFF'];
  const example = (d) =>
    `T${d},${dayName(d)},${order.map((n, i) => `${n}=${cycle[(i + d) % cycle.length]}`).join(',')}`;

  return `Saya kirim gambar jadwal shift tim SOC bulan ${MONTH_NAMES[month]} ${year}. Gambar ini bisa berupa seluruh tabel (${total} kolom tanggal) atau hanya potongan beberapa tanggal. Kerjakan HANYA tanggal yang terlihat di gambar. Keluarkan jadwal SEMUA orang di tabel, bukan hanya satu atau dua orang.

CARA MEMBACA (penting): baca per kolom tanggal, lurus dari atas ke bawah. Jangan membaca per baris dari kiri ke kanan, karena di tabel yang lebar pembacaan mudah melenceng ke baris lain.

Kode shift yang boleh dipakai: 1, 2, 2+, 3, 3+, REG, OFF, CUTI
(Kalau di gambar tertulis REF, anggap REG.)
Warna sel membantu memeriksa angkanya: merah muda = 1, hijau = 2, kuning = 3, abu-abu gelap = OFF, putih = REG, merah = CUTI. Kalau angka dan warna tidak cocok, sebutkan sel itu.

PETA BARIS (role ditentukan dari sini, jangan ditebak). Baris 1 = judul bulan, baris 2 = header tanggal dan hari (gambar tidak menampilkan nomor baris, jadi hitung sendiri dari atas).
${rowMap}
Hanya 5 orang di baris paling bawah yang L2; semua nama lain L1. Jangan pernah menulis L2 sebagai L1 atau sebaliknya. Kalau kolom Role di gambar tampak berbeda, ikuti peta ini dan sebutkan di catatan.
Kalau ada orang baru yang tidak ada di peta, pakai nama panggilan paling umum dan tulis role-nya setelah garis miring, misalnya Nama/L2=3.

Hari untuk tiap tanggal: ${dayMap}

Kerjakan urut seperti ini:

LANGKAH 1 - Peta baris. Tulis ulang petanya sesuai gambar: nomor baris, nama pendek, role (sesuai peta di atas). Pastikan ada 15 baris orang: 10 L1 diikuti 5 L2, dan urutan nama di gambar sama dengan peta.

LANGKAH 2 - Cari kolom. Untuk setiap tanggal: cari kolom dengan angka tanggal itu yang di bawahnya tertulis nama hari yang sesuai (lihat daftar hari di atas). Pakai lebar kotak kolom itu sebagai batas kiri dan kanan.

LANGKAH 3 - Baca per tanggal. Kerjakan 5 tanggal sekali (misalnya 1-5, lalu 6-10), jangan lebih. Untuk satu tanggal: baca kolomnya dari atas sampai bawah, satu orang demi satu orang sesuai urutan baris, lalu tulis satu baris: T<tanggal>,<hari>,Nama=kode,Nama=kode,... Selalu tulis nama sebelum kodenya supaya baris tidak tertukar. Jangan lanjut ke 5 tanggal berikutnya sebelum yang ini diperiksa di langkah 4.

LANGKAH 4 - Periksa. Aturan jadwal yang pasti: setiap hari, setiap shift (1, 2, 3) berisi tepat 2 orang L1 dan 1 orang L2 (2+ dihitung shift 2, 3+ dihitung shift 3). Tidak mungkin kurang atau lebih; kalau ada orang berlebih, orang itu REG. Hitung untuk setiap tanggal. Kalau ada shift yang bukan 2 L1 + 1 L2, lihat lagi kolom itu di gambar (kemungkinan ada sel yang salah baca atau baris tertukar) dan perbaiki. Jangan mengubah data hanya demi memenuhi aturan: kalau setelah dicek ulang gambar memang menunjukkan lain, tulis sesuai gambar dan sebutkan tanggalnya di catatan.
Kalau sel tidak terbaca jelas, isi - dan sebutkan nama serta tanggalnya di catatan. Jangan menebak.
Setelah semua tanggal selesai, cocokkan hasil dengan kotak "Note" di gambar (daftar OFF/cuti per orang) kalau ada, dan sebutkan kalau ada yang tidak cocok.

Jawaban akhir: satu blok kode berisi semua baris T. Catatan dan hasil pemeriksaan tulis di luar blok kode.

Contoh format (isi kodenya hanya ilustrasi):
BULAN: ${ym}
${example(1)}
${example(2)}`;
}

export function parseImport(text, { year, month }) {
  let y = year;
  let m = month;
  const header = text.match(/BULAN\s*[:=]\s*(\d{4})-(\d{1,2})/i);
  if (header && Number(header[2]) >= 1 && Number(header[2]) <= 12) {
    y = Number(header[1]);
    m = Number(header[2]) - 1;
  }
  const total = daysInMonth(y, m);
  const team = {};
  const problems = [];

  // the known team list decides the role; an AI that calls an L2 person "L1" is overruled
  const resolveLevel = (name, explicit) => {
    const known = levelOf(name);
    if (known && explicit && explicit !== known && !team[name]) {
      problems.push(`${name}: role ${explicit} diabaikan, di daftar tim ${known}`);
    }
    return known ?? explicit ?? team[name]?.level ?? null;
  };

  // "T12,THU,Feby=2,Arif=1,..." holds one date for several people
  const readDayLine = (day, fields) => {
    if (day < 1 || day > total) {
      problems.push(`T${day}: tanggal di luar bulan`);
      return;
    }
    fields.forEach((field) => {
      const m = field.match(/^(.+?)\s*[=:]\s*(.+)$/);
      if (!m || DAY_WORDS.test(field)) return;
      let raw = m[1];
      let level = null;
      const withRole = raw.match(/^(.+?)\s*\/\s*(L[12])$/i);
      if (withRole) {
        raw = withRole[1];
        level = withRole[2].toUpperCase();
      }
      const name = canonName(raw);
      level = resolveLevel(name, level);
      if (!level) {
        if (!team[name]) problems.push(`${name}: role (L1/L2) tidak jelas, dianggap L1`);
        level = 'L1';
      }
      const person = (team[name] ??= { level, shifts: {} });
      const code = m[2].trim();
      const key = normShift(code);
      if (key) person.shifts[day] = key;
      else if (!EMPTY.includes(code.toUpperCase())) {
        problems.push(`${name} tgl ${day}: "${code}" tidak dikenal`);
      }
    });
  };

  text.split(/\r?\n/).forEach((line) => {
    const f = line.split(/[,;|\t]/).map((x) => x.trim());
    const dayLine = f[0].match(/^T(\d{1,2})$/i);
    if (dayLine) {
      readDayLine(Number(dayLine[1]), f.slice(1));
      return;
    }
    if (f.length < 3 || /^`|^BULAN/i.test(f[0]) || !/[A-Za-z]/.test(f[0])) return;

    let rest = f.slice(1);
    let level = null;
    if (/^L[12]$/i.test(rest[0])) {
      level = rest[0].toUpperCase();
      rest = rest.slice(1);
    }
    // "@8" marks a block of days starting at that date; without it the row starts at day 1
    let start = 1;
    const marker = (rest[0] ?? '').match(/^@(\d{1,2})$/);
    if (marker) {
      start = Number(marker[1]);
      rest = rest.slice(1);
    }
    const looksLikeCodes = rest.filter((r) => normShift(r) || EMPTY.includes(r.toUpperCase()));
    if (!rest.length || looksLikeCodes.length < rest.length / 2) return;

    const name = canonName(f[0]);
    level = resolveLevel(name, level);
    if (!level) {
      problems.push(`${name}: role (L1/L2) tidak jelas, dianggap L1`);
      level = 'L1';
    }
    if (!marker && rest.length !== total) {
      problems.push(`${name}: ${rest.length} kode, seharusnya ${total}`);
    } else if (start + rest.length - 1 > total) {
      problems.push(`${name}: kode melewati tanggal ${total} (mulai @${start})`);
    }

    const person = (team[name] ??= { level, shifts: {} });
    rest.forEach((raw, i) => {
      const day = start + i;
      if (day > total) return;
      const key = normShift(raw);
      if (key) person.shifts[day] = key;
      else if (!EMPTY.includes(raw.toUpperCase())) {
        problems.push(`${name} tgl ${day}: "${raw}" tidak dikenal`);
      }
    });
  });

  Object.entries(team).forEach(([name, person]) => {
    const missing = [];
    for (let d = 1; d <= total; d++) if (!person.shifts[d]) missing.push(d);
    if (missing.length) {
      const shown = missing.slice(0, 6).join(', ');
      problems.push(`${name}: tanggal belum terisi ${shown}${missing.length > 6 ? ', ...' : ''}`);
    }
  });

  const absent = ROW_ORDER.filter((n) => !team[n]);
  if (Object.keys(team).length && absent.length) {
    problems.push(`Tidak ada di hasil: ${absent.join(', ')}`);
  }
  // keep the sheet order (L1 rows first, then L2), anyone new at the end
  const ordered = {};
  ROW_ORDER.forEach((n) => {
    if (team[n]) ordered[n] = team[n];
  });
  Object.keys(team).forEach((n) => {
    if (!ordered[n]) ordered[n] = team[n];
  });

  return { year: y, month: m, total, team: ordered, problems };
}
