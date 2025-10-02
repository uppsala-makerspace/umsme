import React from 'react';
import Login from '/imports/pages/Login/Login';
import RegisterForm from '/imports/pages/RegisterForm';
import Home from '/imports/pages/Home';
import CreateMember from '/imports/pages/CreateMember';
import Unlock from '/imports/pages/unlock'
import Account from '/imports/pages/account'


import { WaitForEmailVerification } from '/imports/pages/WaitForEmailVerification';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

export const App = () => (
  <div>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/waitforemailverification" element={<WaitForEmailVerification />} />
        <Route path="/createMember" element={<CreateMember />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </Router>
  </div>);
