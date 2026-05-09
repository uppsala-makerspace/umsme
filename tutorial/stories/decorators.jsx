import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import { NotificationContext } from "/imports/context/NotificationContext";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { member as memberFixture } from "./fixtures";

// Browser-API stubs for tutorial screenshots. These run once per session
// when the first tutorial story loads.
//   - Pretend notification permission is granted so NotificationBell shows
//     the count badge instead of the amber "!" warning.
//   - Override matchMedia for the PWA-mode query, with the answer driven
//     per-story by window.__TUTORIAL_PWA__ (set in withLayout below).
if (typeof window !== "undefined") {
  Object.defineProperty(window, "Notification", {
    value: {
      permission: "granted",
      requestPermission: () => Promise.resolve("granted"),
    },
    writable: true,
    configurable: true,
  });
  // TopBar's useEffect overrides the initial `isGranted` state with the
  // result of navigator.permissions.query — patch that to also report
  // granted so the bell never falls back to the amber "!" warning.
  if (navigator.permissions) {
    navigator.permissions.query = () =>
      Promise.resolve({
        state: "granted",
        addEventListener: () => {},
        removeEventListener: () => {},
      });
  }
  const originalMatchMedia =
    typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
  window.__TUTORIAL_PWA__ = false;
  window.matchMedia = (query) => {
    if (query === "(display-mode: standalone)") {
      return {
        matches: !!window.__TUTORIAL_PWA__,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      };
    }
    return originalMatchMedia
      ? originalMatchMedia(query)
      : {
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
        };
  };
}

// Mirrors imports/components/Layout/Layout but skips ConnectivityBanner —
// that component imports Meteor at the top level which webpack can't resolve
// in Storybook. Everything else (TopBar, BottomNavigation) is the real thing.
const TutorialLayout = ({ children, bottomNav = true, showNotifications = true }) => (
  <div className="flex flex-col fixed inset-0">
    <TopBar showNotifications={showNotifications} />
    <main className="flex-1 overflow-y-auto">{children}</main>
    {bottomNav && <BottomNavigation />}
  </div>
);

// Stub providers — TopBar reads NotificationContext.unreadCount;
// HamburgerMenu reads MemberInfoContext.memberInfo.member to decide whether
// to render at all.
const Providers = ({ children, unreadCount = 0, hasMember = true }) => (
  <NotificationContext.Provider value={{ unreadCount, addNotification: () => {}, removeNotification: () => {} }}>
    <MemberInfoContext.Provider value={{ memberInfo: hasMember ? { member: memberFixture } : {} }}>
      {children}
    </MemberInfoContext.Provider>
  </NotificationContext.Provider>
);

// preview.js wraps every story in a <BrowserRouter>. Nesting another router
// here breaks v6 ("You cannot render a <Router> inside another <Router>").
// Instead navigate the existing router to the desired path on mount so
// TopBar's title and BottomNavigation's active highlight match the frame.
const Navigator = ({ to }) => {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
};

/**
 * Story-level options live under `parameters.tutorial`:
 *   path                initial route, default "/"
 *   bottomNav           include the bottom nav, default true
 *   showNotifications   show the bell icon, default true
 *   hasMember           whether HamburgerMenu should render, default true
 *   unreadCount         bell badge count, default 0
 *   showInstallButton   keep TopBar's "Install app" prompt visible
 *                       (default false — most stories want it hidden)
 *   isPWA               render as if we're inside the installed PWA, so
 *                       TopBar shows the InstalledIcon instead of the
 *                       Install button (default false)
 *   file                filename stem for the screenshot script
 */
export const withLayout = (Story, ctx) => {
  const t = ctx.parameters.tutorial ?? {};
  // Per-story state that drives TopBar's Install button / InstalledIcon
  // logic. We refresh these at every render so navigating between stories
  // in Storybook resets state predictably.
  if (typeof window !== "undefined") {
    if (t.showInstallButton) {
      try { localStorage.removeItem("pwa-install-dismissed"); } catch {}
    } else {
      try { localStorage.setItem("pwa-install-dismissed", "true"); } catch {}
    }
    window.__TUTORIAL_PWA__ = !!t.isPWA;
  }
  return (
    <Providers unreadCount={t.unreadCount} hasMember={t.hasMember !== false}>
      <Navigator to={t.path ?? "/"} />
      <TutorialLayout
        bottomNav={t.bottomNav !== false}
        showNotifications={t.showNotifications !== false}
      >
        <Story />
      </TutorialLayout>
    </Providers>
  );
};
