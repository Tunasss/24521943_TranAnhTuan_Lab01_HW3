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