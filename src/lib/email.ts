import "server-only";
import { Resend } from "resend";
import { createTranslator } from "next-intl";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";
import { createAdminClient } from "./supabase/admin";
import { formatEuros } from "./pricing";
import { qrPng } from "./qr";
import { siteUrl } from "./site-url";
import { TZ } from "./paris-time";

const messages = { fr, en } as const;

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:22px;font-weight:bold;color:#ea580c;padding-bottom:16px">Boomly</td></tr>
<tr><td><h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>${body}</td></tr>
</table></td></tr></table></body></html>`;
}

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY absente : e-mail non envoyé.");
    return null;
  }
  return new Resend(key);
}

const FROM = () => process.env.EMAIL_FROM || "Boomly <onboarding@resend.dev>";

type BookingForEmail = {
  id: string;
  reference: string;
  access_token: string;
  customer_name: string;
  customer_email: string;
  locale: "fr" | "en";
  bags_small: number;
  bags_medium: number;
  bags_large: number;
  bag_count: number;
  dropoff_at: string;
  pickup_at: string;
  total_cents: number;
  partner_share_cents: number;
  confirmation_email_sent_at: string | null;
  partner_email_sent_at: string | null;
  location: { name: string; address: string; postal_code: string | null; city: string; latitude: number; longitude: number; partner: { email: string; full_name: string | null } | null };
};

async function loadBooking(id: string): Promise<BookingForEmail | null> {
  const { data } = await createAdminClient()
    .from("bookings")
    .select(
      "id, reference, access_token, customer_name, customer_email, locale, bags_small, bags_medium, bags_large, bag_count, dropoff_at, pickup_at, total_cents, partner_share_cents, confirmation_email_sent_at, partner_email_sent_at, location:locations(name, address, postal_code, city, latitude, longitude, partner:profiles(email, full_name))",
    )
    .eq("id", id)
    .single();
  return data as unknown as BookingForEmail | null;
}

function dateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** E-mail de confirmation au voyageur, avec code QR. N'est envoyé qu'une fois. */
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  const client = resend();
  if (!b || !client || b.confirmation_email_sent_at) return;

  const locale = b.locale === "en" ? "en" : "fr";
  const t = createTranslator({ locale, messages: messages[locale], namespace: "Emails" });
  const ts = createTranslator({ locale, messages: messages[locale], namespace: "Sizes" });
  const link = `${siteUrl()}/${locale}/reservation/${b.reference}?t=${b.access_token}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${b.location.latitude},${b.location.longitude}`;
  const bags = (
    [
      ["small", b.bags_small],
      ["medium", b.bags_medium],
      ["large", b.bags_large],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} × ${ts(s)}`)
    .join(", ");

  const html = layout(
    t("confirmTitle"),
    `<p>${escape(t("hello", { name: b.customer_name }))}</p>
<p>${escape(t("confirmIntro"))}</p>
<p style="text-align:center;margin:20px 0"><img src="cid:qr" width="200" height="200" alt="QR" style="display:inline-block"/><br/>
<span style="font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:2px">${b.reference}</span></p>
<p style="font-size:14px;color:#57534e;text-align:center">${escape(t("showQr"))}</p>
<table width="100%" style="border-top:1px solid #e7e5e4;margin-top:16px;padding-top:12px;font-size:15px">
<tr><td style="color:#57534e;padding:4px 0">${escape(t("where"))}</td><td><strong>${escape(b.location.name)}</strong><br/>${escape(b.location.address)}, ${escape(b.location.postal_code ?? "")} ${escape(b.location.city)}<br/><a href="${directions}" style="color:#c2410c">${escape(t("directions"))}</a></td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("dropoff"))}</td><td>${escape(dateTime(b.dropoff_at, locale))}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("pickup"))}</td><td>${escape(dateTime(b.pickup_at, locale))}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("bags"))}</td><td>${escape(bags)}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("paid"))}</td><td><strong>${escape(formatEuros(b.total_cents, locale))}</strong></td></tr>
</table>
<p style="margin-top:20px"><a href="${link}" style="background:#ea580c;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${escape(t("manage"))}</a></p>
<p style="font-size:13px;color:#57534e">${escape(t("cancelInfo"))}</p>`,
  );

  const { error } = await client.emails.send({
    from: FROM(),
    to: b.customer_email,
    subject: t("confirmSubject", { reference: b.reference, name: b.location.name }),
    html,
    attachments: [{ filename: `${b.reference}.png`, content: await qrPng(b.reference), contentId: "qr" }],
  });
  if (error) {
    console.error("E-mail voyageur :", error.message);
    return;
  }
  await createAdminClient().from("bookings").update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", b.id);
}

/** Alerte au commerçant pour chaque nouvelle réservation payée. */
export async function sendPartnerNotification(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  const client = resend();
  if (!b || !client || b.partner_email_sent_at || !b.location.partner?.email) return;

  const t = createTranslator({ locale: "fr", messages: fr, namespace: "Emails" });
  const html = layout(
    t("partnerTitle"),
    `<p>${escape(t("partnerIntro", { name: b.location.name }))}</p>
<table width="100%" style="font-size:15px">
<tr><td style="color:#57534e;padding:4px 0">${escape(t("reference"))}</td><td style="font-family:monospace;font-weight:bold">${b.reference}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("customer"))}</td><td>${escape(b.customer_name)}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("dropoff"))}</td><td>${escape(dateTime(b.dropoff_at, "fr"))}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("pickup"))}</td><td>${escape(dateTime(b.pickup_at, "fr"))}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("bagCount"))}</td><td>${b.bag_count}</td></tr>
<tr><td style="color:#57534e;padding:4px 0">${escape(t("earnings"))}</td><td><strong>${escape(formatEuros(b.partner_share_cents, "fr"))}</strong></td></tr>
</table>
<p style="margin-top:20px"><a href="${siteUrl()}/fr/partenaire" style="background:#ea580c;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${escape(t("openDashboard"))}</a></p>`,
  );

  const { error } = await client.emails.send({
    from: FROM(),
    to: b.location.partner.email,
    subject: t("partnerSubject", { reference: b.reference }),
    html,
  });
  if (error) {
    console.error("E-mail commerçant :", error.message);
    return;
  }
  await createAdminClient().from("bookings").update({ partner_email_sent_at: new Date().toISOString() }).eq("id", b.id);
}

/** Alerte à l'admin (paiement reçu sur une réservation expirée, etc.). */
export async function sendAdminAlert(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  const client = resend();
  if (!to || !client) {
    console.warn("Alerte admin :", subject, text);
    return;
  }
  const { error } = await client.emails.send({ from: FROM(), to, subject: `[Boomly] ${subject}`, text });
  if (error) console.error("Alerte admin :", error.message);
}

/** Après le retrait : demande d'avis au voyageur (une seule fois). */
export async function sendReviewRequest(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  const client = resend();
  if (!b || !client) return;
  const { data: row } = await createAdminClient().from("bookings").select("review_email_sent_at").eq("id", bookingId).single();
  if (row?.review_email_sent_at) return;

  const locale = b.locale === "en" ? "en" : "fr";
  const t = createTranslator({ locale, messages: messages[locale], namespace: "Emails" });
  const link = `${siteUrl()}/${locale}/reservation/${b.reference}?t=${b.access_token}#avis`;
  const html = layout(
    t("reviewTitle"),
    `<p>${escape(t("hello", { name: b.customer_name }))}</p>
<p>${escape(t("reviewIntro", { name: b.location.name }))}</p>
<p style="margin-top:20px"><a href="${link}" style="background:#ea580c;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${escape(t("reviewCta"))}</a></p>`,
  );
  const { error } = await client.emails.send({ from: FROM(), to: b.customer_email, subject: t("reviewSubject", { name: b.location.name }), html });
  if (error) {
    console.error("E-mail avis :", error.message);
    return;
  }
  await createAdminClient().from("bookings").update({ review_email_sent_at: new Date().toISOString() }).eq("id", b.id);
}

/** Confirmation d'annulation / remboursement au voyageur. */
export async function sendCancellationEmail(bookingId: string, refundedCents: number): Promise<void> {
  const b = await loadBooking(bookingId);
  const client = resend();
  if (!b || !client) return;
  const locale = b.locale === "en" ? "en" : "fr";
  const t = createTranslator({ locale, messages: messages[locale], namespace: "Emails" });
  const html = layout(
    t("cancelTitle"),
    `<p>${escape(t("hello", { name: b.customer_name }))}</p>
<p>${escape(t("cancelIntro", { reference: b.reference, amount: formatEuros(refundedCents, locale) }))}</p>`,
  );
  const { error } = await client.emails.send({ from: FROM(), to: b.customer_email, subject: t("cancelSubject", { reference: b.reference }), html });
  if (error) console.error("E-mail annulation :", error.message);
}
