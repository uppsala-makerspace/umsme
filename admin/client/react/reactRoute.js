/**
 * The route table: each module's client/ui/<module>/index.js adds its pages
 * here with reactRoute(), and App.jsx hands the table to React Router. The
 * route parameters (":_id") become the page's props.
 */
export const routes = [];

/**
 * A route that shows a React page, inside admin's frame (AdminShell), or
 * bare with `layout: 'Clean'` (the public pages).
 */
export const reactRoute = (path, name, component, { layout = 'AppBody' } = {}) => {
  routes.push({ path, name, component, layout });
};
