import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HamburgerMenu } from "../HamburgerMenu/HamburgerMenu";
import { LanguageSwitcher } from "../LanguageSwitcher/langueSwitcher";
import "./TopBar.css";

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
const InstalledIcon = () => {
  const { t } = useTranslation();
  return (
    <Link to="/install" className="install-button installed" title={t("installed")}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
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
    <Link to="/install" className="install-button">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="install-button-text">{t("installApp")}</span>
    </Link>
  );
};

export const TopBar = () => {
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";
  const isInstalledPWA = isPWA();

  return (
    <header className="top-bar">
      <HamburgerMenu />
      <div className="top-bar-right">
        {isInstalledPWA ? <InstalledIcon /> : (isHome && <InstallButton />)}
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default TopBar;
