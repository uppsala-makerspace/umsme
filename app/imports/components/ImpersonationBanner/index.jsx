import React, { useEffect, useState } from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useNavigate } from "react-router-dom";
import ImpersonationBanner from "./ImpersonationBanner";
import { impersonationState, clearImpersonation, switchBack } from "/imports/lib/impersonation";

const useImpersonation = () =>
  useTracker(() => ({
    state: impersonationState.get(),
    userId: Meteor.userId(),
    loggingIn: Meteor.loggingIn(),
  }));

// Shared between the banner and the watcher, so that the watcher leaves a
// switch-back in progress alone.
let switchingBack = false;

const useSwitchBack = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const goBack = async () => {
    if (switchingBack) return;
    switchingBack = true;
    setBusy(true);
    try {
      const ok = await switchBack();
      navigate(ok ? "/impersonate" : "/login");
    } finally {
      switchingBack = false;
      setBusy(false);
    }
  };
  return { busy, goBack };
};

/** The banner, rendered by Layout on every page while switched. */
export default function ImpersonationBannerContainer() {
  const { state, userId } = useImpersonation();
  const { busy, goBack } = useSwitchBack();
  if (!state || !userId || userId === state.adminUserId) return null;
  return <ImpersonationBanner name={state.targetName} busy={busy} onSwitchBack={goBack} />;
}

/**
 * Mounted once at the top of the app, also on pages without Layout (login):
 * tidies up a switch that ended some other way.
 */
export function ImpersonationWatcher() {
  const { state, userId, loggingIn } = useImpersonation();
  const { goBack } = useSwitchBack();

  useEffect(() => {
    if (!state || loggingIn || switchingBack) return;
    // Back as the admin by some other route (e.g. another tab).
    if (userId === state.adminUserId) clearImpersonation();
    // The switch token was refused or removed (expired, ended elsewhere):
    // return to the admin on our own.
    else if (!userId) goBack();
  }, [state, userId, loggingIn]);

  return null;
}
