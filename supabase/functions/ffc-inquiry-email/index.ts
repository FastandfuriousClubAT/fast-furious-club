import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OWNER_EMAIL = "odtahy.aut@gmail.com";
const SENDER_EMAIL = "odtahy.aut@gmail.com";
const SENDER_NAME = "Fast & Furious Club";
const ALLOWED_ORIGINS = new Set([
  "https://fastandfuriousclubat.github.io",
  "https://fastandfuriousclubat.vercel.app",
]);
function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) ||
    /^https:\/\/fast-furious-club(?:-[a-z0-9-]+)?-fastandfuriousclubat\.vercel\.app$/i.test(origin);
}
function responseHeaders(origin: string) {
  return {
    ...(origin && isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}
const reply = (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status, headers: responseHeaders(origin),
});

function confirmation(name: string, language: string, subject: string, message: string, fixedOrder = false) {
  const lang = language.toLowerCase();
  if (lang === "uk") return [
    "Вітаємо, " + name + "!", "",
    fixedOrder ? "Ми отримали ваше замовлення на трансфер за фіксованою ціною у Fast & Furious Club." : "Ми отримали ваш запит у Fast & Furious Club.",
    fixedOrder ? "Це підтвердження отримання замовлення, а не остаточне підтвердження бронювання." : "Це автоматичне підтвердження отримання запиту, а не остаточне підтвердження бронювання.",
    "Ми зв'яжемося з вами після перевірки деталей.", "",
    "З повагою, Fast & Furious Club", "", "Деталі вашого запиту:", subject, message,
  ].join("\n");
  if (lang === "cz") return [
    "Dobrý den, " + name + ",", "",
    fixedOrder ? "Vaši objednávku transferu za pevnou cenu jsme přijali ve Fast & Furious Club." : "Vaši objednávku / poptávku jsme úspěšně přijali ve Fast & Furious Club.",
    fixedOrder ? "Toto je potvrzení přijetí objednávky, nikoli konečné potvrzení rezervace." : "Toto je automatické potvrzení přijetí požadavku, nikoli závazné potvrzení rezervace.",
    "Po kontrole údajů se vám ozveme.", "",
    "S pozdravem, Fast & Furious Club", "", "Podrobnosti požadavku:", subject, message,
  ].join("\n");
  return [
    "Guten Tag " + name + ",", "",
    fixedOrder ? "wir haben Ihre Festpreis-Transferbestellung bei Fast & Furious Club erhalten." : "wir haben Ihre Anfrage bei Fast & Furious Club erhalten.",
    fixedOrder ? "Dies ist eine Eingangsbestätigung Ihrer Bestellung, noch keine endgültige Buchungsbestätigung." : "Dies ist eine automatische Eingangsbestätigung und noch keine verbindliche Buchungsbestätigung.",
    "Wir melden uns nach Prüfung der Angaben bei Ihnen.", "",
    "Freundliche Grüße, Fast & Furious Club", "", "Ihre Anfrage:", subject, message,
  ].join("\n");
}
function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] ?? c));
}
async function sendBrevo(apiKey: string, to: string, subject: string, textBody: string, replyTo?: string) {
  const payload: Record<string, unknown> = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: to }],
    subject,
    textContent: textBody,
    htmlContent: "<div style=\"font-family:Arial,sans-serif;white-space:pre-wrap\">" + htmlEscape(textBody) + "</div>",
  };
  if (replyTo) payload.replyTo = { email: replyTo };
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await response.text().catch(() => "");
  if (!response.ok) {
    console.error("FFC Brevo send failed", response.status, raw.slice(0, 1000));
    let detail = "Brevo rejected the email (HTTP " + response.status + ").";
    try {
      const parsed = JSON.parse(raw);
      if (parsed.message) detail += " " + String(parsed.message).slice(0, 300);
      if (parsed.code) detail += " [" + String(parsed.code).slice(0, 80) + "]";
    } catch { /* keep generic detail */ }
    return { ok: false, error: detail };
  }
  let messageId = "";
  try { messageId = String(JSON.parse(raw).messageId ?? ""); } catch { /* accepted response may be empty */ }
  return { ok: true, messageId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (req.method === "GET") return respond({ service: "brevo", configured: Boolean(Deno.env.get("BREVO_API_KEY")), function_version: 18 });
  if (req.method !== "POST") return respond({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== ALLOWED_ORIGIN) return respond({ success: false, error: "Origin not allowed" }, 403);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return respond({ success: false, error: "Invalid JSON" }, 400); }

  const name = String(input.name ?? "").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().slice(0, 254);
  const phone = String(input.phone ?? "").trim().slice(0, 40);
  const kind = String(input.inquiry_type ?? "trip").trim().slice(0, 20);
  const subject = String(input.subject ?? "Neue Anfrage über Fast & Furious Club").trim().slice(0, 160);
  const details = input.details && typeof input.details === "object" ? input.details as Record<string, unknown> : {};
  if (!name || !["trip", "ride", "airport"].includes(kind)) {
    return respond({ success: false, owner_notification: false, customer_copy: false, error: "Name and a valid inquiry type are required." }, 400);
  }
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (email && !validEmail) return respond({ success: false, owner_notification: false, customer_copy: false, error: "The customer email address is invalid." }, 400);

  const detailLines = Object.entries(details).slice(0, 35).map(([key, value]) =>
    key.replace(/[_-]/g, " ") + ": " +
    (Array.isArray(value) ? value.join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? ""))
  );
  const fixedAirportOrder = kind === "airport" &&
    details.airportOrderStatus === "fixed-price-order" &&
    Number(details.airportFixedPrice) > 0;
  const message = [
    fixedAirportOrder ? "FESTPREIS-TRANSFERBESTELLUNG (Eingang)" : "Neue Anfrage über Fast & Furious Club", "",
    "Name: " + name, "E-Mail: " + (email || "—"),
    "Telefon: " + (phone || "—"), "Typ: " + kind, "",
    "Details:", ...detailLines, "",
    fixedAirportOrder
      ? "Der Kunde hat eine Transferbestellung zum angezeigten Festpreis übermittelt. Bitte Verfügbarkeit prüfen und die Buchung ausdrücklich bestätigen."
      : "Die Anfrage ist unverbindlich. Bitte den Kunden kontaktieren und die Buchung ausdrücklich bestätigen."
  ].join("\n");

  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) {
    console.error("FFC Brevo configuration missing: BREVO_API_KEY is not present");
    return respond({
      success: false, owner_notification: false, customer_copy: false,
      error: "Brevo není v Supabase nakonfigurováno: chybí Edge Function secret BREVO_API_KEY. Objednávka zůstala uložena, e-mail nebyl odeslán."
    }, 503);
  }

  try {
    const owner = await sendBrevo(apiKey, OWNER_EMAIL, subject, message, validEmail ? email : undefined);
    if (!owner.ok) return respond({
      success: false, owner_notification: false, customer_copy: false,
      error: "E-mail majiteli se nepodařilo odeslat. " + owner.error
    }, 502);

    if (validEmail) {
      const language = String(details.language ?? "de").toLowerCase();
      const customerText = confirmation(name, language, subject, message, fixedAirportOrder);
      const customer = await sendBrevo(apiKey, email, language === "cz" ? "Potvrzení přijetí požadavku – Fast & Furious Club" : language === "uk" ? "Підтвердження отримання запиту – Fast & Furious Club" : "Eingangsbestätigung – Fast & Furious Club", customerText);
      if (!customer.ok) return respond({
        success: false, owner_notification: true, customer_copy: false,
        error: "E-mail majiteli byl odeslán, ale potvrzení zákazníkovi selhalo. " + customer.error
      }, 502);
      return respond({ success: true, owner_notification: true, customer_copy: true, message: "Owner notification and customer confirmation accepted by Brevo." });
    }
    return respond({ success: true, owner_notification: true, customer_copy: false, message: "Owner notification accepted by Brevo. No customer email was provided." });
  } catch (error) {
    console.error("FFC Brevo exception", error instanceof Error ? error.message : "unknown");
    return respond({ success: false, owner_notification: false, customer_copy: false, error: "Brevo connection failed. The request remains saved; email delivery is not confirmed." }, 502);
  }
});