import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "../config/site";
import worker from "../worker";

vi.mock("../data/workshops.json", () => ({
  default: [
    {
      id: "future",
      title: "Future Workshop",
      date: "2999-01-01",
      startTime: "14:00",
      endTime: "16:00",
      location: "Room 1",
      capacity: 10,
      status: "open",
      description: "Bring tools.",
    },
    {
      id: "past",
      title: "Past Workshop",
      date: "2000-01-01",
      startTime: "14:00",
      endTime: "16:00",
      location: "Room 1",
      capacity: 10,
      status: "open",
      description: "Already happened.",
    },
  ],
}));

const ORIGIN = "https://site.test";
const env = {
  ASSETS: { fetch: async () => new Response("asset") },
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Signups <signups@site.test>",
  TURNSTILE_SECRET_KEY: "turnstile_test",
};

interface SentEmail {
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

let sentEmails: SentEmail[];
let resendFailsFor: string | undefined;
let turnstilePasses: boolean;

beforeEach(() => {
  sentEmails = [];
  resendFailsFor = undefined;
  turnstilePasses = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit) => {
      if (input.includes("turnstile")) {
        return Response.json({ success: turnstilePasses });
      }
      const email = JSON.parse(String(init.body)) as SentEmail;
      if (email.to[0] === resendFailsFor) {
        return Response.json({ message: "rejected" }, { status: 500 });
      }
      sentEmails.push(email);
      return Response.json({ id: "email-id" });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/signup", () => {
  it("emails the organizer first, then the participant, and redirects to thanks", async () => {
    const res = await signup();

    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/thanks/?w=future`);
    expect(sentEmails.map((email) => email.to[0])).toEqual([
      site.contactEmail,
      "ada@example.com",
    ]);
  });

  it("puts each organizer email field on its own line", async () => {
    await signup();

    const organizerText = sentEmails[0].text;
    expect(organizerText).not.toContain("\\n");
    expect(organizerText.split("\n")).toContain("Name: Ada");
    expect(organizerText.split("\n")).toContain("Email: ada@example.com");
  });

  it("fails the signup and sends no receipt when the organizer email fails", async () => {
    resendFailsFor = site.contactEmail;

    const res = await signup();

    expect(res.status).toBe(502);
    expect(sentEmails).toEqual([]);
  });

  it("keeps the signup and flags the thanks page when only the receipt fails", async () => {
    resendFailsFor = "ada@example.com";

    const res = await signup();

    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(
      `${ORIGIN}/thanks/?w=future&receipt=failed`,
    );
    expect(sentEmails.map((email) => email.to[0])).toEqual([site.contactEmail]);
  });

  it("sends nothing when Turnstile rejects the token", async () => {
    turnstilePasses = false;

    const res = await signup();

    expect(res.status).toBe(403);
    expect(sentEmails).toEqual([]);
  });

  it("sends nothing without a Turnstile token", async () => {
    const res = await signup({ "cf-turnstile-response": "" });

    expect(res.status).toBe(403);
    expect(sentEmails).toEqual([]);
  });

  it("refuses to send until the Turnstile secret is set", async () => {
    const res = await signup({}, { ...env, TURNSTILE_SECRET_KEY: "" });

    expect(res.status).toBe(503);
    expect(sentEmails).toEqual([]);
  });

  it("rejects signups for a workshop whose date has passed", async () => {
    const res = await signup({ workshop_id: "past" });

    expect(res.status).toBe(409);
    expect(sentEmails).toEqual([]);
  });

  it('rejects an "Origin: null" request instead of crashing', async () => {
    const res = await signup({}, env, "null");

    expect(res.status).toBe(403);
  });
});

function signup(
  fields: Record<string, string> = {},
  workerEnv = env,
  origin = ORIGIN,
): Promise<Response> {
  const body = new URLSearchParams({
    name: "Ada",
    email: "ada@example.com",
    workshop_id: "future",
    notes: "",
    "cf-turnstile-response": "token",
    ...fields,
  });
  return worker.fetch(
    new Request(`${ORIGIN}/api/signup`, {
      method: "POST",
      headers: { Origin: origin },
      body,
    }),
    workerEnv,
  );
}
