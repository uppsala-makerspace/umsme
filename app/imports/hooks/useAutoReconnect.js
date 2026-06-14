import { useEffect } from "react";
import { Meteor } from "meteor/meteor";

/**
 * Force an immediate DDP reconnection on the natural "I'm back" signals
 * (tab becomes visible, window focus, network online) instead of waiting out
 * Meteor's exponential backoff — which can be long after the app has been
 * backgrounded. `Meteor.reconnect()` is a no-op when already connected and
 * resets the backoff timer when disconnected, so these discrete events don't
 * cause a retry storm against a genuinely-down server.
 */
export default function useAutoReconnect() {
  useEffect(() => {
    const reconnectIfNeeded = () => {
      if (!Meteor.status().connected) Meteor.reconnect();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") reconnectIfNeeded();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", reconnectIfNeeded);
    window.addEventListener("online", reconnectIfNeeded);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", reconnectIfNeeded);
      window.removeEventListener("online", reconnectIfNeeded);
    };
  }, []);
}
