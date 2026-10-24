import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { daysInMonth } from './schedule';

test('walks from month to name to day picker', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  expect(screen.getByLabelText('Nama')).toHaveValue('Affan Ats');
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('1');
  for (const label of ['1', '2', '2+', '3', '3+', 'OFF', 'Cuti']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  }
});

test('counts days in a month', () => {
  expect(daysInMonth(2026, 7)).toBe(31);
  expect(daysInMonth(2026, 1)).toBe(28);
});
