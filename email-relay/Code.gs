/**
 * Fast & Furious Club - transactional email relay
 *
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * In Project Settings > Script Properties add:
 *   FFC_WEBHOOK_SECRET = a long random secret shared with the Supabase Edge Function
 *
 * The Supabase Edge Function calls this endpoint server-to-server.
 */
function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty("FFC_WEBHOOK_SECRET");
    if (!expectedSecret) {
      return json_({ success: false, error: "Server secret is not configured." });
    }

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(raw);
    if (!data.secret || data.secret !== expectedSecret) {
      return json_({ success: false, error: "Unauthorized." });
    }

    const to = String(data.to || "").trim();
    const subject = String(data.subject || "").trim();
    const body = String(data.body || "");
    const replyTo = String(data.replyTo || "").trim();

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !body) {
      return json_({ success: false, error: "Recipient, subject and body are required." });
    }

    const options = { name: "Fast & Furious Club" };
    if (replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
      options.replyTo = replyTo;
    }
    GmailApp.sendEmail(to, subject, body, options);
    return json_({ success: true });
  } catch (err) {
    console.error(err);
    return json_({ success: false, error: String(err && err.message || err) });
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
