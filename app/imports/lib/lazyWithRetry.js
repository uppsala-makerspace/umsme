import { lazy } from "react";

// Wrap React.lazy so a transient dynamic-import failure (e.g. a single fetch
// racing a deploy) is retried once before giving up. A persistent failure falls
// through to ChunkErrorBoundary, which reloads into the current version.
export const lazyWithRetry = (factory) => lazy(() => factory().catch(() => factory()));
