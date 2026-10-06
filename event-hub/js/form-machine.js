// form-machine.js

const TRANSITIONS = {
  idle: ['submitting'],
  submitting: ['success', 'error'],
  success: ['idle'],
  error: ['submitting', 'idle']
};

export function createMachine(onChange) {
  let currentState = 'idle';

  return {
    get state() {
      return currentState;
    },

    go(next) {
      const allowedNext = TRANSITIONS[currentState];

      if (allowedNext && allowedNext.includes(next)) {
        const previousState = currentState;
        currentState = next;

        if (typeof onChange === 'function') {
          onChange(currentState, previousState);
        }

        return true;
      }

      return false;
    }
  };
}

/**
 * Normalizes untrusted text: strips control characters, collapses whitespace,
 * trims and limits the length.
 *
 * @param {unknown} value - Raw user input.
 * @param {number} max - Maximum allowed length.
 * @returns {string}
 */
export function normalize(value, max) {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Escapes HTML special characters. Only for the rare case of string-building;
 * user data is rendered with textContent instead.
 *
 * @param {string} s
 * @returns {string}
 */
export const escapeHTML = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
