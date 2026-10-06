// form.js
import { createMachine } from './form-machine.js';

// Elements
const form = document.querySelector('#register-form');
const status = document.querySelector('#form-status');
const attendeesList = document.querySelector('#attendees');

/**
 * Normalizes and sanitizes plain text inputs.
 * Strips control characters and trims outer whitespace.
 * 
 * @param {string} input - Raw user input.
 * @returns {string} Sanitized string.
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim();
}

/**
 * Mock server request simulation.
 * Rejects emails ending in @fail.test after 1s delay.
 */
async function mockRegister({ email }) {
  console.count('request sent');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const cleanEmail = sanitizeText(email).toLowerCase();
  if (cleanEmail.endsWith('@fail.test')) {
    throw new Error('Registration failed: Email domain rejected.');
  }

  return { ok: true };
}

// State machine initialization
const machine = createMachine((state) => {
  if (!form) return;

  // Reflect state as data attribute on the form
  form.dataset.state = state;

  // Dynamically query all controls and toggle disabled state during submission
  const controls = form.querySelectorAll('input, button, select, textarea');
  const isSubmitting = state === 'submitting';

  for (const control of controls) {
    control.disabled = isSubmitting;
  }

  // Update accessible status announcement role and message
  if (status) {
    switch (state) {
      case 'submitting':
        status.setAttribute('role', 'status');
        status.textContent = 'Submitting registration, please wait...';
        break;
      case 'success':
        status.setAttribute('role', 'status');
        status.textContent = 'Registration successful!';
        break;
      case 'error':
        status.setAttribute('role', 'alert');
        // Keep error text set by catch block or default
        if (!status.textContent) {
          status.textContent = 'Registration failed. Please check your details and try again.';
        }
        break;
      case 'idle':
        status.setAttribute('role', 'status');
        status.textContent = '';
        break;
    }
  }
});

// Set initial state representation
if (form) {
  form.dataset.state = machine.state;

  // Form submit handler
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. Validate form fields before state transition
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // 2. Lock state machine to 'submitting' (prevents double submit synchronously)
    if (!machine.go('submitting')) {
      return;
    }

    const formData = new FormData(form);
    const rawName = String(formData.get('name') || '');
    const rawEmail = String(formData.get('email') || '');
    const rawNotes = String(formData.get('notes') || '');

    const cleanName = sanitizeText(rawName);
    const cleanEmail = sanitizeText(rawEmail);
    const cleanNotes = sanitizeText(rawNotes);

    const payload = {
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: cleanName,
      email: cleanEmail,
      notes: cleanNotes,
    };

    try {
      await mockRegister(payload);
      machine.go('success');

      // Add user to recent attendees safely with textContent (zero XSS sink)
      if (attendeesList && cleanName) {
        const li = document.createElement('li');
        li.textContent = `${cleanName} (${cleanEmail})`;
        attendeesList.prepend(li);
      }

      form.reset();
    } catch (err) {
      if (err instanceof Error) {
        if (status) status.textContent = err.message;
      }
      machine.go('error');
    }
  });

  // Reset state to 'idle' when user modifies inputs after error or success
  form.addEventListener('input', () => {
    if (machine.state === 'error' || machine.state === 'success') {
      machine.go('idle');
    }
  });
}