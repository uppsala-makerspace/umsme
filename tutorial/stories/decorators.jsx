import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import { NotificationContext } from "/imports/context/NotificationContext";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { member as memberFixture } from "./fixtures";

// Browser-API stubs for tutorial screenshots. These run once per session
// when the first tutorial story loads.
//   - Pre-dismiss the install banner so TopBar's InstallButton returns null.
//   - Pretend notification permission is granted so NotificationBell shows
//     the count badge instead of the amber "!" warning.
if (typeof window !== "undefined") {
  try { localStorage.setItem("pwa-install-dismissed", "true"); } catch {}
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
 *   file                filename stem for the screenshot script
 */
export const withLayout = (Story, ctx) => {
  const t = ctx.parameters.tutorial ?? {};
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
