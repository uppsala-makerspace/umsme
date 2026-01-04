import React from 'react';
import Login from '/imports/pages/login';
import Register from '/imports/pages/register';
import Home from '/imports/pages/home';
import Profile from '/imports/pages/profile';
import Unlock from '/imports/pages/unlock'
import Account from '/imports/pages/account'
import Verification from '/imports/pages/emailVerification';
import ForgotPassword from '/imports/pages/forgotPassword';
import ResetPassword from '/imports/pages/resetPassword';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

export const App = () => (
  <div>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/resetPassword/:token" element={<ResetPassword />} />
        <Route path="/waitforemailverification" element={<Verification />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </Router>
  </div>);
