import workshops from "./data/workshops.json";
import {site} from "./config/site";
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
}
interface Workshop {
  id: string; title: string; date: string; startTime: string; endTime: string;
  location: string; status: "open" | "full" | "cancelled"; description: string;
}
const workshopList = workshops as Workshop[];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}
function calendarUrl(workshop: Workshop): string {
  const compact = (date: string, time: string) =>
    `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE", text: workshop.title,
    dates: `${compact(workshop.date, workshop.startTime)}/${compact(workshop.date, workshop.endTime)}`,
    ctz: site.timeZone, location: workshop.location, details: workshop.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function receiptHtml(name: string, workshop: Workshop, calendar: string): string {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#101713;color:#d8f7df;font-family:ui-monospace,monospace;padding:24px">
  <main style="max-width:640px;margin:0 auto;border:1px solid #3d7650;padding:24px">
  <p style="color:#7ee787">&gt; ${escapeHtml(site.brand.replace(/_/g, " "))} // SIGNUP CONFIRMED</p>
  <h1>YOU'RE ON THE LIST.</h1><p>Hi ${escapeHtml(name)},</p><p>Your signup for this workshop has been received.</p>
  <hr style="border:0;border-top:1px solid #3d7650;margin:24px 0"><h2>${escapeHtml(workshop.title)}</h2>
  <p><strong>DATE:</strong> ${escapeHtml(workshop.date)}</p>
  <p><strong>TIME:</strong> ${escapeHtml(workshop.startTime)}–${escapeHtml(workshop.endTime)} (${escapeHtml(site.timeZone)})</p>
  <p><strong>LOCATION:</strong> ${escapeHtml(workshop.location)}</p>
  <p style="white-space:pre-wrap">${escapeHtml(workshop.description)}</p>
  <p style="margin:28px 0"><a href="${escapeHtml(calendar)}" style="display:inline-block;background:#7ee787;color:#101713;text-decoration:none;padding:12px 16px;font-weight:bold">[ ADD TO GOOGLE CALENDAR ]</a></p>
  <hr style="border:0;border-top:1px solid #3d7650;margin:24px 0"><p style="font-size:12px;color:#a4b9a8">Questions? Contact ${escapeHtml(site.contactEmail)}.</p>
  </main></body></html>`;
}
function receiptText(name: string, workshop: Workshop, calendar: string): string {
  return [
    `Hi ${name},`, "", "Your workshop signup has been received.", "", workshop.title,
    `Date: ${workshop.date}`, `Time: ${workshop.startTime}–${workshop.endTime} (${site.timeZone})`,
    `Location: ${workshop.location}`, "", workshop.description, "",
    `Add to Google Calendar: ${calendar}`, "", `Questions? Contact ${site.contactEmail}.`,
  ].join("\n");
}
function response(message: string, status: number): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/signup") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return response("Method not allowed.", 405);
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== url.host) return response("Invalid request origin.", 403);

    let form: FormData;
    try { form = await request.formData(); }
    catch { return response("Invalid form submission.", 400); }

    if (String(form.get("botcheck") ?? "").trim()) return Response.redirect(new URL("/thanks/", url), 303);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const workshopId = String(form.get("workshop_id") ?? "").trim();
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return response("Please provide a valid name and email address, then try again.", 400);
    }
    const workshop = workshopList.find((item) => item.id === workshopId);
    if (!workshop) return response("That workshop could not be found.", 404);
    if (workshop.status !== "open") return response("This workshop is no longer accepting signups.", 409);
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return response("Signup email is not configured yet. Please contact the site owner.", 503);

    const calendar = calendarUrl(workshop);
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM, to: [email], subject: `Signup confirmed: ${workshop.title}`,
        html: receiptHtml(name, workshop, calendar), text: receiptText(name, workshop, calendar),
        reply_to: site.contactEmail,
      }),
    });
    if (!sent.ok) return response("We couldn't send your confirmation email. Please try again or contact the site owner.", 502);

    // Preserve the original form's organizer notification as well as sending the receipt.
    const notes = String(form.get("notes") ?? "").trim().slice(0, 4000);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [site.contactEmail],
        reply_to: email,
        subject: `Workshop signup: ${workshop.title}`,
        text: [
          `New workshop signup: ${workshop.title}`,
          `Name: ${name}`,
          `Email: ${email}`,
          `Workshop date: ${workshop.date}`,
          `Workshop time: ${workshop.startTime}–${workshop.endTime} (${site.timeZone})`,
          `Location: ${workshop.location}`,
          "",
          "Participant notes:",
          notes || "(none)",
        ].join("\\n"),
      }),
    });

    return Response.redirect(new URL(`/thanks/?w=${encodeURIComponent(workshop.id)}`, url), 303);
  },
};
