import { memo } from 'react';
import styles from './Button.module.css';

/**
 * Кнопка клавиатуры.
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {'high' | 'medium' | 'low'} [props.variant]  акцент из макета
 * @param {() => void} props.onClick
 * @param {string} [props.ariaLabel]
 * @param {'normal' | 'compact'} [props.size]
 * @param {boolean} [props.wide]  занимает две колонки
 * @param {boolean} [props.pressed]  для кнопок-переключателей (aria-pressed)
 */
export const Button = memo(function Button({
  label,
  variant = 'low',
  onClick,
  ariaLabel,
  size = 'normal',
  wide = false,
  pressed,
}) {
  const className = [styles.button, styles[variant], styles[size], wide && styles.wide]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
    >
      {label}
    </button>
  );
});
