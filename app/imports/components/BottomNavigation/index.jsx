import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeIcon as HomeOutline,
  LockOpenIcon as LockOutline,
  MapIcon as MapOutline,
  CalendarIcon as CalendarOutline,
  DocumentTextIcon as DocOutline,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  LockOpenIcon as LockSolid,
  MapIcon as MapSolid,
  CalendarIcon as CalendarSolid,
  DocumentTextIcon as DocSolid,
} from "@heroicons/react/24/solid";

const navItems = [
  { path: "/", labelKey: "navHome", OutlineIcon: HomeOutline, SolidIcon: HomeSolid, exact: true },
  { path: "/unlock", labelKey: "navDoors", OutlineIcon: LockOutline, SolidIcon: LockSolid },
  { path: "/map", labelKey: "navMap", OutlineIcon: MapOutline, SolidIcon: MapSolid },
  { path: "/calendar", labelKey: "navCalendar", OutlineIcon: CalendarOutline, SolidIcon: CalendarSolid },
  { path: "/certificates", labelKey: "navCertificates", OutlineIcon: DocOutline, SolidIcon: DocSolid },
];

export default () => {
  const { t } = useTranslation();
  const location = useLocation();

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
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center no-underline text-xs py-1 ${active ? "text-brand-green" : "text-gray-500"}`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
