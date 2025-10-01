import { render, screen } from '@testing-library/react';
import App from './App';

test('renders board settings heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Board Settings/i);
  expect(headingElement).toBeInTheDocument();
});
