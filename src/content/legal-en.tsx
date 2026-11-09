import type { LegalContext, LegalDocs } from "./legal-types";

// English translation provided for convenience; the French version prevails.
export function legalEn(c: LegalContext): LegalDocs {
  const L = c.legal;
  const P = c.providers;
  const company = `${L.companyName}, ${L.legalForm} with a share capital of ${L.capital}`;
  const note = <p><em>This English version is a translation; in case of discrepancy, the French version prevails.</em></p>;

  return {
    "mentions-legales": {
      title: "Legal notice",
      sections: [
        {
          h: "Publisher",
          body: (
            <>
              <p>{company}, registered office {L.address}, registered with the {L.rcs} Trade Register under number {L.siren}. VAT: {L.vat}.</p>
              <p>Publication director: {L.publicationDirector}. Contact: <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> · {L.phone}</p>
            </>
          ),
        },
        {
          h: "Hosting and technical providers",
          body: (
            <ul>
              <li>Website hosting: {P.host}</li>
              <li>Database: {P.database}</li>
              <li>Payments: {P.payments}</li>
              <li>Emails: {P.emails}</li>
              <li>Domain and mailbox: {P.domain}</li>
            </ul>
          ),
        },
        { h: "Intellectual property", body: <p>The Boomly brand, logo, texts and code belong to {L.companyName}. Shop photos belong to the partner shops that published them.</p> },
        { h: "Report content or a shop", body: <p>To report illegal content, an abusive review or a problematic shop, email <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> with the page link and the reason.</p> },
      ],
    },

    cgu: {
      title: "Terms of use and sale — travellers",
      sections: [
        { h: "Translation", body: note },
        {
          h: "1. The service",
          body: <p>Boomly lets you book and pay online for luggage storage at partner shops. <strong>Boomly does not store any bags</strong>: storage is provided by the chosen shop, an independent business verified by Boomly before going live. Boomly acts as an intermediary: it collects the payment, pays part of it to the shop and keeps a commission.</p>,
        },
        { h: "2. Booking", body: <p>No account is needed: you choose the drop-off point, drop-off and pick-up times within opening hours, the number and size of bags, your name and email. The booking is confirmed by email once paid; that email contains your QR code and a personal link to manage your booking.</p> },
        {
          h: "3. Prices and payment",
          body: <p>Prices are per bag and per started 24-hour period, by size: small {c.prices.small}, medium {c.prices.medium}, large {c.prices.large} per day (VAT included). Payment by card, Apple Pay or Google Pay via Stripe; Boomly never sees your card details.</p>,
        },
        { h: "4. Drop-off and pick-up", body: <p>Show your QR code at drop-off: the shopkeeper checks the number of bags, photographs them and adds a numbered tag to each. At pick-up the code is scanned again and becomes invalid. The shopkeeper may ask for ID if in doubt.</p> },
        { h: "5. Late pick-up", body: <p>If you don’t collect your bags on the planned day, they stay with the shop until it reopens. Each extra day is charged at the same rate per bag, paid on site at pick-up via secure online payment.</p> },
        {
          h: "6. Cancellation and changes",
          body: <p><strong>Free cancellation with a full refund until your planned drop-off time</strong>, from the link in your email; no refund afterwards. You can also change your times before drop-off if the billed duration stays the same. As the service is provided on a specific date, the 14-day withdrawal right does not apply (French Consumer Code, art. L221-28); free cancellation is offered instead. If the shop is closed when you arrive, report it from your booking for a full refund.</p>,
        },
        { h: "7. Prohibited items", body: <p id="objets-interdits">Do not leave: cash, jewellery, valuables or ID documents; dangerous, flammable, explosive or illegal goods; weapons; perishable food; animals. The shop may refuse a suspicious bag without refund.</p> },
        {
          h: "8. Liability and compensation",
          body: <p>If a bag is lost or damaged, report an incident from your booking within {L.claimDelayDays} days of pick-up with a description and photos. After review (including drop-off photos), compensation is limited to <strong>{L.indemnityCapPerBag} per bag</strong>, on proof. No compensation for prohibited items, normal wear or pre-existing damage.</p>,
        },
        { h: "9. Reviews", body: <p>Only travellers who picked up their bags can review, once per booking. Reviews are published without prior moderation or payment; Boomly may remove abusive or illegal reviews.</p> },
        { h: "10. Complaints and mediation", body: <p>Complaints: <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a>. If unresolved, you may contact the consumer mediator free of charge: {L.mediatorName} ({L.mediatorUrl}).</p> },
        { h: "11. Governing law", body: <p>French law applies. Version of {L.lastUpdated}.</p> },
      ],
    },

    "conditions-partenaires": {
      title: "Partner terms and conditions",
      sections: [
        { h: "Translation", body: note },
        { h: "1. Registration", body: <p>Partners register with accurate information (identity, business, SIRET, photos, hours, capacity) and create a Stripe payout account. Boomly checks every shop before it goes live.</p> },
        { h: "2. Partner commitments", body: <p>Keep bags in a safe area not accessible to the public; scan the QR code at drop-off and pick-up; check, photograph and tag every bag; hand bags back only against the booking code; keep hours and capacity up to date; refuse prohibited items and report incidents.</p> },
        { h: "3. Earnings", body: <p>The partner receives <strong>{c.share}% of the price paid by the traveller</strong> (and of late surcharges collected), paid automatically by Stripe after pick-up. Boomly keeps the balance as its commission and issues a monthly summary invoice. Changes to the percentage are notified at least 30 days in advance.</p> },
        { h: "4. Incidents and refunds", body: <p>Bookings cancelled before drop-off earn nothing. If an incident is attributable to the partner, Boomly may refund the traveller and take back the corresponding share.</p> },
        { h: "5. Tax reporting (DAC7)", body: <p>Boomly reports partners’ earnings and identification details to the tax authorities each year, as required by the EU DAC7 directive.</p> },
        { h: "6. Suspension and termination", body: <p>Partners can pause or delete their account at any time from their area once ongoing bookings are complete. Boomly may suspend a shop for breach or serious incidents. French law applies. Version of {L.lastUpdated}.</p> },
      ],
    },

    confidentialite: {
      title: "Privacy policy",
      sections: [
        { h: "Controller", body: <p>{company}, {L.address}. Privacy contact: <a href={`mailto:${L.privacyEmail}`}>{L.privacyEmail}</a>.</p> },
        {
          h: "Data we collect",
          body: (
            <ul>
              <li><strong>Travellers</strong>: name, email, phone (optional), booking details, photos of bags taken at drop-off, reports and reviews. No account is created.</li>
              <li><strong>Partners</strong>: identity, contact details, business information (address, SIRET, photos, hours), bookings and payouts.</li>
              <li><strong>Payment</strong>: handled by Stripe; Boomly never receives card numbers.</li>
              <li><strong>Technical</strong>: IP address and logs for security and abuse prevention.</li>
            </ul>
          ),
        },
        { h: "Purposes and legal bases", body: <p>Bookings, storage, payments and support (contract); invoicing, accounting and DAC7 reporting (legal obligation); security, fraud prevention and disputes (legitimate interest). No marketing without your consent.</p> },
        {
          h: "Recipients",
          body: <p>The shop concerned by your booking and our technical providers: {P.host}; {P.database}; {P.payments}; {P.emails}; {P.domain}. Map tiles come from OpenStreetMap and address search from the French IGN Géoplateforme, which receive your IP address. Transfers outside the EU rely on the European Commission’s standard contractual clauses or the EU–US Data Privacy Framework. We never sell your data.</p>,
        },
        { h: "Retention", body: <p>Traveller bookings: {L.travelerDataYears} years, then automatic anonymisation (photos deleted). Accounting records: 10 years, anonymised for travellers. Partner accounts: for the duration of the relationship; personal data erased on account deletion, invoicing and DAC7 data kept for the legal period.</p> },
        { h: "Your rights", body: <p>You have rights of access, rectification, erasure, objection, restriction and portability. Partners can download their data and delete their account from “My account”. Contact <a href={`mailto:${L.privacyEmail}`}>{L.privacyEmail}</a>; you may also complain to the CNIL (cnil.fr). Version of {L.lastUpdated}.</p> },
      ],
    },

    cookies: {
      title: "Cookie policy",
      sections: [
        {
          h: "Strictly necessary cookies only",
          body: <p>Boomly uses <strong>no analytics, advertising or social cookies</strong>. Only strictly necessary cookies are set (partner login session, language preference, and Stripe’s own security cookies on the payment page); they do not require consent. If we ever add analytics, a banner will let you accept or refuse just as easily. Version of {L.lastUpdated}.</p>,
        },
      ],
    },

    fonctionnement: {
      title: "How Boomly works",
      sections: [
        { h: "The shops", body: <p>Drop-off points are independent professional businesses paid to store bags, each checked by Boomly before going live.</p> },
        { h: "Ranking", body: <p>Results are ranked <strong>only by distance</strong> from the searched address or your location. No shop pays for a better position. Only approved, active shops are shown.</p> },
        { h: "Pricing", body: <p>Prices are set by Boomly and identical for all shops: small {c.prices.small}, medium {c.prices.medium}, large {c.prices.large} per bag per started 24 hours. {c.share}% of each booking goes to the shop; Boomly keeps the rest, which covers payment fees, support and running the platform.</p> },
        { h: "Reviews", body: <p>Only travellers who actually picked up their bags can post a review. Reviews are neither paid for nor filtered by rating.</p> },
      ],
    },

    support: {
      title: "Help and contact",
      sections: [
        { h: "Contact us", body: <p>Email <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> with your booking reference (BMY-…) if you have one. We usually reply within one business day.</p> },
        { h: "You have a booking", body: <p>To cancel, change or report a problem, open the “View my booking” link from your confirmation email. Can’t find it? Check your spam folder, then write to us with the email address you used.</p> },
        { h: "You are a partner", body: <p>Log in to your partner area to manage bookings, hours and payouts. Forgot your password? Use the link on the login page. To delete your account or download your data: “My account”.</p> },
        { h: "Report abuse", body: <p>Abusive review, illegal content or problematic shop: email <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> with the link.</p> },
      ],
    },
  };
}
