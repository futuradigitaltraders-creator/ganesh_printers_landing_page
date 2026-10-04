# FUTURA Final Master Backup — 4 October 2026

The complete website snapshot is in `2026-10-04/website/`.

- Source commit: `c9a1f8fb85d5a4d2bfae8ea490dc91ad6b62cce9`
- Source Git tree: `975f0e390c0dabe23e8266bf4def81b8dc00a9b9`
- Files: 1,246, including all website pages, original images/assets, API handlers, invoice code, Google Apps Script source and existing deployment configuration.
- Snapshot includes fresh-start quantities, explicit saved-selection resume, Refresh/Clear Selection, final confirmation before order-ID allocation, and reservation reuse for retries.

The website folder points to the exact original Git tree. Its contents remain a saved snapshot when the active website files are edited later. Do not edit this dated snapshot.

## Restore

1. Prepare a separate checkout or folder first.
2. Copy the CONTENTS of `2026-10-04/website/` into the repository root used for restoration. Keep the dated backup folder and deployment exclusion.
3. Use the existing package.json/lockfile and hosting project.
4. For Apps Script, see the snapshot's `integrations/google-sheets/INVOICE_EMAIL_SETUP.md`. Use either the combined `FUTURA_COMPLETE_SCRIPT.txt` or the separate script files, never both. Owner permissions, installed triggers and web-app deployments must be retained or restored separately.
5. Preserve the CURRENT Google workbook, client rows and order reservations. Source restoration must not overwrite newer orders or reuse reserved order numbers.
6. Check fresh quantities, explicit resume, final confirmation, repeat-submit ID reuse, invoice/PDF flow and owner-approved payment/tracking before production restoration.

## Separate private data backup

The customer workbook snapshot and additional print PDFs are in the owner's separate downloadable master-backup set produced on 4 October 2026. They are not copied into this public website repository. That workbook is today's earlier verified post-cleanup snapshot; a fresh Google export could not be completed because sign-in timed out.

Account credentials, hosting secrets, Google Drive proof files, installed triggers and authorizations are not website source files and are not contained in this repository snapshot.

`final-master-backup/` is excluded from Vercel deployment with the root `.vercelignore` so the duplicate source/images do not become part of the customer-facing website deployment.
