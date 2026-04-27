import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Capture clicks on Blocks-rendered links (anchors with the given CSS class)
 * so React Router handles in-app navigation instead of a full page reload.
 * External links (href that doesn't start with "/") fall through to the
 * browser's normal handling.
 *
 * Mirrors the useRouteNavigation pattern in
 * https://bitbucket.org/metasolutions/blocks-react-example, adapted for
 * react-router-dom v6's useNavigate.
 *
 * @param {string} [linkClass="esbRowLink"] - the CSS class Blocks uses on row links.
 */
export const useBlocksRouteNavigation = (linkClass = "esbRowLink") => {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (event) => {
      const a = event.target.closest(`a.${linkClass}`);
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      event.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [linkClass, navigate]);
};
