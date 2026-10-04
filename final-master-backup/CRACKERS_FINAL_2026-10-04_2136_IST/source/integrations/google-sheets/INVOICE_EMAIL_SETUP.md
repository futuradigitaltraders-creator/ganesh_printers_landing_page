# Invoice email setup

The website collects an optional client email. Payment screenshot upload generates an invoice with the existing website Order ID, original product codes, current validated rates, a Rs.300 packing/parcel forwarding charge, TOPAY note and same-value replacement note. It states payment verification is pending.

Deploy `crackers-orders.gs`, `invoice-email.gs` and `order-followup.gs` into the EXISTING Apps Script project used by the website. Keep the current spreadsheet ID and web app deployment URL. Do not create a separate web app. Alternatively replace all contents of the existing Code.gs with `FUTURA_COMPLETE_SCRIPT.txt`; do not add that combined copy alongside the separate files, which would duplicate declarations.

1. Sign into the owner Google account and open the existing Apps Script project.
2. Update the existing code and add the two supporting .gs files (or use the complete combined copy in Code.gs).
3. Select and run `setupPaymentConfirmation`. This retains invoice email setup, prepares approval columns and creates one owner-installed spreadsheet edit trigger. The owner must grant requested Google permissions. Setup sends no emails and does not approve existing payments.
4. Update the existing web app deployment to a new version, keeping its execution identity and access settings.
5. Check the service GET response: `invoiceEmail: true`, `orderTracking: true`, `paymentConfirmation: true`, version `2026-10-04-order-tracking`.
6. Test an order using the owner's email with an explicitly disposable test order. Check the PDF attachment and the `Invoice Emails 2026` sheet. A `Sent` entry means MailApp accepted the send, not proof of inbox delivery.

Mail dispatch is keyed by Order ID under the existing script lock. Re-uploading the same screenshot does not resend a sent invoice. An ambiguous `Sending` entry does not automatically retry. Email failures preserve the screenshot and the website PDF download. This draft limits mail dispatch to 50 recipients/day and two orders/address/day, additionally respecting Google's remaining recipient quota. The ledger stores the attempted recipient so a changed address cannot be falsely shown as having received the original invoice.

The website change works with the previous script deployment: invoice PDF download still works, and the UI accurately reports that email was not sent until setup is complete. New email data starts being stored in column H of Customer Details after the Google Script update. Supplier codes are stored in column I of Website Orders; prior rows may have no code and show a dash in emailed invoices.

## Payment approval and website tracking

The first screenshot-upload invoice continues to send immediately and remains a screenshot acknowledgement. Its bottom line is: "After payment verification, you will receive a confirmation email."

In the private `Payment Proofs 2026` tab, check the screenshot against the actual bank/GPay credit. Enter the actual received amount as a number in column F, then tick the `Payment Received` checkbox in column G. The installed edit trigger records the amount and time, changes payment status and sends the SECOND email: "Your payment of Rs.XXXX has been received. Thank you." with a `TRACK YOUR ORDER HERE` button linking to the business website. Column H reports the email outcome; it does not confuse saved payment with email delivery. Double clicks do not resend. An uncertain `Sending` state is held for manual Gmail checking.

Update the `Order Followup 2026` tab's Order Status dropdown, Dispatch Date, Transport Name, LR / Parcel No., Delivered Date, Payment Mode and Receiver Name. The client sees the changes when refreshing the same tracking link. Editing dispatch details does not send additional emails. Received amount is locked to the first confirmation; later checkbox clicks use the recorded amount.

Tracking uses a random 64-character private token, never an Order ID alone. The website receives a token at upload only when the original secret order reservation key matches; older clients without that key can use the link in their second email. The token is in the URL fragment to keep it out of page URL/server/referrer logs. The API returns client name/city and a masked mobile only after payment confirmation, along with order amount and dispatch status. It never returns full contact details, email or internal sheet contents. There is no public payment-approval action.

The catalogue remembers the latest upload's tracking credentials on that browser. Its tracking button stays hidden until payment is confirmed. It checks on upload, page opening, returning to the tab and once a minute while the tab is visible. No-email clients can track using that browser; no email is falsely reported as sent.

New website code is compatible with the previous Google deployment; tracking remains hidden/unavailable until the updated script is deployed and setup is run. Previously emailed invoices are unchanged.

Google Script and website PDF rendering use the same order details and price calculations. The email attachment is generated within Apps Script from stored order rows; no public endpoint accepts arbitrary mail content or attachments.
