import React from "react";
import { useTranslation } from "react-i18next";

/**
 * iOS installation instructions
 */
const IosInstructions = ({ t }) => (
  <div className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold">{t("installIosTitle")}</h2>
    <ol className="list-decimal list-inside space-y-3 text-sm">
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">1.</span>
        <span>
          {t("installIosStep1")}
          <span className="inline-block ml-2 text-lg">
            <svg className="inline w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"/>
            </svg>
          </span>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">2.</span>
        <span>{t("installIosStep2")}</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">3.</span>
        <span>{t("installIosStep3")}</span>
      </li>
    </ol>
  </div>
);

/**
 * Android manual installation instructions
 */
const AndroidManualInstructions = ({ t, showAlternativeHeader }) => (
  <div className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold">
      {showAlternativeHeader ? t("installAndroidAlternativeTitle") : t("installAndroidTitle")}
    </h2>
    <ol className="list-decimal list-inside space-y-3 text-sm">
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">1.</span>
        <span>
          {t("installAndroidStep1")}
          <span className="inline-block ml-2 text-lg">⋮</span>
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">2.</span>
        <span>{t("installAndroidStep2")}</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="font-mono bg-gray-100 px-2 py-1 rounded">3.</span>
        <span>{t("installAndroidStep3")}</span>
      </li>
    </ol>
  </div>
);

/**
 * Android one-click install button
 */
const AndroidInstallButton = ({ t, onInstallClick }) => (
  <div className="flex flex-col gap-4">
    <button
      onClick={onInstallClick}
      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {t("installAndroidButton")}
    </button>
  </div>
);

/**
 * Desktop view with QR code
 */
const DesktopInstructions = ({ t, qrCodeUrl }) => (
  <div className="flex flex-col gap-4 items-center">
    <p className="text-sm text-gray-600 text-center">
      {t("installDesktopInfo")}
    </p>

    <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
      <img
        src={qrCodeUrl}
        alt="QR Code"
        className="w-48 h-48 border border-gray-200 rounded"
      />
      <p className="text-sm text-center">{t("installDesktopQrText")}</p>
    </div>
  </div>
);

/**
 * Pure Install component for PWA installation instructions.
 * @param {Object} props
 * @param {'ios' | 'android' | 'desktop'} props.platform - Detected platform
 * @param {boolean} props.isInstalledPWA - Whether running as installed PWA
 * @param {boolean} props.isDismissed - Whether the install button was dismissed
 * @param {string} props.qrCodeUrl - URL for QR code image (desktop only)
 * @param {boolean} props.installPromptAvailable - Whether the native install prompt is available
 * @param {boolean} props.isInstalling - Whether the app is currently being installed (user accepted prompt)
 * @param {function} props.onDismiss - Callback when user clicks "prefer browser"
 * @param {function} props.onRestore - Callback when user wants to show install button again
 * @param {function} props.onInstallClick - Callback to trigger native install prompt
 */
const Install = ({ platform, isInstalledPWA, isDismissed, qrCodeUrl, installPromptAvailable, isInstalling, onDismiss, onRestore, onInstallClick }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 p-4 max-w-xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">{t("installTitle")}</h1>

      {/* Already installed message when in PWA mode (mobile only) */}
      {isInstalledPWA && platform !== 'desktop' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">{t("installAlreadyInstalledPWA")}</p>
        </div>
      )}

      {/* Hint for iOS users who may have already installed */}
      {!isInstalledPWA && platform === 'ios' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
          <p>{t("installAlreadyInstalled")}</p>
        </div>
      )}

      {/* Platform-specific instructions (only when not installed as PWA) */}
      {!isInstalledPWA && platform === 'ios' && <IosInstructions t={t} />}
      {!isInstalledPWA && platform === 'android' && (
        <>
          {installPromptAvailable ? (
            <>
              <AndroidInstallButton t={t} onInstallClick={onInstallClick} />
              <AndroidManualInstructions t={t} showAlternativeHeader={true} />
            </>
          ) : isInstalling ? (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-medium">{t("installAndroidInstalling")}</p>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">{t("installAndroidAlreadyInstalled")}</p>
            </div>
          )}
        </>
      )}
      {!isInstalledPWA && platform === 'desktop' && <DesktopInstructions t={t} qrCodeUrl={qrCodeUrl} />}

      {/* Dismiss/Restore option (only when not installed as PWA) */}
      {!isInstalledPWA && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!isDismissed}
              onChange={(e) => e.target.checked ? onRestore?.() : onDismiss?.()}
              className="flex-shrink-0"
            />
            <span className="text-sm text-gray-600">
              {t("installShowButtonCheckbox")}
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default Install;
