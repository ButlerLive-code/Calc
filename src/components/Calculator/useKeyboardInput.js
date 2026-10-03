import { useEffect } from 'react';
import { keyToAction } from '../../utils/keyboard';

/**
 * Локальный хук Calculator: ввод с физической клавиатуры.
 * Не перехватывает клавиши в полях ввода и в открытых диалогах (история).
 */
export function useKeyboardInput(dispatch, mode) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) {
        return;
      }
      const action = keyToAction(event, mode);
      if (!action) return;
      // Enter на сфокусированной кнопке иначе нажал бы ещё и её
      event.preventDefault();
      dispatch(action);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, mode]);
}
