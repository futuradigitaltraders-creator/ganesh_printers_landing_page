/* FUTURA: anonymous Vercel Web Analytics for public pages only. */
(function () {
  'use strict';
  if (!['www.futuraonlineprint.in', 'futuraonlineprint.in'].includes(location.hostname)) return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
  var publicPages = new Set(["/","/about.html","/budget-friendly-crackers-2026.html","/calendar.html","/catalogue-download.html","/catelogue-01g.html","/catelogue-02l.html","/coming-soon.html","/contact.html","/crackers-catalogue-choose-2026.html","/crackers-order-tracking.html","/daily-calendar-slip.html","/daily-slip-2-colours-multi.html","/daily-slip-single-colour.html","/daily-slips-introduction.html","/daily-slips-panchangam.html","/deepavali-crackers-2026.html","/die-cutting-calendars.html","/die-cutting-catalogue-01l-10x15.html","/die-cutting-catalogue-01l-11x17.html","/die-cutting-catalogue-01l-12x18.html","/die-cutting-catalogue-01l-14x24.html","/die-cutting-catalogue-01l-20x30.html","/die-cutting-catalogue-01l-23x36.html","/die-cutting-catalogue-01l.html","/gold-frame-calendars.html","/gold-frame-cat02-product-01.html","/gold-frame-cat02-product-02.html","/gold-frame-cat02-product-03.html","/gold-frame-product-02.html","/gold-frame-product-03.html","/gold-frame-product-04.html","/gold-frame-product-05.html","/gold-frame-product-06.html","/gold-frame-product-1400-1402.html","/gold-frame-product-1403-1405.html","/gold-frame-product-950-961.html","/gold-frame-test-product-01.html","/index.html","/party-design-daily-calendars.html","/party-special-design-samples.html","/product-01.html","/product-details.html","/project-details.html","/project.html","/service-details.html","/service.html","/shipping-policy.html"]);
  if (!publicPages.has(location.pathname)) return;
  if (document.getElementById('futura-vercel-analytics')) return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', function (event) {
    if (!event || event.type !== 'pageview') return null;
    try {
      var url = new URL(event.url, location.origin);
      if (url.origin !== location.origin || !publicPages.has(url.pathname)) return null;
      // Never send order IDs, mobile numbers, email addresses or link tokens.
      url.search = '';
      url.hash = '';
      if (url.pathname === '/index.html') url.pathname = '/';
      return { type: 'pageview', url: url.toString() };
    } catch (_) {
      return null;
    }
  });

  var script = document.createElement('script');
  script.id = 'futura-vercel-analytics';
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  // A disabled dashboard, blocked request or offline visit cannot interrupt ordering.
  script.onerror = function () {};
  document.head.appendChild(script);
})();
