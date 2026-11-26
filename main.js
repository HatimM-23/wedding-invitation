
/* Wedding invitation interactions. Critical artwork is prepared before opening. */
const landing = document.getElementById('landing');
const sceneImage = document.getElementById('sceneImage');
const openTarget = document.getElementById('openTarget');
const invitationSite = document.getElementById('invitationSite');
const readmeButton = document.getElementById('readmeButton');
const rsvpButton = document.getElementById('rsvpButton');
const tryAgainButton = document.getElementById('tryAgainButton');
const tryAgainModal = document.getElementById('tryAgainModal');
const letterModal = document.getElementById('letterModal');
const rsvpModal = document.getElementById('rsvpModal');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpFormView = document.getElementById('rsvpFormView');
const thankYouView = document.getElementById('thankYouView');

// Decode an image before it is needed for a visible animation.
function prepareImage(src) {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;

  if (typeof image.decode === 'function') {
    return image.decode().then(() => image).catch(() => {
      if (image.complete && image.naturalWidth) return image;

      return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener('error', reject, { once: true });
      });
    });
  }

  return new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth) return resolve(image);
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', reject, { once: true });
  });
}

const landingReady = (typeof sceneImage.decode === 'function'
  ? sceneImage.decode()
  : new Promise((resolve, reject) => {
      if (sceneImage.complete && sceneImage.naturalWidth) resolve();
      else {
        sceneImage.addEventListener('load', resolve, { once: true });
        sceneImage.addEventListener('error', reject, { once: true });
      }
    })).catch(() => {
      if (!sceneImage.complete || !sceneImage.naturalWidth) {
        throw new Error('Landing artwork failed to load.');
      }
    });

// Prepare the two assets required for the opening sequence.
const openingReady = Promise.all([
  prepareImage('./assets/opening-composition.webp'),
  prepareImage('./assets/wedding-car.webp')
]);

// Preserve the original reveal timing.
Promise.all([
  landingReady,
  openingReady,
  new Promise(resolve => window.setTimeout(resolve, 1900))
])
  .then(() => {
    openTarget.disabled = false;
  })
  .catch(error => {
    console.error(error);
    openTarget.disabled = false;
  });

let openingInProgress = false;

openTarget.addEventListener('click', async () => {
  if (openTarget.disabled || openingInProgress) return;

  openingInProgress = true;
  openTarget.disabled = true;

  try {
    await openingReady;

    const composition = document.getElementById('openingComposition');
    const car = document.getElementById('weddingCar');

    await Promise.all([
      typeof composition.decode === 'function'
        ? composition.decode()
        : Promise.resolve(),
      typeof car.decode === 'function'
        ? car.decode()
        : Promise.resolve()
    ]);

    landing.classList.add('is-opened');
    invitationSite.classList.add('is-visible', 'is-opening');
    invitationSite.setAttribute('aria-hidden', 'false');
    invitationSite.inert = true;

    document.body.classList.add('is-car-running');
    window.scrollTo({ top: 0, behavior: 'instant' });

    window.setTimeout(() => {
      invitationSite.classList.remove('is-opening');
      invitationSite.classList.add('is-settled');

      // Enable scrolling and interactions, including Read Me.
      invitationSite.inert = false;
      document.body.classList.remove('is-car-running');

      // Reveal all scroll-dependent elements automatically.
      invitationSite.querySelectorAll('.reveal-on-scroll').forEach(element => {
        element.classList.add('is-in-view');
      });

    }, 4000);

    document.dispatchEvent(new CustomEvent('wedding:open-invitation'));

  } catch (error) {
    console.error('The invitation opening artwork could not be prepared:', error);
    openingInProgress = false;
    openTarget.disabled = false;
  }
});

// Accessible modal helpers.
let previousFocus = null;

function openModal(modal) {
  if (!modal) return;

  previousFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  modal.querySelector('button,input,textarea,select')
    ?.focus({ preventScroll: true });
}

function closeModal(modal) {
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';

  previousFocus?.focus?.({ preventScroll: true });
}

readmeButton?.addEventListener('click', () => openModal(letterModal));

rsvpButton?.addEventListener('click', () => {
  rsvpFormView.hidden = false;
  thankYouView.hidden = true;
  rsvpForm.reset();

  if (rsvpFormError) rsvpFormError.hidden = true;

  setRsvpSubmitting(false);
  openModal(rsvpModal);
});

tryAgainButton?.addEventListener('click', () => openModal(tryAgainModal));

document.querySelectorAll('[data-close-modal]').forEach(button => {
  button.addEventListener('click', () => {
    closeModal(button.closest('.modal-backdrop'));
  });
});

[letterModal, rsvpModal, tryAgainModal]
  .filter(Boolean)
  .forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal(modal);
    });
  });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    [letterModal, rsvpModal, tryAgainModal]
      .filter(Boolean)
      .forEach(modal => {
        if (!modal.hidden) closeModal(modal);
      });
  }
});

// Google Sheets RSVP integration.
// Keep your deployed Google Apps Script Web App URL here.
const RSVP_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxd2l0pNQdUAKRu9d-gumHrqz3GzcHuIdDFL1vZJfZs5iuzrlsLyPrjVK-x7TDFQX0x/exec';

const rsvpSubmitFrame = document.getElementById('rsvpSubmitFrame');
const rsvpFormError = document.getElementById('rsvpFormError');
const rsvpSubmitButton = rsvpForm?.querySelector('.submit-rsvp');

let activeRsvpNonce = null;
let rsvpSubmissionPending = false;

function setRsvpSubmitting(isSubmitting) {
  rsvpSubmissionPending = isSubmitting;

  if (rsvpSubmitButton) {
    rsvpSubmitButton.disabled = isSubmitting;
    rsvpSubmitButton.innerHTML = isSubmitting
      ? 'Sending response…'
      : 'Send response <span aria-hidden="true">↗</span>';
  }
}

function showRsvpError(message) {
  if (rsvpFormError) {
    rsvpFormError.textContent = message;
    rsvpFormError.hidden = false;
  }

  setRsvpSubmitting(false);
}

function submitRsvpThroughAppsScript(payload) {
  return new Promise((resolve, reject) => {
    if (!RSVP_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')) {
      reject(new Error(
        'The RSVP form is not connected yet. Please contact the hosts directly.'
      ));
      return;
    }

    const nonce = window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    activeRsvpNonce = nonce;

    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = RSVP_WEB_APP_URL;
    postForm.target = rsvpSubmitFrame.name;
    postForm.acceptCharset = 'UTF-8';
    postForm.style.display = 'none';

    const values = { ...payload, nonce };

    Object.entries(values).forEach(([name, value]) => {
      const input = document.createElement('input');

      input.type = 'hidden';
      input.name = name;
      input.value = String(value ?? '');

      postForm.appendChild(input);
    });

    const timeout = window.setTimeout(() => {
      cleanup();

      reject(new Error(
        'We could not confirm your response. Please check your connection and try again.'
      ));
    }, 45000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      postForm.remove();
      activeRsvpNonce = null;
    }

    function onMessage(event) {
      // Apps Script may wrap its response in a nested Google iframe.
      // The unique nonce identifies the response for this submission.
      const data = event.data;

      if (
        !data ||
        data.type !== 'wedding-rsvp-result' ||
        data.nonce !== nonce
      ) {
        return;
      }

      cleanup();

      if (data.ok) {
        resolve(data);
      } else {
        reject(new Error(
          data.message || 'We could not save your response. Please try again.'
        ));
      }
    }

    window.addEventListener('message', onMessage);
    document.body.appendChild(postForm);
    postForm.submit();
  });
}

// A successful RSVP becomes a full-screen thank-you state.
// Browser Back returns the guest to the invitation landing page.
const thankYouScreen = document.getElementById('thankYouScreen');

function showThankYouScreen() {
  if (rsvpModal) rsvpModal.hidden = true;

  document.body.style.overflow = 'hidden';

  if (thankYouScreen) {
    thankYouScreen.hidden = false;
  }

  history.pushState(
    { weddingRsvpComplete: true },
    '',
    '#thank-you'
  );

  thankYouScreen?.focus?.({ preventScroll: true });
}

function returnToLandingPage() {
  if (thankYouScreen) thankYouScreen.hidden = true;
  if (rsvpModal) rsvpModal.hidden = true;
  if (letterModal) letterModal.hidden = true;
  if (tryAgainModal) tryAgainModal.hidden = true;

  document.body.style.overflow = '';
  document.body.classList.remove('is-car-running');

  landing?.classList.remove('is-opened');

  invitationSite?.classList.remove(
    'is-visible',
    'is-opening',
    'is-settled'
  );

  invitationSite?.setAttribute('aria-hidden', 'true');

  if (invitationSite) invitationSite.inert = true;

  openTarget.disabled = false;
  openingInProgress = false;

  rsvpForm?.reset();

  rsvpFormView.hidden = false;
  thankYouView.hidden = true;

  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('popstate', () => {
  if (!thankYouScreen || thankYouScreen.hidden) return;

  returnToLandingPage();

  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  );
});

// RSVP form submission.
rsvpForm?.addEventListener('submit', async event => {
  event.preventDefault();

  if (rsvpSubmissionPending || !rsvpForm.reportValidity()) return;

  const arrival = document.getElementById('arrivalDate');
  const departure = document.getElementById('departureDate');

  if (
    arrival.value &&
    departure.value &&
    departure.value < arrival.value
  ) {
    departure.setCustomValidity(
      'Departure date must be on or after the arrival date.'
    );

    departure.reportValidity();
    departure.setCustomValidity('');
    return;
  }

  // Validate arrival location.
  const arrivalLocation = document.getElementById('arrivalLocation');

  if (!arrivalLocation || !arrivalLocation.value.trim()) {
    arrivalLocation?.setCustomValidity(
      'Please enter your arrival location.'
    );

    arrivalLocation?.reportValidity();
    arrivalLocation?.setCustomValidity('');
    return;
  }

  // Validate and normalise the WhatsApp number.
  const phone = document
    .getElementById('whatsappNumber')
    .value.replace(/\D/g, '');

  if (!/^\d{10}$/.test(phone)) {
    document
      .getElementById('whatsappNumber')
      .setCustomValidity(
        'Enter a valid 10-digit WhatsApp number.'
      );

    document
      .getElementById('whatsappNumber')
      .reportValidity();

    document
      .getElementById('whatsappNumber')
      .setCustomValidity('');

    return;
  }

  if (rsvpFormError) rsvpFormError.hidden = true;

  setRsvpSubmitting(true);

  // IMPORTANT: arrivalLocation is included in this payload.
  const payload = {
    guestName: document.getElementById('guestName').value.trim(),
    whatsappNumber: phone,
    arrivalLocation: arrivalLocation.value.trim(),
    arrivalDate: arrival.value,
    departureDate: departure.value,
    guestCount: document.getElementById('guestCount').value,
    transportMode: document.getElementById('transportMode').value.trim(),
    website: document.getElementById('rsvpWebsite')?.value || ''
  };

  try {
    // Wait for Apps Script to confirm the response was saved.
    await submitRsvpThroughAppsScript(payload);

    setRsvpSubmitting(false);
    showThankYouScreen();

  } catch (error) {
    console.error('RSVP submission failed:', error);

    showRsvpError(
      error.message || 'Something went wrong. Please try again.'
    );
  }
});

// One-time fade-and-rise for the event timeline.
const timelineArtwork = document.querySelector('.continuous-timeline-art');

if (timelineArtwork) {
  const timelineObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          timelineObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  timelineObserver.observe(timelineArtwork);
}
