import React from "react";
import { Link } from "react-router-dom";
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
 * Check if running on mobile device
 */
const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod|android/i.test(userAgent);
};

/**
 * Check if the install prompt has been dismissed
 */
const isInstallDismissed = () => {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

/**
 * Install button component for TopBar
 */
const InstallButton = () => {
  const { t } = useTranslation();
  const isInstalledPWA = isPWA();
  const dismissed = isInstallDismissed();

  // Don't show if dismissed and not in PWA mode
  if (dismissed && !isInstalledPWA) {
    return null;
  }

  // Show success state if running as PWA
  if (isInstalledPWA) {
    return (
      <span className="install-button installed" title={t("installed")}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  // Show install button
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
  return (
    <header className="top-bar">
      <HamburgerMenu />
      <InstallButton />
      <LanguageSwitcher />
    </header>
  );
};

export default TopBar;
