import { DAY_NAMES, daysInMonth, optionByKey, weekdayIndex } from './schedule';

export default function TeamTable({ team, year, month, selfKey, compareKey, issues }) {
  const total = daysInMonth(year, month);
  const days = Array.from({ length: total }, (_, i) => i + 1);
  const rows = Object.entries(team);
  const oddDays = issues.map((i) => i.day);

  return (
    <div className="tablewrap">
      <table className="teamtable">
        <thead>
          <tr>
            <th className="sticky" rowSpan={2}>Nama</th>
            {days.map((d) => (
              <th
                key={d}
                className={`${weekdayIndex(year, month, d) >= 5 ? 'weekend' : ''}${
                  oddDays.includes(d) ? ' odd' : ''
                }`}
                title={issues.find((i) => i.day === d)?.text}
              >
                {d}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => {
              const w = weekdayIndex(year, month, d);
              return (
                <th key={d} className={`day${w >= 5 ? ' weekend' : ''}`}>{DAY_NAMES[w]}</th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, person], i) => {
            const newGroup = i > 0 && rows[i - 1][1].level !== person.level;
            const mark = name === selfKey ? ' self' : name === compareKey ? ' compare' : '';
            return (
              <tr key={name} className={`${newGroup ? 'group' : ''}${mark}`}>
                <th className="sticky" scope="row">
                  {name} <small>{person.level}</small>
                </th>
                {days.map((d) => {
                  const o = optionByKey(person.shifts[d]);
                  return (
                    <td
                      key={d}
                      className="cell"
                      style={o ? { color: o.fg, background: o.bg } : undefined}
                    >
                      {o ? o.label.replace(/^S(?=\d)/, '') : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
