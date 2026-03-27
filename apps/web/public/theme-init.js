// Inline theme initialization — must run before first paint to avoid FOUC.
// Loaded as an external script so the CSP does not require 'unsafe-inline' for script-src.
document.documentElement.classList.add('dark');
