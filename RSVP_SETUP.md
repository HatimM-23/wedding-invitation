# Wedding RSVP integration — updated draft

The website remains static on GitHub Pages. Google Apps Script validates and writes RSVP submissions to your private Google Sheet.

## Behaviour

- YES opens the existing RSVP form.
- One 10-digit WhatsApp number represents one household.
- A first submission creates a row; a later submission using the same number updates that row.
- Existing duplicate rows for that number are consolidated the next time that number submits.
- The original `Submitted At` timestamp is preserved; `Last Updated` changes.
- No Submission ID is stored.
- Phone numbers are stored as 10 digits, without `+91`.
- NO continues to show the existing Try Again image and is not recorded.
- After a confirmed successful write, the form closes and a full-screen thank-you message appears.
- The thank-you screen has no close button. Browser Back returns to the invitation landing page.
- A failed or timed-out submission leaves the form available for retry.
- The response is correlated with a per-request nonce. The Apps Script HTML response posts to the top-level page because HtmlService may wrap the response in an additional Google iframe.

## Files changed

- `main.js` — submission handling, response correlation and thank-you/back behaviour.
- `index.html` — full-screen thank-you screen.
- `styles.css` — thank-you screen styling and clearer car artwork during the opening transition.
- `google-apps-script/Code.gs` — validation, deduplication, migration from the old Submission ID column, and sheet writes.

## Step 1 — Google Sheet

Use your existing wedding RSVP spreadsheet. The script looks for an existing tab named `RSVPs` or `RSVP Responses`, choosing the one with the most existing rows so it does not silently start a second list.

The expected columns, in this exact order, are:

1. Name
2. WhatsApp Number
3. Arrival Date
4. Departure Date
5. Number of Guests
6. Transport Mode
7. Submitted At
8. Last Updated

If the existing tab still has the older `Submission ID` column as its first column, the script removes that column automatically on the next submission, provided the remaining headers match the expected schema. Make a copy of the spreadsheet before the first test if you want a rollback point.

Keep the spreadsheet private; do not enable public link sharing.

## Step 2 — Apps Script

1. Open https://script.google.com/ and open your existing RSVP project.
2. Replace `Code.gs` with `google-apps-script/Code.gs` from this ZIP.
3. In Project Settings → Script Properties, verify `RSVP_SPREADSHEET_ID` points to your wedding RSVP spreadsheet.
4. Save.

## Step 3 — Redeploy the backend

1. Choose Deploy → Manage deployments.
2. Edit the existing Web App deployment.
3. Select **New version**, then Deploy.
4. Keep **Execute as: Me** and **Who has access: Anyone**.
5. Keep the same `/exec` URL if editing the existing deployment.

Do not create a second deployment unless necessary; the existing URL is already configured in `main.js`.

## Step 4 — Test before publishing

1. Run `npm install` if needed, then `npm run dev`.
2. Submit using a test 10-digit number.
3. Confirm exactly one row appears in the existing RSVP tab.
4. Submit again using the same number but change the guest count/name.
5. Confirm the same row updates, the original Submitted At remains, and Last Updated changes.
6. Confirm there is no Submission ID column.
7. Confirm the website changes to the full-screen thank-you screen only after the save succeeds.
8. Press browser Back. It should return to the invitation landing page.
9. Test on desktop and mobile.

The new backend consolidates older duplicate rows for a phone number when that number next submits. It cannot clean every unrelated duplicate number proactively.

## Step 5 — Publish

After local testing:

```bash
npm run build
git add .
git commit -m "Fix RSVP confirmation and household updates"
git push
```

GitHub Pages continues hosting the site; Apps Script handles submissions separately.

## Operational notes

- Apps Script is a public submission endpoint. The spreadsheet itself remains private.
- Server-side validation, a hidden honeypot, and a script lock are included. These are basic safeguards, not strong authentication.
- Apps Script has usage quotas; this lightweight setup is appropriate for expected wedding RSVP volume, but test it before sharing the invitation widely.
- If the Apps Script code changes, redeploy a new version of the existing Web App deployment.
