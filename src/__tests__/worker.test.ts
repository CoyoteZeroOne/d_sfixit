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
// Cloudflare's Turnstile test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_PASSES = "1x0000000000000000000000000000000AA";
const TURNSTILE_FAILS = "2x0000000000000000000000000000000AA";
const TURNSTILE_ALREADY_SPENT = "3x0000000000000000000000000000000AA";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const env = {
  ASSETS: { fetch: async () => new Response("asset") },
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Signups <signups@site.test>",
  TURNSTILE_SECRET_KEY: TURNSTILE_PASSES,
};
const realFetch = globalThis.fetch;

interface SentEmail {
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

let sentEmails: SentEmail[];
let resendFailsFor: string | undefined;
// A real token solved on another site can't be produced on demand, so that one
// siteverify result is stubbed; every other Turnstile call goes to Cloudflare.
let turnstileResult: object | undefined;

beforeEach(() => {
  sentEmails = [];
  resendFailsFor = undefined;
  turnstileResult = undefined;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit) => {
      if (input.includes("turnstile")) {
        return turnstileResult
          ? Response.json(turnstileResult)
          : realFetch(input, init);
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
  vi.useRealTimers();
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
    const res = await signup(
      {},
      { ...env, TURNSTILE_SECRET_KEY: TURNSTILE_FAILS },
    );

    expect(res.status).toBe(403);
    expect(console.error).toHaveBeenCalledWith("Turnstile rejected signup", [
      "invalid-input-response",
    ]);
    expect(sentEmails).toEqual([]);
  });

  it("sends nothing when the Turnstile token was already used", async () => {
    const res = await signup(
      {},
      { ...env, TURNSTILE_SECRET_KEY: TURNSTILE_ALREADY_SPENT },
    );

    expect(res.status).toBe(403);
    expect(console.error).toHaveBeenCalledWith("Turnstile rejected signup", [
      "timeout-or-duplicate",
    ]);
    expect(sentEmails).toEqual([]);
  });

  it("sends nothing when the Turnstile token was solved on another site", async () => {
    turnstileResult = { success: true, hostname: "evil.example" };

    const res = await signup();

    expect(res.status).toBe(403);
    expect(sentEmails).toEqual([]);
  });

  it("accepts a real Turnstile token solved on this site", async () => {
    turnstileResult = { success: true, hostname: "site.test" };

    const res = await signup();

    expect(res.status).toBe(303);
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

  it("rejects signups once the workshop has ended that day", async () => {
    // 22:00 UTC is 16:00 in Chicago, the mock workshop's end time.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2999-01-01T22:00:00Z"));

    const res = await signup();

    expect(res.status).toBe(409);
    expect(sentEmails).toEqual([]);
  });

  it("accepts signups during the workshop", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2999-01-01T21:59:00Z"));

    const res = await signup();

    expect(res.status).toBe(303);
  });

  it.each(["Maria O'Neil-Smith", "J.R. Smith", "José Núñez"])(
    "accepts the name %j",
    async (name) => {
      const res = await signup({ name });

      expect(res.status).toBe(303);
      expect(sentEmails[1].text).toContain(`Hi ${name},`);
    },
  );

  it.each([
    "evil.co",
    "Claim your refund at evil.example",
    "bit.ly/refund",
    "https://evil",
    "Call 5551234",
    "me@evil",
    "Ada\n\nYour account is locked",
    "A".repeat(61),
  ])("rejects the name %j and sends nothing", async (name) => {
    const res = await signup({ name });

    expect(res.status).toBe(400);
    expect(sentEmails).toEqual([]);
  });

  it("fakes success for the honeypot and sends nothing", async () => {
    const res = await signup({ botcheck: "on" });

    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/thanks/`);
    expect(sentEmails).toEqual([]);
  });

  it("only accepts POST", async () => {
    const res = await worker.fetch(new Request(`${ORIGIN}/api/signup`), env);

    expect(res.status).toBe(405);
  });

  it("rejects an Origin with the right host but the wrong scheme", async () => {
    const res = await signup({}, env, "http://site.test");

    expect(res.status).toBe(403);
  });

  it('rejects an "Origin: null" request instead of crashing', async () => {
    const res = await signup({}, env, "null");

    expect(res.status).toBe(403);
  });
});

describe("other paths", () => {
  it("returns 404 for unknown /api paths", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/api/other`, { method: "POST" }),
      env,
    );

    expect(res.status).toBe(404);
  });

  it("serves everything else from the static site", async () => {
    const res = await worker.fetch(new Request(`${ORIGIN}/workshops/`), env);

    expect(await res.text()).toBe("asset");
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
    "cf-turnstile-response": DUMMY_TOKEN,
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
