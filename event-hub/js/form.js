// form.js
import { createMachine, normalize } from './form-machine.js';

// Elements
const form = document.querySelector('#register-form');
const status = document.querySelector('#form-status');
const attendeesList = document.querySelector('#attendees');

// Max lengths mirror the maxlength attributes in index.html
const MAX = { name: 50, email: 100, notes: 200 };

/**
 * Mock server request simulation.
 * Rejects emails ending in @fail.test after 1s delay.
 */
async function mockRegister({ email }) {
  console.count('request sent');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const cleanEmail = normalize(email, MAX.email).toLowerCase();
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
    const cleanName = normalize(formData.get('name') ?? '', MAX.name);
    const cleanEmail = normalize(formData.get('email') ?? '', MAX.email);
    const cleanNotes = normalize(formData.get('notes') ?? '', MAX.notes);

    const payload = {
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: cleanName,
      email: cleanEmail,
      notes: cleanNotes,
    };

    try {
      await mockRegister(payload);
      machine.go('success');

      // Thank-you message with the user's name (textContent only, never innerHTML)
      if (status) status.textContent = `Thanks, ${cleanName}!`;

      // Recent attendees: name + notes, built with createElement + textContent
      if (attendeesList) {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = cleanName;
        li.append(strong);
        if (cleanNotes) {
          const note = document.createElement('span');
          note.textContent = ` — ${cleanNotes}`;
          li.append(note);
        }
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