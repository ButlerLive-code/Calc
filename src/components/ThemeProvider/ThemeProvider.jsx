import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { THEME, ThemeContext } from '../../hooks/useTheme';

/** Ключ совпадает со встроенным скриптом в index.html (тема до загрузки React). */
export const THEME_STORAGE_KEY = 'calc:theme';

const isTheme = (value) => value === THEME.DARK || value === THEME.LIGHT;

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? THEME.LIGHT : THEME.DARK;
  } catch {
    return THEME.DARK;
  }
}

const THEME_COLOR = {
  [THEME.DARK]: '#17171c',
  [THEME.LIGHT]: '#f1f2f3',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage(THEME_STORAGE_KEY, systemTheme, isTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === THEME.DARK ? THEME.LIGHT : THEME.DARK));
  }, [setTheme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
