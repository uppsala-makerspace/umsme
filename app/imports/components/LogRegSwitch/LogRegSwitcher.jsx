import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

export const LogRegSwitcher = () => {
  const { t } = useTranslation();

  const linkClass = ({ isActive }) =>
    isActive ? "text-gray-500 cursor-default" : "text-black cursor-pointer";

  return (
    <div className="flex items-center justify-center py-2.5 px-4 font-mono text-xl">
      <NavLink to="/login" className={linkClass}>{t('login')}</NavLink>
      <div className="w-px h-5 bg-[#ccc] mx-2.5"></div>
      <NavLink to="/register" className={linkClass}>{t('register')}</NavLink>
    </div>
  );
};
