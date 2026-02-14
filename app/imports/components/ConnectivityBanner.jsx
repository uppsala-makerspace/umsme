import React, { useState, useEffect } from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";

export default function ConnectivityBanner() {
  const { t } = useTranslation();
  const connected = useTracker(() => Meteor.status().connected);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (connected) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!show) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-amber-900 text-sm">
      <span>{t("connectionLost")}</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-3 px-3 py-1 bg-amber-800 hover:bg-amber-900 rounded text-white font-medium shrink-0"
      >
        {t("reload")}
      </button>
    </div>
  );
}
