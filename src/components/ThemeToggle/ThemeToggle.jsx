import { THEME, useTheme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

function SunIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.5 14.2A7.8 7.8 0 0 1 9.8 4.5a7.8 7.8 0 1 0 9.7 9.7Z" />
    </svg>
  );
}

/** Переключатель темы из макета: «пилюля» 72×32 с кружком и иконкой. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === THEME.DARK;

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isDark ? styles.dark : styles.light}`}
      onClick={toggleTheme}
      aria-label="Переключить тему"
      aria-pressed={isDark}
      title={isDark ? 'Тёмная тема' : 'Светлая тема'}
    >
      <SunIcon className={`${styles.icon} ${styles.sun}`} />
      <MoonIcon className={`${styles.icon} ${styles.moon}`} />
      <span className={styles.knob} />
    </button>
  );
}
