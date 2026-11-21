import React from 'react';

/**
 * Faint repeating "TeamSamir" watermark laid over a photo (styles: `.ts-watermark` in index.css).
 * Place it inside the photo's container, which must be `relative` (or absolute) and clip its
 * overflow. It is drawn by the page, so it appears in screenshots and screen recordings; it
 * ignores clicks and is hidden from screen readers. Videos have the mark burned into the file.
 */
export const Watermark: React.FC = () => <span aria-hidden="true" className="ts-watermark" />;
