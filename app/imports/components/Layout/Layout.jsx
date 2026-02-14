import React from "react";
import TopBar from "../TopBar";
import BottomNavigation from "../BottomNavigation";
import ConnectivityBanner from "../ConnectivityBanner";

export default function Layout({ children, bottomNav = true, scroll = true, showNotifications = true }) {
  return (
    <div className="flex flex-col fixed inset-0">
      <TopBar showNotifications={showNotifications} />
      <ConnectivityBanner />
      <main className={`flex-1 ${scroll ? "overflow-y-auto" : "overflow-hidden"}`}>{children}</main>
      {bottomNav && <BottomNavigation />}
    </div>
  );
}
