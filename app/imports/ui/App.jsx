import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChunkErrorBoundary from '/imports/components/ChunkErrorBoundary';
import { lazyWithRetry } from '/imports/lib/lazyWithRetry';
import { NotificationProvider } from '/imports/context/NotificationContext';
import { LocationProvider } from '/imports/context/LocationContext';
import { MemberInfoProvider } from '/imports/context/MemberInfoContext';
import { AppDataProvider } from '/imports/context/AppDataContext';
import { MessagesProvider } from '/imports/context/MessagesContext';
import Loader from '/imports/components/Loader/Loader';
import useAutoReconnect from '/imports/hooks/useAutoReconnect';

const Login = lazyWithRetry(() => import('/imports/pages/login'));
const Register = lazyWithRetry(() => import('/imports/pages/register'));
const Home = lazyWithRetry(() => import('/imports/pages/home'));
const Profile = lazyWithRetry(() => import('/imports/pages/profile'));
const Unlock = lazyWithRetry(() => import('/imports/pages/unlock'));
const Storage = lazyWithRetry(() => import('/imports/pages/storage'));
const Liability = lazyWithRetry(() => import('/imports/pages/liability'));
const Account = lazyWithRetry(() => import('/imports/pages/account'));
const Verification = lazyWithRetry(() => import('/imports/pages/emailVerification'));
const ForgotPassword = lazyWithRetry(() => import('/imports/pages/forgotPassword'));
const ResetPassword = lazyWithRetry(() => import('/imports/pages/resetPassword'));
const Calendar = lazyWithRetry(() => import('/imports/pages/calendar'));
const Map = lazyWithRetry(() => import('/imports/pages/map'));
const Contact = lazyWithRetry(() => import('/imports/pages/contact'));
const Certificates = lazyWithRetry(() => import('/imports/pages/certificates'));
const CertificateDetail = lazyWithRetry(() => import('/imports/pages/certificates/detail'));
const CertificateTest = lazyWithRetry(() => import('/imports/pages/certificates/test'));
const CertifierRequestDetail = lazyWithRetry(() => import('/imports/pages/certificates/certifierDetail'));
const MembershipSelection = lazyWithRetry(() => import('/imports/pages/membershipSelection'));
const MembershipDetail = lazyWithRetry(() => import('/imports/pages/membershipDetail'));
const PaymentSelection = lazyWithRetry(() => import('/imports/pages/paymentSelection'));
const InitiatedPayment = lazyWithRetry(() => import('/imports/pages/initiatedPayment'));
const Install = lazyWithRetry(() => import('/imports/pages/install'));
const CheckEmail = lazyWithRetry(() => import('/imports/pages/checkEmail'));
const Notifications = lazyWithRetry(() => import('/imports/pages/notifications'));
const NotificationSettings = lazyWithRetry(() => import('/imports/pages/notificationSettings'));
const Messages = lazyWithRetry(() => import('/imports/pages/messages'));
const MessageDetail = lazyWithRetry(() => import('/imports/pages/messages/detail'));
const Tool = lazyWithRetry(() => import('/imports/pages/tool'));
const ToolDetail = lazyWithRetry(() => import('/imports/pages/tool/detail'));
const Settings = lazyWithRetry(() => import('/imports/pages/settings'));
const Expenses = lazyWithRetry(() => import('/imports/pages/expenses/list'));
const ExpenseDetail = lazyWithRetry(() => import('/imports/pages/expenses/detail'));
const ExpenseNew = lazyWithRetry(() => import('/imports/pages/expenses/new'));

export const App = () => {
  useAutoReconnect();
  return (
  <div>
    <Router>
      <LocationProvider>
      <NotificationProvider>
      <MemberInfoProvider>
      <MessagesProvider>
      <AppDataProvider>
        <ChunkErrorBoundary>
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
            <Route path="/certificates/:certificateId/test" element={<CertificateTest />} />
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
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<ExpenseNew />} />
            <Route path="/expenses/:expenseId" element={<ExpenseDetail />} />
          </Routes>
        </Suspense>
        </ChunkErrorBoundary>
      </AppDataProvider>
      </MessagesProvider>
      </MemberInfoProvider>
      </NotificationProvider>
      </LocationProvider>
    </Router>
  </div>);
};
