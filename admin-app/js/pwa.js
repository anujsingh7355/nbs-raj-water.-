/**
 * =========================================================================
 * NBS AQUAVEDA ADMIN APP - PROGRESSIVE WEB APP (PWA) LOGIC
 * =========================================================================
 * Handles:
 * - Service Worker registration (HTTPS and localhost)
 * - Native beforeinstallprompt capture & triggering
 * - Universal fallback Install Guide Modal (Android, iOS Safari, Desktop PC)
 * - Standalone app detection to toggle Install UI appropriately
 * =========================================================================
 */

let deferredInstallPrompt = null;

function isAppInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

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
        console.log('✅ NBS AQUAVEDA Admin ServiceWorker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ NBS AQUAVEDA Admin ServiceWorker registration failed:', err);
      });
  });
}

function updateInstallUi() {
  const headerInstallBtn = document.getElementById('headerInstallBtn');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  const installBanner = document.getElementById('pwaInstallBanner');

  if (isAppInstalled()) {
    if (headerInstallBtn) headerInstallBtn.style.display = 'none';
    if (heroInstallBtn) heroInstallBtn.style.display = 'none';
    if (installBanner) installBanner.style.display = 'none';
    return;
  }

  if (headerInstallBtn) headerInstallBtn.style.display = 'inline-flex';
  if (heroInstallBtn) heroInstallBtn.style.display = 'inline-flex';

  if (installBanner && !sessionStorage.getItem('admin_pwa_banner_dismissed')) {
    installBanner.style.display = 'flex';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateInstallUi);
} else {
  updateInstallUi();
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallUi();
});

function triggerPwaInstall() {
  if (isAppInstalled()) {
    if (typeof showAdminToast === 'function') {
      showAdminToast('NBS AQUAVEDA Admin App is already installed! ✅');
    }
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        if (typeof showAdminToast === 'function') {
          showAdminToast('NBS AQUAVEDA Admin App Installed! 🎉');
        }
        dismissPwaBanner();
      }
      deferredInstallPrompt = null;
    });
    return;
  }

  openInstallGuideModal();
}

function dismissPwaBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('admin_pwa_banner_dismissed', 'true');
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  dismissPwaBanner();
  if (typeof showAdminToast === 'function') {
    showAdminToast('NBS AQUAVEDA Admin App successfully installed! 🚀');
  }
});

function openInstallGuideModal() {
  const modal = document.getElementById('installGuideModal');
  const body = document.getElementById('installGuideBody');
  if (!modal || !body) return;

  const userAgent = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(userAgent);

  let defaultTab = 'desktop';
  if (isAndroid) defaultTab = 'android';
  else if (isIos) defaultTab = 'ios';

  body.innerHTML = `
    <p style="font-size: 0.88rem; color: #64748b; margin-bottom: 14px;">
      <strong>NBS AQUAVEDA Admin App</strong> ko apne phone ya computer par install karne ke aasan steps:
    </p>

    <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; overflow-x: auto;">
      <button type="button" class="install-tab-btn" onclick="switchInstallTab('android')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'android' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'android' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'android' ? '#ffffff' : '#0f172a'};">
        📱 Android
      </button>
      <button type="button" class="install-tab-btn" onclick="switchInstallTab('ios')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'ios' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'ios' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'ios' ? '#ffffff' : '#0f172a'};">
        🍏 iPhone / iOS
      </button>
      <button type="button" class="install-tab-btn" onclick="switchInstallTab('desktop')" style="padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid ${defaultTab === 'desktop' ? '#0284c7' : '#e2e8f0'}; background: ${defaultTab === 'desktop' ? '#0284c7' : 'transparent'}; color: ${defaultTab === 'desktop' ? '#ffffff' : '#0f172a'};">
        💻 Computer / PC
      </button>
    </div>

    <div id="tab-android" style="display: ${defaultTab === 'android' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Chrome browser ke upar right corner me <strong>3 dots menu (⋮)</strong> par tap karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Menu me <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> select karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">3</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Confirm popup me <strong>"Install"</strong> tap karein. <strong>NBS Admin App</strong> aapke phone me install ho jayega!
          </div>
        </div>
      </div>
    </div>

    <div id="tab-ios" style="display: ${defaultTab === 'ios' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Safari browser ke bottom toolbar me <strong>Share button (📤)</strong> tap karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Neeche scroll karke <strong>"Add to Home Screen" (➕)</strong> par tap karein.
          </div>
        </div>
      </div>
    </div>

    <div id="tab-desktop" style="display: ${defaultTab === 'desktop' ? 'block' : 'none'};">
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">1</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Browser ke <strong>Address Bar (URL box)</strong> ke right side me <strong>Install App icon (💻 ya ⊕)</strong> par click karein.
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #f8fafc; border-radius: 10px;">
          <span style="background: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">2</span>
          <div style="font-size: 0.86rem; color: #0f172a;">
            Ya fir browser ke top-right me <strong>3 dots (⋮)</strong> ➔ <strong>"Save and share"</strong> ➔ <strong>"Install NBS AQUAVEDA Admin App"</strong> par click karein.
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
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
    btn.style.background = isTarget ? '#0284c7' : 'transparent';
    btn.style.color = isTarget ? '#ffffff' : '#0f172a';
    btn.style.borderColor = isTarget ? '#0284c7' : '#e2e8f0';
  });
}

function closeInstallGuideModal() {
  document.getElementById('installGuideModal')?.classList.remove('open');
}

window.triggerPwaInstall = triggerPwaInstall;
window.dismissPwaBanner = dismissPwaBanner;
window.openInstallGuideModal = openInstallGuideModal;
window.closeInstallGuideModal = closeInstallGuideModal;
window.switchInstallTab = switchInstallTab;
