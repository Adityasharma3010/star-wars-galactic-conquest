import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import HoloSelect from '../../src/components/HoloSelect.jsx';
afterEach(cleanup);
function Demo() {
  const [value, setValue] = useState('rebel');
  return (
    <label>
      <span>ALLEGIANCE</span>
      <HoloSelect value={value} onChange={(event) => setValue(event.target.value)}>
        <option value="rebel">Rebel Alliance</option>
        <option value="taken" disabled>
          Unavailable character
        </option>
        <option value="jedi">Jedi Order</option>
      </HoloSelect>
    </label>
  );
}
it('opens a themed list and changes the actual controlled choice', () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole('combobox', { name: 'ALLEGIANCE' }));
  expect(screen.getByRole('listbox')).toBeVisible();
  fireEvent(window, new Event('resize'));
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('option', { name: 'Jedi Order' }));
  expect(screen.getByRole('combobox')).toHaveAttribute('data-value', 'jedi');
  expect(screen.queryByRole('listbox')).toBeNull();
});
it('supports arrows, skips disabled choices, selects with Enter, and cancels with Escape', () => {
  render(<Demo />);
  const button = screen.getByRole('combobox');
  fireEvent.keyDown(button, { key: 'ArrowDown' });
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(button).toHaveAttribute('data-value', 'jedi');
  fireEvent.keyDown(button, { key: 'Home' });
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(button).toHaveAttribute('data-value', 'jedi');
  expect(button).toHaveAttribute('aria-expanded', 'false');
});
it('consumes Escape before the surrounding dialog even when focus moves outside the list', () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole('combobox'));
  const close = vi.fn();
  document.addEventListener('keydown', close);
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(close).not.toHaveBeenCalled();
  document.removeEventListener('keydown', close);
});
