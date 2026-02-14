import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import PaymentSelection from "./PaymentSelection";
import { membershipFromPayment } from "/imports/common/lib/utils";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { AppDataContext } from "/imports/context/AppDataContext";
import { calculateOptionAvailability } from "/imports/pages/membershipSelection/availabilityRules";

export default function PaymentSelectionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { paymentType } = useParams();
  const { memberInfo, refetch } = useContext(MemberInfoContext);
  const { paymentOptions: contextPaymentOptions } = useContext(AppDataContext);

  const [termsContent, setTermsContent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const member = memberInfo?.member || null;
  const memberStatus = memberInfo?.status || null;
  const paymentOptions = contextPaymentOptions || [];
  const paymentOption = paymentOptions.find((o) => o.paymentType === paymentType) || null;

  // Check if this payment type is unavailable given the current membership status
  const statusChanged = useMemo(() => {
    if (!paymentOptions.length || !memberStatus) return false;
    const withAvailability = calculateOptionAvailability(paymentOptions, memberStatus, !!member?.family);
    const option = withAvailability.find((o) => o.paymentType === paymentType);
    return option?.disabled === true;
  }, [paymentOptions, memberStatus, member?.family, paymentType]);

  // Get Swish disabled status from public settings
  const swishSettings = Meteor.settings?.public?.swish;
  const swishDisabled = swishSettings?.disabled === true;
  const lang = i18n.language === "sv" ? "sv" : "en";
  const disabledMessage = swishDisabled
    ? (swishSettings?.disabledMessage?.[lang] || swishSettings?.disabledMessage?.en || t("paymentsDisabled"))
    : null;

  // Validate payment type once options are available from context
  useEffect(() => {
    if (paymentOptions.length > 0) {
      if (!paymentOptions.find((o) => o.paymentType === paymentType)) {
        setError("Invalid payment type");
      }
    }
  }, [paymentOptions, paymentType]);

  // Load terms of purchase
  useEffect(() => {
    (async () => {
      try {
        const terms = await Meteor.callAsync("texts.termsOfPurchaseMembership", i18n.language === "sv" ? "sv" : "en");
        if (terms) {
          setTermsContent(terms);
        }
      } catch (_) {}
      setIsLoading(false);
    })();
  }, [i18n.language]);

  // Handle pay button click
  const handlePay = useCallback(
    async (method) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await Meteor.callAsync("payment.initiate", paymentType, {
          memberEnd: memberStatus?.memberEnd || null,
          labEnd: memberStatus?.labEnd || null,
        });
        const { externalId, paymentrequesttoken } = result;

        if (method === "qr") {
          const qrCodeData = await Meteor.callAsync(
            "payment.getQrCode",
            paymentrequesttoken
          );
          // Navigate to initiated payment with QR code in state
          navigate(`/initiatedPayment/${externalId}`, {
            state: { qrCode: qrCodeData }
          });
        } else {
          // Build the callback URL (the page we're navigating to)
          const callbackUrl = `${window.location.origin}/initiatedPayment/${externalId}`;
          const encodedCallbackUrl = encodeURIComponent(callbackUrl);

          // Construct the Swish deep link with callback
          const deepLink = `swish://paymentrequest?token=${paymentrequesttoken}&callbackurl=${encodedCallbackUrl}`;

          // Navigate to initiated payment first
          navigate(`/initiatedPayment/${externalId}`);

          // Then redirect to Swish app
          window.location.href = deepLink;
        }
      } catch (err) {
        console.error("Error initiating payment:", err);
        if (err.error === "status-changed") {
          refetch();
        } else {
          setError(err.reason || err.message);
        }
        setIsLoading(false);
      }
    },
    [paymentType, navigate]
  );

  // Handle cancel / back
  const handleCancel = useCallback(() => {
    navigate("/membership");
  }, [navigate]);

  // Calculate membership dates based on payment type and member status
  const membershipDates = useMemo(() => {
    if (!paymentOption?.paymentType || !member) return null;
    const result = membershipFromPayment(new Date(), paymentOption.paymentType, member);
    if (!result || result.error) return null;
    return result;
  }, [paymentOption?.paymentType, member]);

  // Redirect if not logged in
  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <PaymentSelection
        loading={!paymentOption || !memberStatus}
        error={error}
        paymentOption={paymentOption}
        membershipDates={membershipDates}
        termsContent={termsContent}
        isLoading={isLoading}
        isFamilyMember={!!member?.infamily}
        disabledMessage={disabledMessage}
        statusChanged={statusChanged}
        onPay={handlePay}
        onCancel={handleCancel}
      />
    </Layout>
  );
}
