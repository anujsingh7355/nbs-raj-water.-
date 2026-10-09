/**
 * =========================================================================
 * NBS AQUAVEDA - PROGRESSIVE WEB APP (PWA) LOGIC
 * =========================================================================
 * Handles Service Worker registration, beforeinstallprompt event,
 * native installation flow, and iOS home-screen guide.
 * =========================================================================
 */

let deferredInstallPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('NBS AQUAVEDA ServiceWorker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('NBS AQUAVEDA ServiceWorker registration failed:', err);
      });
  });
}

// Listen for native install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Reveal all install app buttons & banners
  const installBanner = document.getElementById('pwaInstallBanner');
  if (installBanner) {
    // Only show if user hasn't dismissed it in this session
    if (!sessionStorage.getItem('pwa_banner_dismissed')) {
      installBanner.classList.remove('hidden');
    }
  }

  const headerInstallBtn = document.getElementById('headerInstallBtn');
  if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');

  const mobileNavInstallBtn = document.getElementById('mobileNavInstallBtn');
  if (mobileNavInstallBtn) mobileNavInstallBtn.classList.remove('hidden');
});

// Trigger install prompt on user click
function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        if (typeof showToast === 'function') {
          showToast('Thank you for installing NBS AQUAVEDA App!', 'success');
        }
        dismissPwaBanner();
      }
      deferredInstallPrompt = null;
    });
  } else {
    // Check if on iOS Safari
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
      alert("To install NBS AQUAVEDA on iOS:\n1. Tap the Share button (square with arrow) at the bottom.\n2. Tap 'Add to Home Screen' (+).");
    } else {
      if (typeof showToast === 'function') {
        showToast('App is already installed or your browser supports installing from the address bar (⋮).', 'info');
      }
    }
  }
}

function dismissPwaBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
  sessionStorage.setItem('pwa_banner_dismissed', 'true');
}

// App installed successfully
window.addEventListener('appinstalled', () => {
  console.log('NBS AQUAVEDA PWA was installed successfully');
  deferredInstallPrompt = null;
  dismissPwaBanner();
  const headerInstallBtn = document.getElementById('headerInstallBtn');
  if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
});

window.triggerPwaInstall = triggerPwaInstall;
window.dismissPwaBanner = dismissPwaBanner;
