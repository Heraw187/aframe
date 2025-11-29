/**
 * Defense utility to detect unexpected DOM overlays, content rewrites, and
 * suspicious network failures. In addition to console warnings, detections are
 * published via the `defense-app:alert` CustomEvent and mirrored onto the
 * global `window.__defenseAppEvents` array for late subscribers.
 *
 * Usage: include this file on a page or paste its contents into the browser
 * console. Listen for `defense-app:alert` to receive structured notifications.
 */
/* global MutationObserver HTMLElement window CustomEvent */
(function (global) {
  const EVENT_NAME = 'defense-app:alert';
  const queueKey = '__defenseAppEvents';
  const root = global.document && global.document.documentElement;

  if (!Array.isArray(global[queueKey])) {
    Object.defineProperty(global, queueKey, {
      value: [],
      writable: false,
      configurable: false,
      enumerable: false
    });
  }

  function pushEvent (detail) {
    const payload = Object.assign({
      kind: detail && detail.kind ? detail.kind : 'general',
      message: detail && detail.message ? detail.message : 'Defense event',
      context: detail ? detail.context : undefined,
      timestamp: new Date().toISOString()
    }, detail);

    try {
      global[queueKey].push(payload);
    } catch (err) {
      // Ignore attempts to mutate the queue if it was reconfigured by a host.
    }

    try {
      global.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
    } catch (err) {
      // CustomEvent may be unavailable in extremely old environments.
    }

    const label = `[DefenseApp:${payload.kind}]`;
    if (payload.kind === 'network') {
      console.warn(label, payload.message, payload.context);
    } else {
      console.log(label, payload.message, payload.context || '');
    }
  }

  if (!root) {
    pushEvent({ kind: 'error', message: 'Document root unavailable — DOM monitoring disabled.' });
    return;
  }

  function inspectNode (node, reason) {
    if (!(node instanceof HTMLElement)) return;
    const style = global.getComputedStyle(node);
    const zIndex = parseInt(style.zIndex, 10);
    const coversViewport = node.offsetWidth > global.innerWidth * 0.5 ||
      node.offsetHeight > global.innerHeight * 0.5;

    if (zIndex > 1000 && coversViewport) {
      pushEvent({ kind: 'overlay', message: 'High z-index overlay detected.', context: { node, reason, zIndex } });
    }

    if (typeof node.matches === 'function' && node.matches('div.markdown, [data-defensive-watch="markdown"]')) {
      pushEvent({ kind: 'mutation', message: 'Potential content rewrite observed.', context: { node, reason } });
    }
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => inspectNode(node, 'childList'));
      }
      if (mutation.type === 'attributes') {
        inspectNode(mutation.target, `attribute:${mutation.attributeName}`);
      }
    });
  });

  observer.observe(root, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeFilter: ['style', 'class']
  });

  const origFetch = typeof global.fetch === 'function' ? global.fetch.bind(global) : null;
  if (origFetch) {
    global.fetch = async function (...args) {
      try {
        const response = await origFetch(...args);
        if (!response.ok) {
          pushEvent({
            kind: 'network',
            message: 'Fetch returned non-OK status.',
            context: { url: response.url, status: response.status }
          });
        }
        return response;
      } catch (err) {
        pushEvent({
          kind: 'network',
          message: 'Fetch failed.',
          context: { args, error: err }
        });
        throw err;
      }
    };
  }

  const origOpen = global.XMLHttpRequest && global.XMLHttpRequest.prototype.open;
  if (origOpen) {
    global.XMLHttpRequest.prototype.open = function (...args) {
      this.addEventListener('error', () => {
        pushEvent({
          kind: 'network',
          message: 'XMLHttpRequest error.',
          context: { method: args[0], url: args[1] }
        });
      });
      return origOpen.apply(this, args);
    };
  }

  pushEvent({ kind: 'init', message: 'Monitoring DOM and network for tampering.' });
})(window);
