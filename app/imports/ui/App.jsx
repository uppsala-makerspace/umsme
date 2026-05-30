import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from '/imports/context/NotificationContext';
import { LocationProvider } from '/imports/context/LocationContext';
import { MemberInfoProvider } from '/imports/context/MemberInfoContext';
import { AppDataProvider } from '/imports/context/AppDataContext';
import { MessagesProvider } from '/imports/context/MessagesContext';
import Loader from '/imports/components/Loader/Loader';

const Login = lazy(() => import('/imports/pages/login'));
const Register = lazy(() => import('/imports/pages/register'));
const Home = lazy(() => import('/imports/pages/home'));
const Profile = lazy(() => import('/imports/pages/profile'));
const Unlock = lazy(() => import('/imports/pages/unlock'));
const Storage = lazy(() => import('/imports/pages/storage'));
const Liability = lazy(() => import('/imports/pages/liability'));
const Account = lazy(() => import('/imports/pages/account'));
const Verification = lazy(() => import('/imports/pages/emailVerification'));
const ForgotPassword = lazy(() => import('/imports/pages/forgotPassword'));
const ResetPassword = lazy(() => import('/imports/pages/resetPassword'));
const Calendar = lazy(() => import('/imports/pages/calendar'));
const Map = lazy(() => import('/imports/pages/map'));
const Contact = lazy(() => import('/imports/pages/contact'));
const Certificates = lazy(() => import('/imports/pages/certificates'));
const CertificateDetail = lazy(() => import('/imports/pages/certificates/detail'));
const CertifierRequestDetail = lazy(() => import('/imports/pages/certificates/certifierDetail'));
const MembershipSelection = lazy(() => import('/imports/pages/membershipSelection'));
const MembershipDetail = lazy(() => import('/imports/pages/membershipDetail'));
const PaymentSelection = lazy(() => import('/imports/pages/paymentSelection'));
const InitiatedPayment = lazy(() => import('/imports/pages/initiatedPayment'));
const Install = lazy(() => import('/imports/pages/install'));
const CheckEmail = lazy(() => import('/imports/pages/checkEmail'));
const Notifications = lazy(() => import('/imports/pages/notifications'));
const NotificationSettings = lazy(() => import('/imports/pages/notificationSettings'));
const Messages = lazy(() => import('/imports/pages/messages'));
const MessageDetail = lazy(() => import('/imports/pages/messages/detail'));
const Tool = lazy(() => import('/imports/pages/tool'));
const ToolDetail = lazy(() => import('/imports/pages/tool/detail'));
const Settings = lazy(() => import('/imports/pages/settings'));

export const App = () => (
  <div>
    <Router>
      <LocationProvider>
      <NotificationProvider>
      <MemberInfoProvider>
      <MessagesProvider>
      <AppDataProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/check-email" element={<CheckEmail />} />
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
            <Route path="/membership/:membershipId" element={<MembershipDetail />} />
            <Route path="/paymentSelection/:paymentType" element={<PaymentSelection />} />
            <Route path="/initiatedPayment/:externalId" element={<InitiatedPayment />} />
            <Route path="/payment" element={<Navigate to="/membership" replace />} />
            <Route path="/install" element={<Install />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:kind/:id" element={<MessageDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/tool" element={<Tool />} />
            <Route path="/tool/:id" element={<ToolDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AppDataProvider>
      </MessagesProvider>
      </MemberInfoProvider>
      </NotificationProvider>
      </LocationProvider>
    </Router>
  </div>);
