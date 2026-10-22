import { createContext, useContext } from 'react';

/**
 * Navigation for the pages. The pages never meet the router themselves:
 * App.jsx provides React Router's navigate through this context. Without a
 * provider (Storybook) it is a plain page load. Plain <a href> links to
 * admin's pages go through the router too (App.jsx catches their clicks).
 */
export const NavigationContext = createContext((path) => window.location.assign(path));

/** A function that goes to a path within admin. */
export const useNavigate = () => useContext(NavigationContext);
