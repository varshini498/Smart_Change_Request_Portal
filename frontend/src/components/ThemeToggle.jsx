import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="theme-toggle-text">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
