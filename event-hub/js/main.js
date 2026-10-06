import { startCountdown } from "./countdown.js";

const eventTime = document.querySelector("#event-time");
const target = eventTime?.getAttribute("datetime");

if (eventTime && target) {
	eventTime.textContent = new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(target));

	startCountdown(target, ({ days, hours, minutes, seconds }) => {
		document.querySelector("#cd-days").textContent = String(days);
		document.querySelector("#cd-hours").textContent = String(hours);
		document.querySelector("#cd-minutes").textContent = String(minutes);
		document.querySelector("#cd-seconds").textContent = String(seconds);
	});
}
