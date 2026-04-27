import { useEffect } from "react";
import { loadBlocks } from "/imports/lib/blocksLoader";

/**
 * Mount EntryScape Blocks for the current view. Call once near the top of
 * a page component that renders `data-entryscape="..."` elements. On mount
 * the Blocks scripts are loaded (once per session) and `init()` is called.
 * On unmount, `clear()` tears down whatever Blocks rendered so the next
 * route can mount fresh.
 *
 * @param {string} [viewName="blocks"] - label used for any debug logging.
 */
export const useBlocks = (viewName = "blocks") => {
  useEffect(() => {
    let cancelled = false;
    loadBlocks()
      .then(() => {
        if (cancelled) return;
        window.__entryscape_blocks?.init?.();
      })
      .catch((err) => {
        console.error(`[useBlocks ${viewName}] failed to load:`, err);
      });
    return () => {
      cancelled = true;
      window.__entryscape_blocks.registry?.set('blocks_collections', []);
      window.__entryscape_blocks?.clear?.();
    };
  }, [viewName]);
};
