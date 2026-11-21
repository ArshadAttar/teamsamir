# Media & content protection – implementation report

Date: 22 Nov 2026 · Site: https://teamsamir.vercel.app · All pages (Home, Services, Senior Fitness, Transformations, About Samir, Contact, 404)

**Honest summary:** a website can make copying and saving *harder*, but it can't *prevent* it. Anything a browser shows can still be captured with screenshots, screen recording, a phone camera, browser developer tools, or by reading the network traffic. No browser or OS lets a normal website block screenshots. What's below stops casual copying and saving, and stops other websites using your media.

## Stack (relevant parts)

- **Pages:** static pre-rendered React pages on Vercel.
- **Media:** photos are WebP files and videos are MP4 files, both served from `/media/`.
- **Video players:** three of them, all using the site's own play and sound buttons; no native browser controls are shown anywhere:
  - `LazyVideo`, used for the review videos, Transformation Stories and About;
  - the Senior Fitness featured player;
  - the Senior Fitness full-screen viewer.
- **Downloads and sharing:** the site has no share or download buttons.

## What was implemented

| # | Protection | Where | Status |
|---|---|---|---|
| 1 | Right-click / long-press menu blocked (no "Save image as", "Save video as", "Copy image", "Open image in new tab") | Whole site, except inside form fields | ✅ Tested |
| 2 | Dragging images, videos and links out of the page blocked | Whole site | ✅ Tested |
| 3 | iPhone/iPad long-press "Save to Photos / Copy / Share" image menu disabled (`-webkit-touch-callout: none`) | Whole site | ✅ Implemented (needs a real iPhone to see) |
| 4 | Text selection disabled (`user-select: none`), including long-press selection on phones | Whole site, except form fields | ✅ Tested |
| 5 | Copy / cut blocked | Whole site, except form fields | ✅ Tested |
| 6 | Shortcuts blocked: Ctrl/Cmd + **S** (save page), **U** (view source), **P** (print); + **C**, **X**, **A** outside form fields | Whole site | ✅ Tested |
| 7 | Print / "Save as PDF" prints only a notice ("Printing this website is not permitted") | Whole site | ✅ Tested |
| 8 | Videos: browser download, picture-in-picture, cast and speed options hidden (`controlsList="nodownload noplaybackrate noremoteplayback"`, `disablePictureInPicture`, `disableRemotePlayback`); right-click on video blocked | All 3 video players | ✅ Tested |
| 9 | Other websites can't embed your photos and videos in their pages (hotlinking): `Cross-Origin-Resource-Policy: same-origin` on `/media/` | Server header (`vercel.json`) | ✅ Tested locally; live after deploy |
| 10 | Share-preview images (`/media/shared/og/`) left open, so WhatsApp, Facebook and LinkedIn link previews keep working | Server header | ✅ Tested |
| 11 | Windows **PrtSc** key: the screenshot copied to the clipboard is replaced with a notice | Desktop browsers on Windows | ✅ Implemented (limited, see below) |
| 12 | **Photo watermark:** a faint repeating diagonal "TeamSamir" over every content photo (service cards, Services, Senior Fitness photos and video thumbnails, Transformations before & after cards and lightbox, older modals). It is drawn by the page, so it is in every screenshot and screen recording, on phones too. Logos and the small round review avatars are left clean. | All pages (`src/components/Watermark.tsx`, `.ts-watermark` in `index.css`) | ✅ Added 22 Nov 2026 |
| 13 | **Video watermark burned into the files:** small TeamSamir logo + name in the bottom-left corner and a faint "TeamSamir" in the centre (so cropping the corner doesn't remove it). It stays in downloads, screen recordings and screenshots. All 36 site clips re-encoded as `*-wm.mp4` (new names, so no stale cached copies). | Home, Transformations, Senior Fitness, About (`scripts/watermark-video.sh`) | ✅ Added 22 Nov 2026 |

**Kept working (tested):**
- **Form fields:** typing, selecting, copy/paste and right-click in the enquiry form, the drop-downs, and submitting the form.
- **Navigation:** page scrolling, the half-circle menu and navigation between pages.
- **Media and pages:** all images and videos load, and the 404 page works.
- **Errors:** 0 security-policy or JavaScript errors on any page, at phone and laptop sizes.

The design and layout are unchanged. Keyboard navigation and screen readers are unaffected.

## Files

| File | Change |
|---|---|
| `src/components/ContentProtection.tsx` (new) | Site-wide handlers: right-click, drag, copy/cut, shortcuts, PrtSc, selection. Mounted once in `App.tsx`. |
| `src/lib/videoProtection.ts` (new) | Shared video settings, spread onto every `<video>`. |
| `src/components/LazyVideo.tsx`, `src/components/senior-fitness/SeniorTransformations.tsx` | Use the shared video settings. |
| `src/index.css` | No selection, no iOS long-press menu, no image/video dragging, print notice. Form fields excluded. |
| `vercel.json` | `Cross-Origin-Resource-Policy: same-origin` for `/media/` (except share-preview images). |
| `src/App.tsx` | Renders `<ContentProtection />`. |

No new packages and no paid services.

## What isn't possible (limitations)

| Wish | Why it can't be fully done |
|---|---|
| **Block screenshots** | No web standard lets a website block or detect screenshots on Windows, macOS, Android or iOS. Snipping Tool, Win+Shift+S, Cmd+Shift+4, the phone's power+volume buttons and screenshot apps all work outside the browser. The PrtSc trick only affects the Windows clipboard copy; Windows 11 also saves PrtSc to a file. |
| **Block screen recording** | Same. Screen recorders (OBS, Xbox Game Bar, phone recorders) can't be detected or stopped by a web page. The only partial exception is **DRM video** (Widevine/FairPlay through a paid DRM service), which blacks out the video, not the page, in some recordings on some platforms. Not implemented: it needs a paid DRM licence and re-encoding every video. |
| **Hide image/video URLs** | The browser must know a file's address to show it. Anyone can find it in developer tools (F12 → Network) and open or save it. Blocking F12 isn't reliable: it can be opened from the browser menu, and blocking it annoys real users. |
| **Stop direct downloading** | A file opened directly by its address can be saved. Item 9 only stops *other websites* embedding your files; it doesn't stop a person opening the address. Making files truly private would need sign-in and expiring links, which isn't suitable for a public marketing site. |
| **Block view-source / saving completely** | Ctrl+U and Ctrl+S are blocked, but the browser menu ("Save page as", "View page source", "Print") and typing `view-source:` in the address bar still work. Some browsers ignore the shortcut block. |
| **Phone camera** | Pointing another phone at the screen can't be prevented by anything. |
| **Search engines** | Google still indexes your pages and images (on purpose, for SEO). Image search results show your photos. |

**Watermarks (items 12 and 13):** screenshots and recordings can't be blocked, so instead every copy carries the TeamSamir name.
- **Photos:** the mark is an overlay on the page. It appears in screenshots and recordings, but a photo file opened directly by its address (developer tools) has no overlay; the before & after composites also have the logo inside the image file.
- **Videos:** the mark is inside the file, so it is in every copy.
- Watermarks deter reuse but don't make it impossible: a determined person could blur or edit them out.
- **New videos:** run `sh scripts/watermark-video.sh in.mp4 out-wm.mp4` and use the `-wm` file. **New photos:** add `<Watermark />` inside the photo's container (it must be `relative` and clip overflow).

**Other options (not done):**
- **Lower-resolution web copies:** the site already serves reduced copies (480–1600 px). Originals stay outside the website (`../media-originals/`), so the full-quality files are never public.

## Accessibility note

Disabling text selection also stops visitors copying the address, phone number or email from the page. They can still tap the phone, WhatsApp and email links, which open the dialer, WhatsApp or the mail app. If you want those contact details copyable again, it's a one-line CSS change: allow selection on the contact block.
