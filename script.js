/**
 * IT-GUIDE (itguide.pro) — Early Access Waitlist Client
 */

// Cloudflare Worker endpoint URL
const WORKER_URL = 'https://itguide-waitlist.mikhail-kriya.workers.dev';

// Local storage key for offline / mock testing
const STORAGE_KEY = 'itguide_waitlist';

const form = document.getElementById('waitlist');
const emailInput = document.getElementById('email');
const btn = document.getElementById('btn');
const btnText = btn?.querySelector('.btn-text');
const msg = document.getElementById('msg');

function showMessage(html, type = 'success') {
  if (!msg) return;
  msg.className = 'waitlist-msg ' + type;
  msg.innerHTML = html;
  msg.style.display = 'block';
}

function hideMessage() {
  if (!msg) return;
  msg.style.display = 'none';
  msg.className = 'waitlist-msg';
  msg.innerHTML = '';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function setupResetLink() {
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn && form && emailInput && btn && btnText) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideMessage();
      form.style.display = 'block';
      emailInput.value = '';
      btn.disabled = false;
      btnText.textContent = 'NOTIFY ME';
      emailInput.focus();
    });
  }
}

if (form && emailInput && btn && btnText) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const email = emailInput.value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side email validation
    if (!email || !emailRegex.test(email)) {
      showMessage('<span class="status-symbol">✗</span> Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    // Set submitting button state
    btn.disabled = true;
    const originalText = btnText.textContent;
    btnText.textContent = 'SENDING...';

    // Local / Mock test mode (active while placeholder URL is in place)
    if (WORKER_URL.includes('<your-subdomain>')) {
      setTimeout(() => {
        try {
          const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          if (!list.some(item => (typeof item === 'string' ? item : item.email) === email)) {
            list.push({ email, addedAt: new Date().toLocaleString() });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          }
          console.log('📋 [Frontend Test] Waitlist subscribers in localStorage:', list);
          console.log('💡 Tip: Call getWaitlist() in console to view or clearWaitlist() to reset.');
        } catch (err) {
          console.error('Failed to write to localStorage:', err);
        }

        form.style.display = 'none';
        showMessage(
          '<span class="status-symbol">✓</span> ' +
          'Email <em>' + escapeHtml(email) + '</em> registered successfully!<br>' +
          '<small style="opacity: 0.8; display: block; margin-top: 6px;">' +
          '[Local Test] Email saved to browser memory. Run <code>getWaitlist()</code> in console to view.' +
          '</small>' +
          '<div style="margin-top: 10px;"><button type="button" id="reset-btn" class="reset-link">[ enter another email ]</button></div>',
          'success'
        );
        setupResetLink();
      }, 400);
      return;
    }

    // Production mode: submit to Cloudflare Worker
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        form.style.display = 'none';
        showMessage(
          '<span class="status-symbol">✓</span> ' +
          'You are on the waitlist! We will notify you at <em>' + escapeHtml(email) + '</em> on launch day.' +
          '<div style="margin-top: 10px;"><button type="button" id="reset-btn" class="reset-link">[ submit another email ]</button></div>',
          'success'
        );
        setupResetLink();
      } else {
        const data = await res.json().catch(() => ({}));
        const errDesc = data.error === 'Invalid email'
          ? 'Invalid email address.'
          : 'Could not register email. Please try again.';
        showMessage('<span class="status-symbol">✗</span> ' + errDesc, 'error');
        btn.disabled = false;
        btnText.textContent = originalText;
      }
    } catch (err) {
      showMessage('<span class="status-symbol">✗</span> Network error. Please check your connection.', 'error');
      btn.disabled = false;
      btnText.textContent = originalText;
    }
  });
}

// Global console helper functions for local testing
window.getWaitlist = () => {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  console.table(list);
  return list;
};

window.clearWaitlist = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('Waitlist cleared from localStorage (' + STORAGE_KEY + ').');
};
