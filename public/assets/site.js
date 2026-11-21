const form = document.querySelector('#project-form');
if (form) {
  const button = form.querySelector('button[type=submit]');
  const status = document.querySelector('#form-status');
  const widget = document.querySelector('#turnstile-widget');
  const requestID = form.elements.request_id;
  requestID.value = crypto.randomUUID();
  let turnstileID;
  let ready = false;
  const message = (text, type = '') => { status.textContent = text; status.className = `form-status ${type}`; };
  const resetChallenge = () => { if (turnstileID !== undefined) window.turnstile?.reset(turnstileID); };
  async function initialize() {
    try {
      const response = await fetch('/api/form-config', { cache: 'no-store' });
      const config = await response.json();
      if (!response.ok || !config.ready || !config.sitekey) throw new Error('not-ready');
      await new Promise((resolve, reject) => {
        window.heartlandTurnstileReady = resolve;
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=heartlandTurnstileReady&render=explicit';
        script.async = true; script.onerror = reject; document.head.append(script);
      });
      turnstileID = window.turnstile.render(widget, { sitekey: config.sitekey, action: 'project-inquiry', theme: 'light' });
      ready = true; button.disabled = false; message('Your details will be used to follow up about this request.');
    } catch {
      message('Project inquiries are not open yet. Please check back soon.');
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || !form.reportValidity()) return;
    const files = [...form.elements.photos.files];
    if (form.elements.photos.required && files.length === 0) { message('Please add at least one project or inspiration photo.', 'error'); return; }
    if (files.length > 3 || files.some(f => f.size > 3 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(f.type))) {
      message('Please choose up to 3 JPG, PNG, or WebP images, no larger than 3 MB each.', 'error'); return;
    }
    const data = new FormData(form);
    if (!data.get('cf-turnstile-response')) { message('Please complete the security check before sending.', 'error'); return; }
    button.disabled = true; button.textContent = 'Sending your project…'; message('Please keep this page open while your request is saved.');
    try {
      const response = await fetch('/api/leads', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request could not be saved. Please try again.');
      form.reset(); requestID.value = crypto.randomUUID(); resetChallenge();
      message(`Thanks for sharing your project. Your reference is ${result.reference}. We will follow up to discuss the details.`, 'success');
    } catch (error) {
      // Keep the same request ID after a failed response so retrying cannot duplicate a saved inquiry.
      message(error.message || 'We could not confirm your submission. Please try again; your details remain in the form.', 'error'); resetChallenge();
    } finally { button.disabled = false; button.textContent = 'Request a contractor connection'; }
  });
  initialize();
}

for(const search of document.querySelectorAll('[data-area-search]')){
  const directory=search.closest('.location-directory'),items=[...directory.querySelectorAll('[data-area-item]')];
  search.addEventListener('input',()=>{
    const term=search.value.trim().toLocaleLowerCase();let count=0;
    for(const item of items){item.hidden=!item.dataset.search.toLocaleLowerCase().includes(term);if(!item.hidden)count++;}
    for(const section of directory.querySelectorAll('.state-directory'))section.hidden=![...section.querySelectorAll('[data-area-item]')].some(item=>!item.hidden);
    directory.querySelector('[data-area-status]').textContent=`${count} ${count===1?'community matches':'communities match'}. Your inquiry is welcome even if your location is not listed.`;
    directory.querySelector('.directory-no-results').hidden=count!==0;
  });
}
