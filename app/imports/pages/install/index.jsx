import React, { useCallback, useState, useEffect } from "react";
import UAParser from "ua-parser-js";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import Install from "./Install";

const STORAGE_KEY = 'pwa-install-dismissed';

// Use the global install prompt stored on window (set up in main.jsx)
const getDeferredPrompt = () => typeof window !== 'undefined' ? window.deferredInstallPrompt : null;

/**
 * Detect the user's platform
 * @returns {'ios' | 'android' | 'desktop'}
 */
const detectPlatform = () => {
  const parser = new UAParser();
  const result = parser.getResult();
  const os = result.os.name?.toLowerCase() || '';
  const deviceType = result.device.type;

  // Mobile/tablet devices
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    if (os.includes('ios') || os.includes('mac os')) {
      return 'ios';
    }
    if (os.includes('android')) {
      return 'android';
    }
  }

  // iOS detection (including iPads that report as Mac)
  if (os.includes('ios')) {
    return 'ios';
  }

  // Android detection
  if (os.includes('android')) {
    return 'android';
  }

  return 'desktop';
};

/**
 * Check if running as installed PWA
 */
const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * Get QR code URL for the app
 */
const getQrCodeUrl = () => {
  const appUrl = window.location.origin;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;
};

export default function InstallPage() {
  const platform = detectPlatform();
  const isInstalledPWA = isPWA();
  const qrCodeUrl = getQrCodeUrl();
  const [isDismissed, setIsDismissed] = useState(isInstallDismissed());
  const [installPromptAvailable, setInstallPromptAvailable] = useState(!!getDeferredPrompt());

  useEffect(() => {
    const handlePromptAvailable = () => setInstallPromptAvailable(true);
    const handleAppInstalled = () => setInstallPromptAvailable(false);

    window.addEventListener('installpromptavailable', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('installpromptavailable', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  }, []);

  const handleRestore = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDismissed(false);
  }, []);

  const handleInstallClick = useCallback(async () => {
    const prompt = getDeferredPrompt();
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      window.deferredInstallPrompt = null;
      setInstallPromptAvailable(false);
      return outcome === 'accepted';
    } catch (err) {
      console.error('Install prompt error:', err);
      return false;
    }
  }, []);

  return (
    <>
      <TopBar />
      <Install
        platform={platform}
        isInstalledPWA={isInstalledPWA}
        isDismissed={isDismissed}
        qrCodeUrl={qrCodeUrl}
        installPromptAvailable={installPromptAvailable}
        onDismiss={handleDismiss}
        onRestore={handleRestore}
        onInstallClick={handleInstallClick}
      />
      <BottomNavigation />
    </>
  );
}

/**
 * Check if the install prompt has been dismissed
 */
export const isInstallDismissed = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

/**
 * Export utilities for use in TopBar
 */
export { detectPlatform, isPWA };
