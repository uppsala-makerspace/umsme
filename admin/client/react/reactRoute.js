import { lazy } from 'react';

/**
 * The route table: each module's client/ui/<module>/index.js adds its pages
 * here with reactRoute(), and App.jsx hands the table to React Router. The
 * route parameters (":_id") become the page's props.
 */
export const routes = [];

/** A route that shows a React page, inside admin's frame (AdminShell). */
export const reactRoute = (path, name, component) => {
  routes.push({ path, name, component });
};

const lazyPages = new Map();

/**
 * A page loaded when it is first shown rather than at startup, so that
 * opening admin runs only its frame: `load` is `() => import('/imports/ui/…')`
 * (a literal path, for Meteor to find the module) and `exportName` the page
 * the module exports. A failed load is tried once more, as a fetch may race a
 * deploy; a second failure reaches App's PageLoadError. The same page on
 * several routes is one component.
 *
 * @param {() => Promise<object>} load
 * @param {string} exportName
 */
export const lazyPage = (load, exportName) => {
  if (!lazyPages.has(load)) lazyPages.set(load, new Map());
  const byName = lazyPages.get(load);
  if (!byName.has(exportName)) {
    const page = () => load().then((m) => {
      if (!m[exportName]) throw new Error(`No page ${exportName} in the module`);
      return { default: m[exportName] };
    });
    byName.set(exportName, lazy(() => page().catch(() => page()).catch((error) => {
      // Marked, so that App's boundary tells a page that did not load from one that failed.
      error.pageLoad = true;
      throw error;
    })));
  }
  return byName.get(exportName);
};
