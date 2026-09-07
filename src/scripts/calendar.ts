import { formatDate, formatTimeRange } from "../lib/date";
import { STATUS_LABELS } from "../lib/status";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "open" | "full" | "cancelled";
  url: string;
}

interface CalendarPayload {
  today: string;
  events: CalendarEvent[];
}

interface CalendarState {
  events: CalendarEvent[];
  viewDate: Date;
  calendarEl: HTMLElement;
  labelEl: HTMLElement;
  outputEl: HTMLElement;
}

export function initCalendar(
  calendarId: string,
  labelId: string,
  outputId: string,
  dataId: string,
): void {
  const calendarEl = document.getElementById(calendarId);
  const labelEl = document.getElementById(labelId);
  const outputEl = document.getElementById(outputId);
  const dataScript = document.getElementById(dataId);
  const prevButton = document.getElementById("prev-month");
  const nextButton = document.getElementById("next-month");
  if (!calendarEl || !labelEl || !outputEl || !dataScript) return;

  const payload = JSON.parse(
    dataScript.textContent ?? "{}",
  ) as Partial<CalendarPayload>;

  const state: CalendarState = {
    events: payload.events ?? [],
    // Seeded from the site's configured time zone (see src/lib/date.ts),
    // not the visitor's browser clock — keeps the calendar's default month
    // consistent with how "upcoming" is decided at build time.
    viewDate: parseInitialViewDate(payload.today),
    calendarEl,
    labelEl,
    outputEl,
  };

  renderCalendar(state);

  prevButton?.addEventListener("click", () => {
    state.viewDate = new Date(
      state.viewDate.getFullYear(),
      state.viewDate.getMonth() - 1,
      1,
    );
    renderCalendar(state);
  });
  nextButton?.addEventListener("click", () => {
    state.viewDate = new Date(
      state.viewDate.getFullYear(),
      state.viewDate.getMonth() + 1,
      1,
    );
    renderCalendar(state);
  });
}

function renderCalendar(state: CalendarState): void {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  state.labelEl.textContent = state.viewDate
    .toLocaleDateString(undefined, { month: "long", year: "numeric" })
    .toUpperCase();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const leadingOffset = firstOfMonth.getDay();
  const cells: string[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
    (day) => `<div class="weekday">${day}</div>`,
  );

  for (let i = 0; i < leadingOffset; i++) {
    cells.push('<div class="day empty"></div>');
  }

  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = state.events.filter((event) => event.date === dateKey);
    const hasEventClass = dayEvents.length ? "has-event" : "";
    const badge = dayEvents.length
      ? `<small>${dayEvents.length} EVT</small>`
      : "";
    cells.push(
      `<button type="button" class="day ${hasEventClass}" data-date="${dateKey}"><span>${day}</span>${badge}</button>`,
    );
  }

  state.calendarEl.innerHTML = cells.join("");

  state.calendarEl
    .querySelectorAll<HTMLButtonElement>(".day[data-date]")
    .forEach((button) => {
      const date = button.dataset.date;
      if (!date) return;
      button.addEventListener("click", () => showEventsForDate(state, date));
    });
}

function showEventsForDate(state: CalendarState, date: string): void {
  const dayEvents = state.events.filter((event) => event.date === date);
  if (!dayEvents.length) {
    state.outputEl.innerHTML = `<span class="muted">${formatDate(date)}: NO WORKSHOPS SCHEDULED.</span>`;
    return;
  }
  state.outputEl.innerHTML = dayEvents.map(formatEventCard).join("");
}

function formatEventCard(event: CalendarEvent): string {
  return `
    <article class="event-detail">
      <h3>${escapeHtml(event.title.toUpperCase())}</h3>
      <p>
        <b>DATE:</b> ${formatDate(event.date)}<br />
        <b>TIME:</b> ${escapeHtml(formatTimeRange(event.startTime, event.endTime))}<br />
        <b>LOCATION:</b> ${escapeHtml(event.location)}<br />
        <b>STATUS:</b> ${STATUS_LABELS[event.status]}
      </p>
      <a class="button" href="${escapeHtml(event.url)}">[ VIEW &amp; SIGN UP ]</a>
    </article>`;
}

function parseInitialViewDate(todayIso: string | undefined): Date {
  if (!todayIso) return new Date();
  const [year, month, day] = todayIso.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
