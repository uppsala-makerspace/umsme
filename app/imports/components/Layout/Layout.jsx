import React from "react";
import TopBar from "../TopBar";
import BottomNavigation from "../BottomNavigation";

export default function Layout({ children, bottomNav = true }) {
  return (
    <div className="flex flex-col h-dvh">
      <TopBar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {bottomNav && <BottomNavigation />}
    </div>
  );
}
