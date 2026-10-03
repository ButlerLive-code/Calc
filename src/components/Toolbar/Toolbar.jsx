import { memo } from 'react';
import { ModeSwitch } from '../ModeSwitch/ModeSwitch';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './Toolbar.module.css';

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3" />
      <path d="M3 3v5.3h5.3M12 7.5V12l3 2" />
    </svg>
  );
}

export const Toolbar = memo(function Toolbar({ mode, onOpenHistory }) {
  return (
    <header className={styles.toolbar}>
      <button type="button" className={styles.history} onClick={onOpenHistory} aria-haspopup="dialog" aria-label="История" title="История">
        <ClockIcon />
      </button>
      <div className={styles.center}>
        <ThemeToggle />
      </div>
      <div className={styles.end}>
        <ModeSwitch mode={mode} />
      </div>
    </header>
  );
});
