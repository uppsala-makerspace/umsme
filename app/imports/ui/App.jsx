import React from 'react';
import LoginForm from '/imports/pages/LoginForm';
import RegisterForm from '/imports/pages/RegisterForm';
import Home from '/imports/pages/Home';
import CreateMember from '/imports/pages/CreateMember';

import { WaitForEmailVerification } from '/imports/pages/WaitForEmailVerification';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';

export const App = () => (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/waitforemailverification" element={<WaitForEmailVerification />} />
          <Route path="/createMember" element={<CreateMember />} />
        </Routes>
      </Router>
    </div>);