let workshopData = [];
let calendarDate = new Date();

async function getWorkshops() {
  if (!workshopData.length) {
    const response = await fetch("data/workshops.json");
    workshopData = await response.json();
  }
  return workshopData;
}

function prettyDate(dateString) {
  return new Date(dateString + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

async function loadNextWorkshop(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const events = await getWorkshops();
  const now = new Date();
  const next = events.find(e => new Date(e.date + "T23:59:59") >= now) || events[0];
  target.innerHTML = `
    <strong>${next.title.toUpperCase()}</strong>
    <div>${prettyDate(next.date)} // ${next.time}</div>
    <div>${next.location}</div>
    <div class="muted">${next.available} / ${next.capacity} seats available</div>`;
}

async function initCalendar(calendarId, labelId, outputId) {
  await getWorkshops();
  const calendar = document.getElementById(calendarId);
  const label = document.getElementById(labelId);
  const output = document.getElementById(outputId);

  async function render() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    label.textContent = calendarDate.toLocaleDateString(undefined, {month: "long", year: "numeric"}).toUpperCase();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const offset = first.getDay();
    const cells = [];

    ["SUN","MON","TUE","WED","THU","FRI","SAT"].forEach(d => cells.push(`<div class="weekday">${d}</div>`));
    for (let i = 0; i < offset; i++) cells.push('<div class="day empty"></div>');

    for (let day = 1; day <= last.getDate(); day++) {
      const key = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const events = workshopData.filter(e => e.date === key);
      cells.push(`<button class="day ${events.length ? "has-event" : ""}" data-date="${key}">
        <span>${day}</span>${events.length ? `<small>${events.length} EVT</small>` : ""}
      </button>`);
    }
    calendar.innerHTML = cells.join("");

    calendar.querySelectorAll(".day[data-date]").forEach(btn => {
      btn.addEventListener("click", () => showEvents(btn.dataset.date));
    });
  }

  function showEvents(date) {
    const events = workshopData.filter(e => e.date === date);
    if (!events.length) {
      output.innerHTML = `<span class="muted">${prettyDate(date)}: NO WORKSHOPS SCHEDULED.</span>`;
      return;
    }
    output.innerHTML = events.map(e => `
      <article class="event-detail">
        <h3>${e.title.toUpperCase()}</h3>
        <p><b>DATE:</b> ${prettyDate(e.date)}<br>
        <b>TIME:</b> ${e.time}<br>
        <b>LOCATION:</b> ${e.location}<br>
        <b>AVAILABLE:</b> ${e.available} / ${e.capacity}</p>
        <p>${e.description}</p>
        <a class="button" href="#" onclick="alert('Connect this button to your signup service.'); return false;">[ SIGN UP ]</a>
      </article>`).join("");
  }

  document.getElementById("prev-month").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1); render();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1); render();
  });
  render();
}
