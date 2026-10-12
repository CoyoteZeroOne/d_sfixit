// Handles the workshop signup form once it's switched on (see "Signup emails" in
// the README): checks the signup, emails the organizer a copy, then emails the
// person a confirmation. To change the email wording, edit organizerText,
// receiptText and receiptHtml near the bottom of this file.
import rawWorkshops from "./data/workshops.json";
import { site } from "./config/site";
import { hasEnded, type Workshop } from "./lib/workshops";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
}
interface Email {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
}

// The same workshops.json the site uses, so a workshop's status and date there
// also decide what this form accepts. The build checks the file for mistakes.
const workshopList = rawWorkshops as Workshop[];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/signup") return handleSignup(request, env, url);
    if (url.pathname.startsWith("/api/")) return response("Not found.", 404);
    return env.ASSETS.fetch(request);
  },
};

async function handleSignup(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (request.method !== "POST") return response("Method not allowed.", 405);
  if (!isSameOrigin(request.headers.get("Origin"), url))
    return response("Invalid request origin.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return response("Invalid form submission.", 400);
  }

  if (String(form.get("botcheck") ?? "").trim())
    return Response.redirect(new URL("/thanks/", url), 303);
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const workshopId = String(form.get("workshop_id") ?? "").trim();
  if (
    !name ||
    name.length > 60 ||
    !isPlainName(name) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return response(
      "Please provide a valid name and email address, then try again.",
      400,
    );
  }
  const workshop = workshopList.find((item) => item.id === workshopId);
  if (!workshop) return response("That workshop could not be found.", 404);
  if (workshop.status !== "open")
    return response("This workshop is no longer accepting signups.", 409);
  if (hasEnded(workshop, site.timeZone))
    return response("This workshop has already happened.", 409);
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.TURNSTILE_SECRET_KEY)
    return response(
      "Signup email is not configured yet. Please contact the site owner.",
      503,
    );
  if (!(await passesTurnstile(form, request, url, env.TURNSTILE_SECRET_KEY)))
    return response(
      "We couldn't confirm you're a person. Go back, reload the page, and try again.",
      403,
    );

  // The organizer's copy is the only record of a signup, so it's sent first. If
  // it fails, the person is told to try again and gets no confirmation.
  const notes = String(form.get("notes") ?? "")
    .trim()
    .slice(0, 4000);
  const notified = await sendEmail(env, {
    to: site.contactEmail,
    replyTo: email,
    subject: `Workshop signup: ${workshop.title}`,
    text: organizerText(name, email, notes, workshop),
  });
  if (!notified)
    return response(
      `We couldn't submit your signup. Go back, reload the page, and try again, or email ${site.contactEmail}.`,
      502,
    );

  const calendar = calendarUrl(workshop);
  const receipted = await sendEmail(env, {
    to: email,
    replyTo: site.contactEmail,
    subject: `Signup confirmed: ${workshop.title}`,
    text: receiptText(name, workshop, calendar),
    html: receiptHtml(name, workshop, calendar),
  });
  const thanks = new URL("/thanks/", url);
  thanks.searchParams.set("w", workshop.id);
  if (!receipted) thanks.searchParams.set("receipt", "failed");
  return Response.redirect(thanks, 303);
}

function isSameOrigin(origin: string | null, url: URL): boolean {
  if (!origin) return true;
  return URL.canParse(origin) && new URL(origin).origin === url.origin;
}

// The name is the only text the submitter controls in the receipt, and the
// receipt goes to whatever address was typed, so it can't carry a link, a
// phone number or extra lines. "J.R. Smith" passes; "evil.co" does not.
function isPlainName(name: string): boolean {
  return !/[\d/:@\p{Cc}]/u.test(name) && !/\p{L}\.\p{L}{2}/u.test(name);
}

async function passesTurnstile(
  form: FormData,
  request: Request,
  url: URL,
  secret: string,
): Promise<boolean> {
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);
  try {
    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const outcome = (await result.json()) as {
      success?: boolean;
      hostname?: string;
      "error-codes"?: string[];
      metadata?: { result_with_testing_key?: boolean };
    };
    if (outcome.success !== true) {
      console.error("Turnstile rejected signup", outcome["error-codes"]);
      return false;
    }
    // Cloudflare's test secrets always report "example.com" and accept their
    // dummy token from anywhere, so checking them would only break local testing.
    if (
      !outcome.metadata?.result_with_testing_key &&
      outcome.hostname !== url.hostname
    ) {
      console.error(
        "Turnstile token was solved on another site",
        outcome.hostname,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}

async function sendEmail(env: Env, email: Email): Promise<boolean> {
  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!sent.ok)
      console.error(
        `Resend rejected "${email.subject}": ${sent.status} ${await sent.text()}`,
      );
    return sent.ok;
  } catch (error) {
    console.error(`Resend request failed for "${email.subject}"`, error);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}
function calendarUrl(workshop: Workshop): string {
  const compact = (date: string, time: string) =>
    `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: workshop.title,
    dates: `${compact(workshop.date, workshop.startTime)}/${compact(workshop.date, workshop.endTime)}`,
    ctz: site.timeZone,
    location: workshop.location,
    details: workshop.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function receiptHtml(
  name: string,
  workshop: Workshop,
  calendar: string,
): string {
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
function receiptText(
  name: string,
  workshop: Workshop,
  calendar: string,
): string {
  return [
    `Hi ${name},`,
    "",
    "Your workshop signup has been received.",
    "",
    workshop.title,
    `Date: ${workshop.date}`,
    `Time: ${workshop.startTime}–${workshop.endTime} (${site.timeZone})`,
    `Location: ${workshop.location}`,
    "",
    workshop.description,
    "",
    `Add to Google Calendar: ${calendar}`,
    "",
    `Questions? Contact ${site.contactEmail}.`,
  ].join("\n");
}
function organizerText(
  name: string,
  email: string,
  notes: string,
  workshop: Workshop,
): string {
  return [
    `New workshop signup: ${workshop.title}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Workshop date: ${workshop.date}`,
    `Workshop time: ${workshop.startTime}–${workshop.endTime} (${site.timeZone})`,
    `Location: ${workshop.location}`,
    "",
    "Participant notes:",
    notes || "(none)",
  ].join("\n");
}
function response(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
