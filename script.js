(function () {
  var toggleBtn = document.getElementById('menuToggle');
  var menu = document.getElementById('siteMenu');
  var themeBtn = document.getElementById('themeToggle');
  var themeLabel = themeBtn ? themeBtn.querySelector('.theme-toggle__label') : null;
  var loginBtn = document.getElementById('loginBtn');
  var loginModal = document.getElementById('loginModal');
  var loginClose = document.getElementById('loginModalClose');

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
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
    loginModal.classList.add('is-open');
    loginModal.setAttribute('aria-hidden', 'false');
  }

  function closeLogin() {
    if (!loginModal) return;
    loginModal.classList.remove('is-open');
    loginModal.setAttribute('aria-hidden', 'true');
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      closeMenu();
      openLogin();
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
})();
