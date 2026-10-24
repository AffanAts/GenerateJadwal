import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { daysInMonth, nextMonth } from './schedule';

test('walks from month to name to day picker', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  expect(screen.getByLabelText('Nama')).toHaveValue('Affan Ats');
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('1');
  for (const label of ['1', '2', '2+', '3', '3+', 'REG', 'OFF', 'Cuti']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  }
});

test('counts days in a month', () => {
  expect(daysInMonth(2026, 7)).toBe(31);
  expect(daysInMonth(2026, 1)).toBe(28);
});

test('asks for partner after shift when the toggle is on', () => {
  render(<App />);
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: '1' }));
  expect(screen.getByRole('button', { name: 'Feby' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bram' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Affan' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Feby' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('1');
  userEvent.click(screen.getByRole('button', { name: 'Bram' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('2');
});

test('skips partner for OFF', () => {
  render(<App />);
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: 'OFF' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('2');
});

test('X key skips the partner step', () => {
  render(<App />);
  userEvent.click(screen.getByRole('switch', { name: 'Isi nama partner shift' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: '1' }));
  userEvent.keyboard('x');
  expect(document.querySelector('.daynum')).toHaveTextContent('2');
});

test('compare person is asked after all own days are filled', () => {
  render(<App />);
  userEvent.click(screen.getByRole('switch', { name: 'Compare person' }));
  expect(screen.getByLabelText('Orang yang dibandingkan')).toHaveValue('Arif');
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  const total = daysInMonth(nextMonth().year, nextMonth().month);
  for (let i = 1; i <= total; i++) {
    expect(screen.queryByText(/Shift Arif/)).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: i % 2 ? '1' : 'OFF' }));
  }
  expect(screen.getByText(/Shift Arif/)).toBeInTheDocument();
  expect(document.querySelector('.daynum')).toHaveTextContent('1');
  expect(screen.getByText('Shift kamu: S1')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(document.querySelector('.daynum')).toHaveTextContent('2');
  userEvent.keyboard('x');
  expect(document.querySelector('.daynum')).toHaveTextContent('3');
});
