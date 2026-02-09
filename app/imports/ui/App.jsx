import React from 'react';
import Login from '/imports/pages/login';
import Register from '/imports/pages/register';
import Home from '/imports/pages/home';
import Profile from '/imports/pages/profile';
import Unlock from '/imports/pages/unlock'
import Storage from '/imports/pages/storage'
import Liability from '/imports/pages/liability'
import Account from '/imports/pages/account'
import Verification from '/imports/pages/emailVerification';
import ForgotPassword from '/imports/pages/forgotPassword';
import ResetPassword from '/imports/pages/resetPassword';
import Calendar from '/imports/pages/calendar';
import Map from '/imports/pages/map';
import Contact from '/imports/pages/contact';
import Certificates from '/imports/pages/certificates';
import CertificateDetail from '/imports/pages/certificates/detail';
import CertifierRequestDetail from '/imports/pages/certificates/certifierDetail';
import MembershipSelection from '/imports/pages/membershipSelection';
import PaymentSelection from '/imports/pages/paymentSelection';
import InitiatedPayment from '/imports/pages/initiatedPayment';
import Install from '/imports/pages/install';
import Notifications from '/imports/pages/notifications';
import NotificationSettings from '/imports/pages/notificationSettings';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from '/imports/context/NotificationContext';
import { LocationProvider } from '/imports/context/LocationContext';

export const App = () => (
  <div>
    <Router>
      <LocationProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/resetPassword/:token" element={<ResetPassword />} />
          <Route path="/waitforemailverification" element={<Verification />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/liability" element={<Liability />} />
          <Route path="/account" element={<Account />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/map" element={<Map />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/certificates/:certificateId" element={<CertificateDetail />} />
          <Route path="/certifier-requests/:attestationId" element={<CertifierRequestDetail />} />
          <Route path="/membership" element={<MembershipSelection />} />
          <Route path="/paymentSelection/:paymentType" element={<PaymentSelection />} />
          <Route path="/initiatedPayment/:externalId" element={<InitiatedPayment />} />
          <Route path="/payment" element={<Navigate to="/membership" replace />} />
          <Route path="/install" element={<Install />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
        </Routes>
      </NotificationProvider>
      </LocationProvider>
    </Router>
  </div>);
