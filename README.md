# Murtuza & Zahabiya — Wedding Invitation

## Run locally
1. Open this folder in VS Code.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL printed by Vite.

## Main files
- `index.html` — editable landing-page text, event details, letter popup and RSVP markup.
- `styles.css` — visual theme, responsive layout and animation timing.
- `main.js` — click-to-open transition, car pass, scratch hearts, modals and scroll reveals.
- `assets/landing-background.png` — approved landing-page background; leave unchanged to preserve the current landing page.
- `assets/opening-composition.png` — single composed opening image shown after clicking. Replace it with a same-proportion image if the artwork changes.
- `assets/wedding-car.png` — transparent car overlay that passes over the opening composition.

## Opening sequence
The landing page is kept as-is. Once the “Click to open” action is enabled and clicked, the landing page is hidden and the composed invitation image fades from low opacity to full opacity over 3.5 seconds while the car travels across it. The three gold heart overlays are canvases; scratch them to reveal the numbers already printed underneath in the artwork.

## Scratch position
The scratch-heart overlays use percentages relative to the image frame. If the artwork changes and the hearts move, adjust `.scratch-heart-one`, `.scratch-heart-two`, and `.scratch-heart-three` in `styles.css`.

## RSVP note
The RSVP form currently demonstrates validation and the thank-you state but does not save submissions. Connect a backend or form service before sharing with guests.
