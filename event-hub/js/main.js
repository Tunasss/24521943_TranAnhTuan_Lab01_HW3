import { startCountdown } from "./countdown.js";
import "./form.js";

const eventTime = document.querySelector("#event-time");
const target = eventTime?.getAttribute("datetime");

if (eventTime && target) {
  eventTime.textContent = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(target));

  startCountdown(target, ({ days, hours, minutes, seconds }) => {
    const dEl = document.querySelector("#cd-days");
    const hEl = document.querySelector("#cd-hours");
    const mEl = document.querySelector("#cd-minutes");
    const sEl = document.querySelector("#cd-seconds");

    if (dEl) dEl.textContent = String(days).padStart(2, "0");
    if (hEl) hEl.textContent = String(hours).padStart(2, "0");
    if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
    if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
  });
}
