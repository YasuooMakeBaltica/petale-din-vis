// To enable real Google sign-in: create an OAuth Client ID in Google Cloud
// Console (APIs & Services > Credentials), add this site's URL under
// "Authorized JavaScript origins", then paste the Client ID below.
var GOOGLE_CLIENT_ID = '1087975152740-btfk5kg2bd4bf8pvhumjedda9g5lu68v.apps.googleusercontent.com';

(function () {
  var toggleBtn = document.getElementById('menuToggle');
  var menu = document.getElementById('siteMenu');
  var backdrop = document.getElementById('siteMenuBackdrop');
  var themeBtn = document.getElementById('themeToggle');
  var themeLabel = themeBtn ? themeBtn.querySelector('.theme-toggle__label') : null;
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnLabel = loginBtn ? loginBtn.querySelector('.login-btn__label') : null;
  var loginModal = document.getElementById('loginModal');
  var loginClose = document.getElementById('loginModalClose');
  var googleBtn = document.getElementById('googleSignInBtn');
  var googleNote = document.getElementById('googleSignInNote');
  var accountChip = document.getElementById('accountChip');
  var accountAvatar = document.getElementById('accountAvatar');
  var accountName = document.getElementById('accountName');

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.classList.add('is-open');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    if (backdrop) backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || toggleBtn.contains(e.target)) return;
      closeMenu();
    });
  }

  function applyThemeLabel(theme) {
    if (!themeLabel) return;
    themeLabel.textContent = theme === 'dark' ? 'Mod luminos' : 'Mod întunecat';
    if (themeBtn) themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  applyThemeLabel(currentTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      try { localStorage.setItem('theme', currentTheme); } catch (e) {}
      applyThemeLabel(currentTheme);
    });
  }

  function openLogin() {
    if (!loginModal) return;
    if (googleNote) googleNote.textContent = '';
    loginModal.classList.add('is-open');
    loginModal.setAttribute('aria-hidden', 'false');
  }

  function closeLogin() {
    if (!loginModal) return;
    loginModal.classList.remove('is-open');
    loginModal.setAttribute('aria-hidden', 'true');
  }

  function getStoredAccount() {
    try {
      var raw = localStorage.getItem('account');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredAccount(account) {
    try {
      if (account) {
        localStorage.setItem('account', JSON.stringify(account));
      } else {
        localStorage.removeItem('account');
      }
    } catch (e) {}
  }

  function renderAccount(account) {
    if (account) {
      if (accountChip) {
        accountChip.hidden = false;
        if (accountAvatar) accountAvatar.src = account.picture || '';
        if (accountName) accountName.textContent = account.name || account.email || '';
      }
      if (loginBtn) {
        loginBtn.classList.add('is-authed');
        if (loginBtnLabel) loginBtnLabel.textContent = 'Log out';
      }
    } else {
      if (accountChip) accountChip.hidden = true;
      if (loginBtn) {
        loginBtn.classList.remove('is-authed');
        if (loginBtnLabel) loginBtnLabel.textContent = 'Log in';
      }
    }
  }

  renderAccount(getStoredAccount());

  function logout() {
    setStoredAccount(null);
    renderAccount(null);
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try { window.google.accounts.id.disableAutoSelect(); } catch (e) {}
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      closeMenu();
      if (loginBtn.classList.contains('is-authed')) {
        logout();
      } else {
        openLogin();
      }
    });
  }

  if (loginClose) loginClose.addEventListener('click', closeLogin);

  if (loginModal) {
    loginModal.addEventListener('click', function (e) {
      if (e.target === loginModal) closeLogin();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLogin();
    });
  }

  var googleScriptLoading = null;
  function loadGoogleScript() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve();
    }
    if (!googleScriptLoading) {
      googleScriptLoading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return googleScriptLoading;
  }

  function handleGoogleCredential(response) {
    try {
      var payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var account = { name: payload.name, email: payload.email, picture: payload.picture };
      setStoredAccount(account);
      renderAccount(account);
      if (googleNote) googleNote.textContent = 'Bine ai venit, ' + (payload.name || payload.email) + '!';
      setTimeout(closeLogin, 1200);
    } catch (e) {
      if (googleNote) googleNote.textContent = 'Autentificarea Google a eșuat. Încearcă din nou.';
    }
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      if (!GOOGLE_CLIENT_ID) {
        if (googleNote) googleNote.textContent = 'Autentificarea cu Google va fi disponibilă în curând.';
        return;
      }
      if (googleNote) googleNote.textContent = 'Se conectează…';
      loadGoogleScript().then(function () {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential
        });
        window.google.accounts.id.prompt(function (notification) {
          if (!googleNote) return;
          if (notification.isNotDisplayed && notification.isNotDisplayed()) {
            googleNote.textContent = 'Google nu a afișat fereastra de autentificare (verifică originile autorizate sau dacă ești deja conectat). Cod: ' + notification.getNotDisplayedReason();
          } else if (notification.isSkippedMoment && notification.isSkippedMoment()) {
            googleNote.textContent = '';
          }
        });
      }, function () {
        if (googleNote) googleNote.textContent = 'Nu am putut contacta Google. Verifică conexiunea.';
      });
    });
  }
})();
