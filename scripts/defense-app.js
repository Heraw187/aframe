/**
 * Simple defense utility to detect unexpected DOM overlays and content rewrites.
 *
 * This script installs MutationObservers and network wrappers to log potential
 * tampering attempts such as injected overlays (e.g. high z-index elements
 * covering the page) and rewriting of critical DOM nodes (like `.markdown`).
 *
 * Usage: include this file on a page or paste its contents into the browser
 * console. Alerts will be logged to the developer console.
 */
/* global MutationObserver HTMLElement XMLHttpRequest window document */
(function () {
  function logSuspect (msg, context) {
    console.warn('[DefenseApp]', msg, context);
  }

  // Detect high z-index overlays and modifications to content containers.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === 'childList') {
        m.addedNodes.forEach(checkNode);
      }
      if (m.type === 'attributes') {
        checkNode(m.target);
      }
    });
  });

  function checkNode (node) {
    if (!(node instanceof HTMLElement)) return;
    const style = window.getComputedStyle(node);
    const z = parseInt(style.zIndex, 10);
    const large = node.offsetWidth > window.innerWidth * 0.5 ||
      node.offsetHeight > window.innerHeight * 0.5;
    if (z > 1000 && large) {
      logSuspect('Overlay detected', node);
    }
    if (node.matches && node.matches('div.markdown')) {
      logSuspect('Content rewrite detected', node);
    }
  }

  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeFilter: ['style', 'class']
  });

  // Wrap fetch to monitor network errors.
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const res = await origFetch.apply(this, args);
      if (!res.ok) {
        logSuspect('Fetch returned non-OK status', { url: res.url, status: res.status });
      }
      return res;
    } catch (err) {
      logSuspect('Fetch failed', { args, err });
      throw err;
    }
  };

  // Wrap XMLHttpRequest for additional visibility.
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    this.addEventListener('error', () => {
      logSuspect('XHR failed', { method: args[0], url: args[1] });
    });
    return origOpen.apply(this, args);
  };

  console.log('[DefenseApp] Monitoring DOM and network for tampering.');
})();
