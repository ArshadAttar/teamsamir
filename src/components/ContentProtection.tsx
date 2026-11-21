import { useEffect } from 'react';

/**
 * Site-wide content protection (rendered once in App.tsx; renders nothing).
 *
 * Makes casual copying and saving harder. It can't stop a determined person: anything a
 * browser shows can be captured (screenshots, screen recording, developer tools, the
 * network tab). See docs/CONTENT-PROTECTION.md for what is and isn't possible.
 *
 * Form fields (input, textarea, select, contenteditable) are always left alone, so typing,
 * selecting, copying and pasting in the enquiry form keep working.
 *
 * Blocked outside form fields:
 * - right-click / long-press menu (stops "Save image as", "Save video as", "Copy image")
 * - dragging images, videos and links out of the page
 * - copy and cut
 * - Ctrl/Cmd + C, X, S (save page), U (view source), P (print), A (select all)
 * Also: printing shows a notice instead of the page (see index.css), and the PrintScreen
 * key on Windows overwrites the clipboard copy of the screenshot.
 */

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof Element && !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

/** True when the current text selection is inside a form field */
const selectionInEditable = (): boolean => {
  const active = document.activeElement;
  return isEditable(active);
};

export function ContentProtection(): null {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    const onCopyCut = (e: ClipboardEvent) => {
      if (selectionInEditable()) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', '');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      // Save page, view source and print are blocked everywhere (even inside the form)
      if (key === 's' || key === 'u' || key === 'p') {
        e.preventDefault();
        return;
      }
      // Copy / cut / select-all still work inside form fields
      if ((key === 'c' || key === 'x' || key === 'a') && !isEditable(e.target)) e.preventDefault();
    };

    // Windows "PrtSc" copies the screen to the clipboard: replace that copy with a notice.
    // (Can't stop the Snipping Tool, Win+Shift+S saving to a file, phones or other apps.)
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText('Screenshots of this website are not permitted.').catch(() => undefined);
      }
    };

    // Long-press "selection" on touch screens outside form fields
    const onSelectStart = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('copy', onCopyCut);
    document.addEventListener('cut', onCopyCut);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('selectstart', onSelectStart);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('copy', onCopyCut);
      document.removeEventListener('cut', onCopyCut);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('selectstart', onSelectStart);
    };
  }, []);

  return null;
}
