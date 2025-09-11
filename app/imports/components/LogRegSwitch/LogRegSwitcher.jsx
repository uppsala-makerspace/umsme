import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import './LogRegSwitch.css';

export const LogRegSwitcher = () => {
  const { t } = useTranslation();

  return (
    <div className="logreg-switcher">
      <NavLink to="/login">{t('login')}</NavLink>
      <div className="divider"></div>
      <NavLink to="/register">{t('register')}</NavLink>
    </div>
  );
};
