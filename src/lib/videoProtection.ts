import type React from 'react';

/**
 * Spread onto every <video> on the site. The browser's own download, picture-in-picture,
 * cast and playback-speed options are hidden, and right-click on the video is blocked.
 * (The site uses its own play / sound buttons, never the browser's native controls.)
 */
export const PROTECTED_VIDEO_PROPS: Partial<React.VideoHTMLAttributes<HTMLVideoElement>> = {
  controlsList: 'nodownload noplaybackrate noremoteplayback',
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  onContextMenu: (e) => e.preventDefault(),
};
