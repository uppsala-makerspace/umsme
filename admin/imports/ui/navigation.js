import { createContext, useContext } from 'react';

/**
 * Navigation for the pages. The pages never meet the router themselves:
 * App.jsx provides React Router's navigate through this context. Without a
 * provider (Storybook) it is a plain page load. Plain <a href> links to
 * admin's pages go through the router too (App.jsx catches their clicks).
 */
export const NavigationContext = createContext((path) => window.location.assign(path));

/** The current query string ("?tab=family"), from the router; App.jsx provides it. */
export const SearchContext = createContext(null);

/** A function that goes to a path within admin. */
export const useNavigate = () => useContext(NavigationContext);

/**
 * One parameter of the URL's query, and a function that sets it as a new
 * step in the history (so Back goes back to the previous value); '' or a
 * falsy value takes it out of the URL.
 *
 * @returns {[string, (value: string) => void]}
 */
export const useQueryParam = (name) => {
  const navigate = useNavigate();
  const search = useContext(SearchContext) ?? window.location.search;
  const value = new URLSearchParams(search).get(name) || '';
  const set = (next) => {
    const params = new URLSearchParams(search);
    if (next) params.set(name, next); else params.delete(name);
    const query = params.toString();
    navigate(`${window.location.pathname}${query ? `?${query}` : ''}`);
  };
  return [value, set];
};
