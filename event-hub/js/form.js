// form.js
import { createMachine } from './form-machine.js';

// Elements
const form = document.querySelector('#register-form');
const status = document.querySelector('#form-status');
const formControls = form.querySelectorAll('input, button, select, textarea');

// Mock server request
async function mockRegister({ email }) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (email.trim().toLowerCase().endsWith('@fail.test')) {
    throw new Error('Registration failed: Email domain rejected.');
  }

  return { ok: true };
}

// State machine initialization
const machine = createMachine((state) => {
  // Reflect state as a data attribute
  form.dataset.state = state;

  // Toggle inputs availability based on state
  const isSubmitting = state === 'submitting';
  for (const control of formControls) {
    control.disabled = isSubmitting;
  }

  // Update status messages
  switch (state) {
    case 'submitting':
      status.textContent = 'Submitting registration, please wait...';
      break;
    case 'success':
      status.textContent = 'Registration successful!';
      break;
    case 'error':
      status.textContent = 'Registration failed. Please check your details and try again.';
      break;
    case 'idle':
      status.textContent = '';
      break;
  }
});

// Set initial state representation
form.dataset.state = machine.state;

// Form submit handler
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!machine.go('submitting')) {
    return;
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    await mockRegister(payload);
    machine.go('success');
    form.reset();
  } catch (err) {
    machine.go('error');
    if (err instanceof Error) {
      status.textContent = err.message;
    }
  }
});

// Reset machine to 'idle' when the user modifies any field after an error or success
form.addEventListener('input', () => {
  if (machine.state === 'error' || machine.state === 'success') {
    machine.go('idle');
  }
});