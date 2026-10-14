# FUTURA 2026 Checklist automation — installation
1. Open https://script.google.com/home/projects and create **New project** under the Gmail account that receives Pyro Bazaar emails.
2. Replace Code.gs with the contents of `tools/futura-checklist-automation.gs`; save.
3. Select `setupChecklistAutomation` and click **Run** once. Review and grant Gmail, Drive, Docs, Spreadsheet and trigger permissions.
4. View **Executions / Logs** for links to the Mapping Sheet and Google Drive folder.
5. Existing sample mapping is Supplier **7697** → FUTURA **0108**, **Meenakshi Sundaram**, **9842141265**. Confirm that link is correct. The supplier email will determine **product names and quantities ONLY**.
6. For each new supplier confirmation, add ONE row in the Mapping Sheet: supplier no., FUTURA no., customer name, mobile. Leave Status and PDF URL blank. Every 15 minutes the script checks supplier confirmation emails, creates an A4 PDF, and stores its link in the sheet.
7. No matching mapping = no PDF. Already-generated rows are skipped. Corrections require manual review; avoid blanking Status/URL until verifying duplicates.
8. Script does **not** send PDFs or customer data to customers and does not change existing orders.

## Important
The GitHub repo alone cannot authorize or run Gmail Apps Script jobs. The installation and one-time Google authorization above is mandatory. Gmail search depends on supplier confirmation emails remaining accessible to the configured mailbox. Supplier email body format changes may need regex updates.
