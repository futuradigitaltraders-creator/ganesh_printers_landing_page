# Website visitor counts

Dashboard: https://vercel.com/kumarans-projects-b6bb9d1d/ganesh-printers-landing-page/analytics

## Activation

1. Open the project in the existing Vercel owner account.
2. Select **Analytics** and **Enable**. Check the account's current plan; do not purchase an upgrade or Web Analytics Plus.
3. Redeploy the latest production deployment. Vercel adds its analytics routes after a deployment made with Web Analytics enabled.
4. Visit the public site once, then check the dashboard. No past visits are reconstructed.

## Reading the report

- **Visitors**: anonymous visitor counts for the selected reporting period. Vercel's cookie-free visitor identification resets daily; these are estimates, not identified people.
- **Page Views**: total page loads, including repeat views.
- **Pages**: visits to each page, including the high-quality and budget crackers catalogues.
- Choose today, the last seven days, or another available reporting period.

## Implementation

Active HTML pages load `/assets/js/futura-analytics.js`. The loader uses Vercel's supported same-origin `/_vercel/insights/script.js` route for static HTML sites. Enablement in the owner dashboard is still required.

Only known public page paths on `futuraonlineprint.in` and `www.futuraonlineprint.in` are counted. Query strings and URL fragments are removed before sending, so order IDs, access tokens, mobile numbers and email addresses in links are excluded. No form contents or custom events are collected by this integration. Home `/index.html` views are grouped with `/`.

The loader respects Global Privacy Control and Do Not Track. Preview domains and local tests do not report visits. A blocked or missing analytics script cannot interrupt the order flow. Archive and test pages are not instrumented; unknown paths, including error-page paths, are not reported.

Provider documentation:

- https://vercel.com/docs/analytics/quickstart
- https://vercel.com/docs/analytics/redacting-sensitive-data
- https://vercel.com/docs/analytics/privacy-policy
- https://vercel.com/docs/analytics/limits-and-pricing
