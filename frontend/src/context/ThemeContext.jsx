import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme';
const LEGACY_STORAGE_KEY = 'smartcr_theme';
const FONT_KEY = 'smartcr_font_size';

const getInitialTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  if (legacySaved === 'light' || legacySaved === 'dark') return legacySaved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialFontSize = () => {
  const saved = localStorage.getItem(FONT_KEY);
  if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
  return 'medium';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [fontSize, setFontSize] = useState(getInitialFontSize);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem(LEGACY_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem(FONT_KEY, fontSize);
  }, [fontSize]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === 'dark', fontSize, setFontSize }),
    [theme, fontSize]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
