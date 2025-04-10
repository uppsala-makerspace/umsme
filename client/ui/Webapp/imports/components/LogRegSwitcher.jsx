import React, { useState } from 'react';

export const LogRegSwitcher = ({ setFormType, formType, onClick }) => {
  const handleSwitch = () => {
    const newType = formType === 'login' ? 'register' : 'login';
    setFormType(newType);
    onClick();
  };

  return (
    <button className="logreg-switcher" onClick={handleSwitch}>
      <span className={formType === 'login' ? 'active' : ''}>Login</span>
      <div className="divider"></div>
      <span className={formType === 'register' ? 'active' : ''}>Register</span>
    </button>
  );
};

  
