// Applies the saved theme before first paint (external file: the CSP forbids inline scripts).
;(function () {
  try {
    var p = JSON.parse(localStorage.getItem('bis.prefs.v1') || '{}')
    var dark =
      p.theme === 'dark' || (p.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
  } catch (e) {}
})()
