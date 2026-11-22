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

// Decode an image before it is needed for a visible animation. The load fallback
// supports browsers where HTMLImageElement.decode() is unavailable.
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
      // A failed landing image should not permanently trap the visitor.
      if (!sceneImage.complete || !sceneImage.naturalWidth) throw new Error('Landing artwork failed to load.');
    });

// Fetch and decode only the two assets required for the opening sequence.
// Other long-page and modal artwork is allowed to load when it is needed.
const openingReady = Promise.all([
  prepareImage('./assets/opening-composition.webp'),
  prepareImage('./assets/wedding-car.webp')
]);

// Keep the original reveal beat, but don't wait for unrelated images or window.load.
Promise.all([landingReady, openingReady, new Promise(resolve => window.setTimeout(resolve, 1900))])
  .then(() => { openTarget.disabled = false; })
  .catch(error => {
    console.error(error);
    // If the preloader fails, retain a usable landing page and let the click
    // handler make one final attempt to prepare the opening assets.
    openTarget.disabled = false;
  });

let openingInProgress = false;
openTarget.addEventListener('click', async () => {
  if (openTarget.disabled || openingInProgress) return;
  openingInProgress = true;
  openTarget.disabled = true;

  try {
    // Final readiness check immediately before starting the CSS animation.
    await openingReady;
    const composition = document.getElementById('openingComposition');
    const car = document.getElementById('weddingCar');
    await Promise.all([
      typeof composition.decode === 'function' ? composition.decode() : Promise.resolve(),
      typeof car.decode === 'function' ? car.decode() : Promise.resolve()
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
      invitationSite.inert = false;
      document.body.classList.remove('is-car-running');
    }, 8150);
    document.dispatchEvent(new CustomEvent('wedding:open-invitation'));
  } catch (error) {
    console.error('The invitation opening artwork could not be prepared:', error);
    openingInProgress = false;
    openTarget.disabled = false;
  }
});

// Accessible modal helpers: close control, backdrop click and Escape key.
let previousFocus = null;
function openModal(modal) {
  if (!modal) return;
  previousFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modal.querySelector('button,input,textarea,select')?.focus({ preventScroll: true });
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
  openModal(rsvpModal);
});
tryAgainButton?.addEventListener('click', () => openModal(tryAgainModal));
document.querySelectorAll('[data-close-modal]').forEach(button =>
  button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop')))
);
[letterModal, rsvpModal, tryAgainModal].filter(Boolean).forEach(modal =>
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal); })
);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    [letterModal, rsvpModal, tryAgainModal].filter(Boolean).forEach(modal => {
      if (!modal.hidden) closeModal(modal);
    });
  }
});

// Demo RSVP: shows a final thank-you state. It does not persist responses yet.
rsvpForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;
  const arrival = document.getElementById('arrivalDate');
  const departure = document.getElementById('departureDate');
  if (arrival.value && departure.value && departure.value < arrival.value) {
    departure.setCustomValidity('Departure date must be on or after the arrival date.');
    departure.reportValidity();
    departure.setCustomValidity('');
    return;
  }
  rsvpFormView.hidden = true;
  thankYouView.hidden = false;
  rsvpModal.querySelector('.modal-close')?.setAttribute('aria-label', 'Close thank-you message');
});

// Scroll reveals for later sections.
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('is-in-view');
    revealObserver.unobserve(entry.target);
  }
}), { threshold: .16 });
document.querySelectorAll('.reveal-on-scroll').forEach(element => revealObserver.observe(element));
