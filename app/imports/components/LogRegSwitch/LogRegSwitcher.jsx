import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import './LogRegSwitch.css';

export const LogRegSwitcher = () => {
  const { t } = useTranslation();

  return (
    <div className="logreg-switcher">
      <NavLink to="/login">{t('login')}</NavLink>
      <div className="w-px h-5 bg-[#ccc] mx-2.5"></div>
      <NavLink to="/register">{t('register')}</NavLink>
    </div>
  );
};
