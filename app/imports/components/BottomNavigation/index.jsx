import React, { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeIcon as HomeOutline,
  LockOpenIcon as LockOutline,
  MapIcon as MapOutline,
  CalendarDaysIcon as CalendarOutline,
  WrenchScrewdriverIcon as WrenchOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  LockOpenIcon as LockSolid,
  MapIcon as MapSolid,
  CalendarDaysIcon as CalendarSolid,
  WrenchScrewdriverIcon as WrenchSolid,
} from "@heroicons/react/24/solid";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";

// Certificates moved to the hamburger menu when Workshops took its tab slot
// (certificates are also reachable from each workshop's page), and the
// Google calendar when the activities' events took its slot and its name.
// The activities themselves are a card on the home page.
const navItems = [
  { path: "/", labelKey: "navHome", OutlineIcon: HomeOutline, SolidIcon: HomeSolid, exact: true },
  { path: "/unlock", labelKey: "navDoors", OutlineIcon: LockOutline, SolidIcon: LockSolid },
  { path: "/workshops", labelKey: "navWorkshops", OutlineIcon: WrenchOutline, SolidIcon: WrenchSolid },
  { path: "/map", labelKey: "navMap", OutlineIcon: MapOutline, SolidIcon: MapSolid },
  { path: "/calendar", labelKey: "navCalendar", OutlineIcon: CalendarOutline, SolidIcon: CalendarSolid },
];

export default () => {
  const { t } = useTranslation();
  const location = useLocation();
  // The events to come one has a seat at, in red on the calendar's icon, as
  // the home page counts what waits on the reader.
  const { memberInfo } = useContext(MemberInfoContext);
  const counts = { "/calendar": memberInfo?.upcomingRegistrations || 0 };

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="flex bg-white border-t border-gray-200 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = active ? item.SolidIcon : item.OutlineIcon;
        const count = counts[item.path] || 0;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center no-underline text-xs py-1 ${active ? "text-brand-green" : "text-gray-500"}`}
          >
            <span className="relative block">
              <Icon className="w-6 h-6 mb-1" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
