function updateClock() {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toLocaleTimeString([], {hour12: false});
}
updateClock();
setInterval(updateClock, 1000);
