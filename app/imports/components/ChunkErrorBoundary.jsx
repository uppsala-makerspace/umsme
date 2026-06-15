import React from "react";

// A failed dynamic import() (a lazy-loaded route chunk) rethrown by <Suspense>
// would otherwise unmount the whole tree and leave a white page. This happens
// after a deploy: a client on the old main bundle asks the redeployed server
// for module versions it no longer has, so the import rejects. We recover by
// reloading once into the current version. Guarded by a sessionStorage
// timestamp so a genuinely-broken deploy can't trap the user in a reload loop.
const CHUNK_ERROR_RE =
  /dynamically imported module|Importing a module|Failed to fetch|ChunkLoadError|Loading chunk/i;

export default class ChunkErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Let real application bugs surface instead of silently reloading.
    if (!CHUNK_ERROR_RE.test(error?.message || "")) return;
    const last = +sessionStorage.getItem("chunkReloadAt") || 0;
    if (Date.now() - last > 10000) {
      sessionStorage.setItem("chunkReloadAt", "" + Date.now());
      window.location.reload();
    }
  }

  render() {
    // Brief blank while the reload kicks in; otherwise render normally.
    return this.state.failed ? null : this.props.children;
  }
}
