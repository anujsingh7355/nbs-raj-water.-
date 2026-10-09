/**
 * =========================================================================
 * NBS AQUAVEDA - PROGRESSIVE WEB APP (PWA) LOGIC
 * =========================================================================
 * Handles:
 * - Service Worker registration (HTTPS and localhost)
 * - Native beforeinstallprompt capture & triggering
 * - Universal fallback Install Guide Modal (Android, iOS Safari, Desktop PC)
 * - Standalone app detection to toggle Install UI appropriately
 * =========================================================================
 */

let deferredInstallPrompt = null;

// Helper: Check if app is already running in standalone/installed mode
function isAppInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Register Service Worker with relative path
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);
const isSecureOrigin = window.location.protocol === 'https:' || isLocalhost;

if ('serviceWorker' in navigator && isSecureOrigin) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('✅ NBS AQUAVEDA ServiceWorker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ NBS AQUAVEDA ServiceWorker registration failed:', err);
      });
  });
} else if (window.location.protocol === 'file:') {
  console.info('ℹ️ Note: Running from file://. For full PWA install prompt, run via local server: npm start -> http://localhost:3000');
}

// Update install buttons and banner visibility
function updateInstallUi() {
  const headerInstallBtn = document.getElementById('headerInstallBtn');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  const mobileNavInstallBtn = document.getElementById('mobileNavInstallBtn');
  const installBanner = document.getElementById('pwaInstallBanner');

  if (isAppInstalled()) {
    // Hide all install UI when already installed as an app
    if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
    if (heroInstallBtn) heroInstallBtn.classList.add('hidden');
    if (mobileNavInstallBtn) mobileNavInstallBtn.classList.add('hidden');
    if (installBanner) installBanner.classList.add('hidden');
    return;
  }

  // Ensure header, hero, and mobile nav buttons are visible in regular browser
  if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');
  if (heroInstallBtn) heroInstallBtn.classList.remove('hidden');
  if (mobileNavInstallBtn) mobileNavInstallBtn.classList.remove('hidden');

  // Show floating banner if not dismissed in this session
  if (installBanner && !sessionStorage.getItem('pwa_banner_dismissed')) {
    installBanner.classList.remove('hidden');
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateInstallUi);
} else {
  updateInstallUi();
}

// Listen for browser's native install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent immediate mini-infobar on mobile Chrome
  e.preventDefault();
  // Stash the event so it can be triggered on user button click
  deferredInstallPrompt = e;
  console.log('💡 beforeinstallprompt event captured and ready.');
  updateInstallUi();
});

// Trigger install prompt on user click
function triggerPwaInstall() {
  if (isAppInstalled()) {
    if (typeof showToast === 'function') {
      showToast('NBS AQUAVEDA App is already installed on your device! ✅', 'info');
    }
    return;
  }

  // 1. If native install prompt was captured, trigger native browser prompt
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        if (typeof showToast === 'function') {
          showToast('Thank you for installing NBS AQUAVEDA App! 🎉', 'success');
        }
        dismissPwaBanner();
      }
      deferredInstallPrompt = null;
    });
    return;
  }

  // 2. Fallback: Show interactive guide modal for the user's specific platform
  openInstallGuideModal();
}

// Dismiss floating install banner
function dismissPwaBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
  sessionStorage.setItem('pwa_banner_dismissed', 'true');
}

// Listener when app is successfully installed
window.addEventListener('appinstalled', () => {
  console.log('🎉 NBS AQUAVEDA PWA was installed successfully');
  deferredInstallPrompt = null;
  dismissPwaBanner();
  const headerInstallBtn = document.getElementById('headerInstallBtn');
  if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  if (heroInstallBtn) heroInstallBtn.classList.add('hidden');
  const mobileNavInstallBtn = document.getElementById('mobileNavInstallBtn');
  if (mobileNavInstallBtn) mobileNavInstallBtn.classList.add('hidden');
  if (typeof showToast === 'function') {
    showToast('NBS AQUAVEDA App successfully installed! 🚀', 'success');
  }
});

/**
 * =========================================================================
 * INSTALL GUIDE MODAL (Universal Step-by-Step Instructions)
 * =========================================================================
 */
function openInstallGuideModal() {
  const modal = document.getElementById('installGuideModal');
  const body = document.getElementById('installGuideBody');
  if (!modal || !body) return;

  const userAgent = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(userAgent);
  const isFileProtocol = window.location.protocol === 'file:';
  const isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter/i.test(userAgent);

  const isLocalIp = Boolean(
    window.location.hostname.match(/^192\.168\./) ||
    window.location.hostname.match(/^10\./) ||
    window.location.hostname.match(/^172\.(?:1[6-9]|2\d|3[01])\./)
  );
  const isInsecureHttp = window.location.protocol === 'http:' && isLocalIp;

  let defaultTab = 'desktop';
  if (isAndroid) defaultTab = 'android';
  else if (isIos) defaultTab = 'ios';

  let alertNoticeHtml = '';

  if (isInAppBrowser) {
    alertNoticeHtml = `
      <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
        <strong style="color: #991B1B; font-size: 0.95rem; display: block; margin-bottom: 4px;">
          ⚠️ In-App Browser Detected (WhatsApp / Social App)
        </strong>
        <p style="margin: 0; font-size: 0.84rem; color: #7F1D1D; line-height: 1.45;">
          Aap link ko WhatsApp ya kisi app ke andar open kar rahe hain. App install karne ke liye upar <strong>3 dots (⋮)</strong> tap karke <strong>"Open in Chrome" (या Safari)</strong> select karein.
        </p>
      </div>
    `;
  } else if (isInsecureHttp) {
    alertNoticeHtml = `
      <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
        <strong style="color: #92400E; font-size: 0.95rem; display: block; margin-bottom: 4px;">
          📱 Mobile Wi-Fi IP Notice (${window.location.hostname})
        </strong>
        <p style="margin: 0; font-size: 0.84rem; color: #78350F; line-height: 1.45;">
          Android Chrome me direct 1-click install hone ke liye <strong>HTTPS (🔒) connection</strong> zaroori hota hai. Local IP (<code>http://${window.location.hostname}</code>) par Chrome native prompt block kar deta hai.<br/><br/>
          <strong>Phone me install karne ke tareeqe:</strong><br/>
          1. Chrome ke upar right me <strong>3 dots (⋮)</strong> tap karein aur <strong>"Add to Home screen" (होम स्क्रीन में जोड़ें)</strong> par tap karein.<br/>
          2. Ya fir is website ko <strong>Vercel (HTTPS)</strong> par deploy karein, jisse phone par direct install button chal jayega!
        </p>
      </div>
    `;
  } else if (isFileProtocol) {
    alertNoticeHtml = `
      <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
        <strong style="color: #92400E; font-size: 0.92rem; display: block; margin-bottom: 4px;">
          ⚠️ Local File Notice (file:// protocol)
        </strong>
        <p style="margin: 0; font-size: 0.84rem; color: #78350F; line-height: 1.45;">
          Browser me direct install sirf <strong>http://localhost:3000</strong> ya HTTPS domain par kaam karta hai. Terminal me <code>npm start</code> run karke kholein.
        </p>
      </div>
    `;
  }

  body.innerHTML = `
    ${alertNoticeHtml}

    <p style="font-size: 0.88rem; color: var(--text-light); margin-bottom: 14px;">
      NBS AQUAVEDA ko apne phone ya computer par app ki tarah install karne ke aasan steps:
    </p>

    <!-- Tabs Header -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; overflow-x: auto;">
      <button type="button" class="install-tab-btn ${defaultTab === 'android' ? 'active' : ''}" onclick="switchInstallTab('android')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'android' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'android' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'android' ? '#ffffff' : 'var(--text-main)'};">
        📱 Android
      </button>
      <button type="button" class="install-tab-btn ${defaultTab === 'ios' ? 'active' : ''}" onclick="switchInstallTab('ios')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'ios' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'ios' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'ios' ? '#ffffff' : 'var(--text-main)'};">
        🍏 iPhone / iOS
      </button>
      <button type="button" class="install-tab-btn ${defaultTab === 'desktop' ? 'active' : ''}" onclick="switchInstallTab('desktop')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'desktop' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'desktop' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'desktop' ? '#ffffff' : 'var(--text-main)'};">
        💻 Computer / PC
      </button>
    </div>

    <!-- Android Content -->
    <div id="tab-android" class="install-tab-content ${defaultTab === 'android' ? '' : 'hidden'}" style="display: ${defaultTab === 'android' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Chrome browser ke upar right corner me <strong>3 dots menu (⋮)</strong> par tap karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Menu me <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> (ऐप इंस्टॉल करें / होम स्क्रीन में जोड़ें) select karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">3</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Confirm popup me <strong>"Install / Add"</strong> tap karein. App Home Screen par add ho jayegi!
          </div>
        </div>
      </div>
    </div>

    <!-- iOS Content -->
    <div id="tab-ios" class="install-tab-content ${defaultTab === 'ios' ? '' : 'hidden'}" style="display: ${defaultTab === 'ios' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Safari browser ke bottom toolbar me <strong>Share button (📤 square with arrow)</strong> tap karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Share menu me neeche scroll karein aur <strong>"Add to Home Screen" (➕)</strong> par tap karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">3</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Top-right corner me <strong>"Add"</strong> tap karein. App icon aapke iPhone par aa jayega!
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop PC Content -->
    <div id="tab-desktop" class="install-tab-content ${defaultTab === 'desktop' ? '' : 'hidden'}" style="display: ${defaultTab === 'desktop' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Browser ke <strong>Address Bar (URL box)</strong> ke right side me dekhein: wahan <strong>Install App icon (💻 ya ⊕)</strong> dikhega.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Ya fir browser ke top-right me <strong>3 dots (⋮)</strong> -> <strong>"Save and share"</strong> -> <strong>"Install NBS AQUAVEDA"</strong> par click karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: var(--surface-alt); border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">3</span>
          <div style="font-size: 0.86rem; color: var(--text-main);">
            Pop-up me <strong>"Install"</strong> click karein. Desktop shortcut ban jayega!
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function switchInstallTab(tabKey) {
  const tabs = ['android', 'ios', 'desktop'];
  tabs.forEach((key) => {
    const el = document.getElementById(`tab-${key}`);
    if (el) el.style.display = key === tabKey ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('.install-tab-btn');
  buttons.forEach((btn) => {
    const isTarget = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabKey);
    if (isTarget) {
      btn.style.background = '#0284c7';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#0284c7';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-main)';
      btn.style.borderColor = '#e2e8f0';
    }
  });
}

function closeInstallGuideModal() {
  const modal = document.getElementById('installGuideModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
}

// Global binds
window.triggerPwaInstall = triggerPwaInstall;
window.dismissPwaBanner = dismissPwaBanner;
window.openInstallGuideModal = openInstallGuideModal;
window.closeInstallGuideModal = closeInstallGuideModal;
window.switchInstallTab = switchInstallTab;
