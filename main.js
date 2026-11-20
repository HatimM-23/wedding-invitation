/* Wedding invitation interactions. Edit timings and behaviour here. */
const landing = document.getElementById('landing');
const openTarget = document.getElementById('openTarget');
const invitationSite = document.getElementById('invitationSite');
const openingCollage = document.getElementById('openingCollage');
const readmeButton = document.getElementById('readmeButton');
const rsvpButton = document.getElementById('rsvpButton');
const tryAgainButton = document.getElementById('tryAgainButton');
const tryAgainModal = document.getElementById('tryAgainModal');
const letterModal = document.getElementById('letterModal');
const rsvpModal = document.getElementById('rsvpModal');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpFormView = document.getElementById('rsvpFormView');
const thankYouView = document.getElementById('thankYouView');
const timeline = document.getElementById('timeline');
const timelinePathDraw = document.getElementById('timelinePathDraw');

// Keep the approved landing page unchanged; enable opening only after its reveal finishes.
window.addEventListener('load', () => {
  window.setTimeout(() => { openTarget.disabled = false; }, 2850);
});

// The invitation artwork fades in as one image while the transparent car crosses it.
openTarget.addEventListener('click', () => {
  if (openTarget.disabled) return;
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
});

// Accessible modal helpers: close control, backdrop click and Escape key.
let previousFocus=null;
function openModal(modal){previousFocus=document.activeElement;modal.hidden=false;document.body.style.overflow='hidden';modal.querySelector('button,input,textarea,select')?.focus({preventScroll:true});}
function closeModal(modal){modal.hidden=true;document.body.style.overflow='';previousFocus?.focus?.({preventScroll:true});}
readmeButton?.addEventListener('click',()=>openModal(letterModal));
rsvpButton?.addEventListener('click',()=>{
  rsvpFormView.hidden=false; thankYouView.hidden=true; rsvpForm.reset();
  openModal(rsvpModal);
});
tryAgainButton?.addEventListener('click',()=>openModal(tryAgainModal));
document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>closeModal(button.closest('.modal-backdrop'))));
[letterModal,rsvpModal,tryAgainModal].filter(Boolean).forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModal(modal);}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')[letterModal,rsvpModal,tryAgainModal].filter(Boolean).forEach(modal=>{if(!modal.hidden)closeModal(modal);});});

// Demo RSVP: shows a final thank-you state. It does not persist responses yet.
rsvpForm?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!rsvpForm.reportValidity()) return;
  const arrival = document.getElementById('arrivalDate');
  const departure = document.getElementById('departureDate');
  if (arrival.value && departure.value && departure.value < arrival.value) {
    departure.setCustomValidity('Departure date must be on or after the arrival date.');
    departure.reportValidity();
    departure.setCustomValidity('');
    return;
  }
  rsvpFormView.hidden=true;
  thankYouView.hidden=false;
  rsvpModal.querySelector('.modal-close')?.setAttribute('aria-label','Close thank-you message');
});

// Scroll reveals for later sections.
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-in-view');revealObserver.unobserve(entry.target);}}),{threshold:.16});
document.querySelectorAll('.reveal-on-scroll').forEach(element=>revealObserver.observe(element));

// Draw the gold timeline path when it enters view.
if(timeline && timelinePathDraw){
  const length=timelinePathDraw.getTotalLength(); timelinePathDraw.style.strokeDasharray=String(length); timelinePathDraw.style.strokeDashoffset=String(length);
  const pathObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){timelinePathDraw.style.transition='stroke-dashoffset 2.8s linear';timelinePathDraw.style.strokeDashoffset='0';timeline.classList.add('is-drawing');pathObserver.disconnect();}}),{threshold:.15}); pathObserver.observe(timeline);
}
