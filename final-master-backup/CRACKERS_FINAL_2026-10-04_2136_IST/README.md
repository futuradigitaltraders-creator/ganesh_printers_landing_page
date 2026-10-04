# DEEPAVALI CRACKERS 2026 — FINAL MASTER BACKUP

Backup request time: **04 October 2026, 9:36:46 PM IST (Asia/Kolkata)**.

Source commit: `6e78885e65a4944b820d50205ef1269d26ec6b11`.
Source website: https://www.futuraonlineprint.in/deepavali-crackers-2026.html

This folder preserves **only the crackers setup**: 332 files, including the catalogue, tracking page, 304 local cracker image files, request/invoice PDF assets, order/payment APIs, Google Apps Script source and supporting configuration. The copies reuse the exact source Git blobs; no catalogue prices or production order records were changed.

## Status at backup
- Website source deployment succeeded. WhatsApp controls are paired with owner email attachment actions.
- Google Apps Script source contains the new payment screenshot email function.
- **Final Google Apps Script deployment is pending**, because Google sign-in showed 502 / Connection refused after reconnect.
- Live payment upload health reported `ownerScreenshotEmailAvailable: false`; owner screenshot email must not be described as live.
- Existing Google deployment version 10 remains the known deployed version. Saved source needs a new version deployed to the same web app.
- Owner: ganeshprint.kodai1976@gmail.com. WhatsApp: 9488917786.
- Payment screenshot submission is pending bank/GPay verification; only the owner's Payment Received action confirms payment.

## Resume the one pending step
Open the existing **Futura 2026 Crackers Orders** Apps Script project. Use **Deploy → Manage deployments → Edit → New version → Deploy**, retaining its existing deployment URL and access settings. Verify the website payment health returns `ownerScreenshotEmailAvailable: true`. No dummy order is needed to perform this availability check.

## Restore
Use `backup-manifest.json` to verify the file hashes, and copy files from `source/` to the same relative paths in the repository root. Deploy through the existing Vercel project. The complete Apps Script source is `source/integrations/google-sheets/FUTURA_COMPLETE_SCRIPT.txt`; retain the existing Sheet, deployment URL, script properties, and triggers.

The backup does not export customer/order rows, uploaded payment screenshots, Google account authorization, external hosted images, or secrets. Existing external image URLs remain in the saved HTML. Existing Google Sheet data and script permissions remain in their services.

The existing repository `.vercelignore` excludes `final-master-backup/`, keeping this dated backup outside the website deployment.
