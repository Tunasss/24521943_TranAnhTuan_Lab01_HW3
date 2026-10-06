// countdown.js

/**
 * Calculates remaining time components between now and a target timestamp.
 * 
 * @param {number} targetMs - Target epoch time in milliseconds.
 * @param {number} [nowMs=Date.now()] - Current epoch time in milliseconds.
 * @returns {{ total: number, days: number, hours: number, minutes: number, seconds: number, done: boolean }}
 */
export function getRemaining(targetMs, nowMs = Date.now()) {
  const total = Math.max(0, targetMs - nowMs);
  const done = total === 0;

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds, done };
}

/**
 * Starts a self-aligning countdown toward a UTC ISO 8601 target.
 * Fires `onTick` immediately on start and repeats aligned to the next second until finished or stopped.
 * 
 * @param {string} targetIso - ISO 8601 string (e.g. "2026-12-31T23:59:59Z").
 * @param {(state: ReturnType<typeof getRemaining>) => void} onTick - Callback receiving remaining time state.
 * @returns {() => void} Function to manually stop the timer and clean up listeners.
 */
export function startCountdown(targetIso, onTick) {
  if (typeof targetIso !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(targetIso)) {
    throw new TypeError(`Target ISO string must include a UTC offset (e.g., 'Z' or '+07:00'): "${targetIso}"`);
  }

  const targetMs = Date.parse(targetIso);

  if (Number.isNaN(targetMs)) {
    throw new TypeError(`Invalid ISO 8601 target: "${targetIso}"`);
  }

  let timerId = null;
  let active = true;

  const clearTimer = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  // Test E: Handler cập nhật ngay khi tab hiển thị lại
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && active) {
      tick();
    }
  };

  const stop = () => {
    if (!active) return;
    active = false;
    clearTimer();

    // Test E: Gỡ bỏ event listener khi dừng timer
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  const scheduleNextTick = (total) => {
    clearTimer();
    if (!active || total <= 0) return;

    const delay = (total % 1000) + 1;
    timerId = setTimeout(tick, delay);
  };

  const tick = () => {
    if (!active) return;

    const remaining = getRemaining(targetMs);
    onTick(remaining);

    if (remaining.done) {
      stop();
    } else {
      scheduleNextTick(remaining.total);
    }
  };

  // Test E: Đăng ký listener visibilitychange (kiểm tra môi trường browser trước)
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  tick();

  return stop;
}