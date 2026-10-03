# Invoice email setup

The website collects an optional client email. Payment screenshot upload generates an invoice with the existing website Order ID, original product codes, current validated rates, a Rs.300 packing/parcel forwarding charge, TOPAY note and same-value replacement note. It states payment verification is pending.

Deploy both `crackers-orders.gs` and `invoice-email.gs` into the EXISTING Apps Script project used by the website. Keep the current spreadsheet ID and web app deployment URL. Do not create a separate web app.

1. Sign into the owner Google account and open the existing Apps Script project.
2. Update the existing code and add `invoice-email.gs` (or combine both into Code.gs).
3. Select and run `setupInvoiceEmail`. The owner must grant the `script.send_mail` permission. This sends no test emails.
4. Update the existing web app deployment to a new version, keeping its execution identity and access settings.
5. Check the service GET response: `invoiceEmail: true`, version `2026-10-03-invoice-email`.
6. Test an order using the owner's email with an explicitly disposable test order. Check the PDF attachment and the `Invoice Emails 2026` sheet. A `Sent` entry means MailApp accepted the send, not proof of inbox delivery.

Mail dispatch is keyed by Order ID under the existing script lock. Re-uploading the same screenshot does not resend a sent invoice. An ambiguous `Sending` entry does not automatically retry. Email failures preserve the screenshot and the website PDF download. This draft limits mail dispatch to 50 recipients/day and two orders/address/day, additionally respecting Google's remaining recipient quota. The ledger stores the attempted recipient so a changed address cannot be falsely shown as having received the original invoice.

The website change works with the previous script deployment: invoice PDF download still works, and the UI accurately reports that email was not sent until setup is complete. New email data starts being stored in column H of Customer Details after the Google Script update. Supplier codes are stored in column I of Website Orders; prior rows may have no code and show a dash in emailed invoices.

Google Script and website PDF rendering use the same order details and price calculations. The email attachment is generated within Apps Script from stored order rows; no public endpoint accepts arbitrary mail content or attachments.
