import React from "react";
import TopBar from "../TopBar";
import BottomNavigation from "../BottomNavigation";

export default function Layout({ children, bottomNav = true, scroll = true }) {
  return (
    <div className="flex flex-col h-dvh">
      <TopBar />
      <main className={`flex-1 ${scroll ? "overflow-y-auto" : "overflow-hidden"}`}>{children}</main>
      {bottomNav && <BottomNavigation />}
    </div>
  );
}
