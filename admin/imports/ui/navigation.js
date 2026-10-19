import { createContext, useContext } from 'react';

/**
 * Navigation for React pages. The pages never meet the router themselves:
 * reactRoute provides FlowRouter's go() through this context, React Router
 * will once the Blaze layout is gone. Without a provider (Storybook) it is a
 * plain page load. Plain <a href> links work as they are.
 */
export const NavigationContext = createContext((path) => window.location.assign(path));

/** A function that goes to a path within admin. */
export const useNavigate = () => useContext(NavigationContext);
