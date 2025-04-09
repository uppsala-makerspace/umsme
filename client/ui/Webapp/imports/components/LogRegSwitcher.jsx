import React, { useState } from 'react';

export const LogRegSwitcher = ({ setFormType, onClick }) => {
    const [isLogin, setIsLogin] = useState(true);
  
    const handleSwitch = () => {
      setIsLogin(!isLogin);
      setFormType(isLogin ? 'register' : 'login');
      if (onClick) onClick(); 
    };
  
    return (
      <button className="logreg-switcher" onClick={handleSwitch}>
        <span className={isLogin ? 'active' : ''}>Login</span>
        <div className="divider"></div>
        <span className={!isLogin ? 'active' : ''}>Register</span>
      </button>
    );
  };
  
