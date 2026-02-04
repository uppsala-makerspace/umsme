import Install from "./Install";

export default {
  title: "Pages/Install",
  component: Install,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    platform: {
      control: { type: "select" },
      options: ["ios", "android", "desktop"],
    },
    isInstalledPWA: {
      control: { type: "boolean" },
    },
    isDismissed: {
      control: { type: "boolean" },
    },
    installPromptAvailable: {
      control: { type: "boolean" },
    },
    isInstalling: {
      control: { type: "boolean" },
    },
    onDismiss: { action: "dismissed" },
    onRestore: { action: "restored" },
    onInstallClick: { action: "install clicked" },
  },
};

const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://example.com";

export const iOS = {
  args: {
    platform: "ios",
    isInstalledPWA: false,
    isDismissed: false,
    qrCodeUrl,
  },
};

export const Android = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: false,
    installPromptAvailable: true,
    isInstalling: false,
    qrCodeUrl,
  },
};

export const AndroidInstalling = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: false,
    installPromptAvailable: false,
    isInstalling: true,
    qrCodeUrl,
  },
};

export const AndroidAlreadyInstalledNoPrompt = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: false,
    installPromptAvailable: false,
    isInstalling: false,
    qrCodeUrl,
  },
};

export const Desktop = {
  args: {
    platform: "desktop",
    isInstalledPWA: false,
    isDismissed: false,
    qrCodeUrl,
  },
};

export const AlreadyInstalledIOS = {
  args: {
    platform: "ios",
    isInstalledPWA: true,
    isDismissed: false,
    qrCodeUrl,
  },
};

export const AlreadyInstalledAndroid = {
  args: {
    platform: "android",
    isInstalledPWA: true,
    isDismissed: false,
    qrCodeUrl,
  },
};

export const DismissedIOS = {
  args: {
    platform: "ios",
    isInstalledPWA: false,
    isDismissed: true,
    qrCodeUrl,
  },
};

export const DismissedAndroid = {
  args: {
    platform: "android",
    isInstalledPWA: false,
    isDismissed: true,
    installPromptAvailable: true,
    isInstalling: false,
    qrCodeUrl,
  },
};
