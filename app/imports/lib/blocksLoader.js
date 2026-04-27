/**
 * Lazy loader for the EntryScape Blocks library + Uppsala Makerspace's
 * custom block definitions. Returns a Promise that resolves once the
 * runtime has signalled readiness (via the __entryscape_blocks_ready
 * promise the example sets up). Subsequent calls share the same promise,
 * so the scripts are only injected once per session.
 */

const BLOCKS_RUNTIME_URL = "https://static.infra.entryscape.com/blocks/1/app.js";
// Local copy of Uppsala Makerspace's blocks config + accompanying CSS,
// served from app/public/. Editing the .js / .css there avoids a deploy
// of the upstream data.uppsalamakerspace.se assets while we iterate.
const TOOLWEB_CONFIG_URL = "/toolweb.js";
const TOOLWEB_STYLESHEET_URL = "/toolweb.css";

let promise = null;

const injectScript = (src) =>
  new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

const injectStylesheet = (href) => {
  if (document.querySelector(`link[data-toolweb-style][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.toolwebStyle = "true";
  document.head.appendChild(link);
};

export const loadBlocks = () => {
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    window.__entryscape_blocks_ready = new Promise((r) => {
      window.__entryscape_blocks_resolve = r;
    });
    window.__entryscape_config = (window.__entryscape_config || []).concat([
      { spa: true },
    ]);
    injectStylesheet(TOOLWEB_STYLESHEET_URL);
    // toolweb.js first (defines blocks, routes, store, namespaces);
    // runtime second so it picks up the assembled config on init.
    injectScript(TOOLWEB_CONFIG_URL)
      .then(() => injectScript(BLOCKS_RUNTIME_URL))
      .then(() => window.__entryscape_blocks_ready)
      .then(resolve)
      .catch((err) => {
        promise = null; // allow a retry after a failure
        reject(err);
      });
  });
  return promise;
};
