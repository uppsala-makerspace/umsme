import React, { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HamburgerMenu } from "../HamburgerMenu/HamburgerMenu";
import { LanguageSwitcher } from "../LanguageSwitcher/langueSwitcher";
import { NotificationContext } from "/imports/context/NotificationContext";

const STORAGE_KEY = 'pwa-install-dismissed';

/**
 * Check if running as installed PWA
 */
const isPWA = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * Check if the install prompt has been dismissed
 */
const isInstallDismissed = () => {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

/**
 * Installed icon component - shown on all views when PWA is installed
 */
const InstalledIcon = ({ active }) => {
  const { t } = useTranslation();
  return (
    <Link to="/install" className={active ? "text-brand-green" : "text-gray-500"} title={t("installed")}>
      {active ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <circle cx="12" cy="18" r="0.75" fill="white" />
          <rect x="9.5" y="4" width="5" height="1" rx="0.5" fill="white" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <rect x="9.5" y="4" width="5" height="1" rx="0.5" fill="currentColor" />
        </svg>
      )}
    </Link>
  );
};

/**
 * Install button component - shown on home view when not installed
 */
const InstallButton = () => {
  const { t } = useTranslation();
  const dismissed = isInstallDismissed();

  if (dismissed) {
    return null;
  }

  return (
    <Link to="/install" className="flex items-center gap-1 px-2 py-1 sm:mx-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium no-underline transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="hidden min-[360px]:inline">{t("installApp")}</span>
    </Link>
  );
};

/**
 * Bell icon with unread notification count badge or permission warning
 */
const NotificationBell = ({ active }) => {
  const { unreadCount } = useContext(NotificationContext);
  const [isGranted, setIsGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  useEffect(() => {
    // Safari fallback: usePushSetup dispatches this after requestPermission resolves
    const onGranted = () => setIsGranted(true);
    window.addEventListener("push-permission-granted", onGranted);

    // Permissions API: works on Chrome/Firefox/Edge, may throw on Safari
    let status;
    const onPermissionChange = () => setIsGranted(status.state === "granted");
    if (navigator.permissions) {
      navigator.permissions.query({ name: "notifications" }).then((s) => {
        status = s;
        onPermissionChange();
        status.addEventListener("change", onPermissionChange);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("push-permission-granted", onGranted);
      status?.removeEventListener("change", onPermissionChange);
    };
  }, []);

  return (
    <Link to={isGranted ? "/notifications" : "/notification-settings"} className={`relative ${active ? "text-brand-green" : "text-gray-500"}`}>
      {active ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5z" />
          <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
      {isGranted ? (
        unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )
      ) : (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
          !
        </span>
      )}
    </Link>
  );
};

const PAGE_TITLES = {
  "/storage": "myBox",
  "/liability": "liability",
  "/account": "myAccount",
  "/profile": "myProfile",
  "/contact": "contactUs",
  "/install": "installApp",
  "/notifications": "notifications",
  "/notification-settings": "notificationSettings",
};

export const TopBar = ({ showNotifications = true }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const showInstall = ["/", "/home", "/login", "/register"].includes(location.pathname);
  const isInstalledPWA = isPWA();
  const titleKey = PAGE_TITLES[location.pathname];

  return (
    <header className="flex justify-between items-center pl-4 pr-2 sm:pr-4 py-2 bg-white border-b border-gray-200 min-h-[44px]">
      <div className="flex items-center gap-2 min-w-0">
        <HamburgerMenu />
        {titleKey && <span className="text-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis">{t(titleKey)}</span>}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
          {isInstalledPWA ? <InstalledIcon active={location.pathname === "/install"} /> : (showInstall && <InstallButton />)}
          {showNotifications && <NotificationBell active={location.pathname === "/notifications" || location.pathname === "/notification-settings"} />}
        </div>
        <div className="w-px self-stretch bg-gray-200"></div>
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default TopBar;
