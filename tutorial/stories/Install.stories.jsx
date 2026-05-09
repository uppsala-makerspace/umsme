import { fn } from "storybook/test";
import InstallPage from "/imports/pages/install/Install";
import { withLayout } from "./decorators";

export default {
  title: "Tutorial/Install",
  component: InstallPage,
  decorators: [withLayout],
};

const baseActions = {
  onDismiss: fn(),
  onRestore: fn(),
  onInstallClick: fn(),
};

// Tutorial is captured signed-in (member arrives at /install via the side
// menu), so the regular shell is shown. We hide the dismiss-toggle row at
// the bottom — that's a settings affordance and adds clutter to the shot.

// Filename: install-ios-{lang}.png — iOS three-step instructions.
export const InstallIos = {
  args: {
    platform: "ios",
    isInstalledPWA: false,
    isDismissed: false,
    showDismissToggle: false,
    qrCodeUrl: null,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/install", file: "install-ios", showNotifications: false } },
};

// Filename: install-android-button-{lang}.png — Android with the native
// install prompt available; shows the green "Install app" button.
export const InstallAndroidButton = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: false,
    installPromptAvailable: true,
    isInstalling: false,
    showDismissToggle: false,
    qrCodeUrl: null,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/install", file: "install-android-button", showNotifications: false } },
};

// Filename: install-android-manual-{lang}.png — Android without a native
// install prompt; shows the manual three-step instructions.
export const InstallAndroidManual = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: false,
    installPromptAvailable: false,
    isInstalling: false,
    showDismissToggle: false,
    qrCodeUrl: null,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/install", file: "install-android-manual", showNotifications: false } },
};

// Filename: install-desktop-{lang}.png — desktop view with QR code.
export const InstallDesktop = {
  args: {
    platform: "desktop",
    isInstalledPWA: false,
    isDismissed: false,
    showDismissToggle: false,
    qrCodeUrl:
      "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://app.uppsalamakerspace.se",
    ...baseActions,
  },
  parameters: { tutorial: { path: "/install", file: "install-desktop", showNotifications: false } },
};
