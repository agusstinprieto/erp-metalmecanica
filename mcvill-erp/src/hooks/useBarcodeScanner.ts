import { useEffect, useRef, useCallback } from 'react';

// Los scanners HID escriben caracteres muy rápido (< 50 ms entre teclas)
// Un humano escribe más lento. Así diferenciamos teclado de scanner.
const CHAR_SPEED_MS = 50;
const MIN_CODE_LENGTH = 3;

export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled = true
) {
  const buffer = useRef('');
  const lastKeyAt = useRef(0);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignorar atajos de teclado del sistema
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();

      // Si pasó demasiado tiempo desde la última tecla, reinicia buffer
      if (now - lastKeyAt.current > 200) {
        buffer.current = '';
      }
      lastKeyAt.current = now;

      if (e.key === 'Enter') {
        const code = buffer.current.trim();
        if (code.length >= MIN_CODE_LENGTH) {
          onScan(code);
        }
        buffer.current = '';
        e.preventDefault();
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    },
    [onScan, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);
}
