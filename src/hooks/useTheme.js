import { createContext, useContext } from 'react';

export const THEME = Object.freeze({
  DARK: 'dark',
  LIGHT: 'light',
});

// Провайдер — components/ThemeProvider.
export const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
