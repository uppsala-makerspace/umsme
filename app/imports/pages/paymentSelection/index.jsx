import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import PaymentSelection from "./PaymentSelection";
import { membershipFromPayment } from "/imports/common/lib/utils";

export default function PaymentSelectionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { paymentType } = useParams();

  const [paymentOption, setPaymentOption] = useState(null);
  const [member, setMember] = useState(null);
  const [termsContent, setTermsContent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get Swish disabled status from public settings
  const swishSettings = Meteor.settings?.public?.swish;
  const swishDisabled = swishSettings?.disabled === true;
  const lang = i18n.language === "sv" ? "sv" : "en";
  const disabledMessage = swishDisabled
    ? (swishSettings?.disabledMessage?.[lang] || swishSettings?.disabledMessage?.en || t("paymentsDisabled"))
    : null;

  // Load payment option from config, member info, and terms
  useEffect(() => {
    Promise.all([
      Meteor.callAsync("payment.getOptions"),
      Meteor.callAsync("findInfoForUser"),
      Meteor.callAsync("texts.termsOfPurchaseMembership", i18n.language === "sv" ? "sv" : "en").catch(() => null),
    ])
      .then(([options, info, terms]) => {
        const option = options?.find((o) => o.paymentType === paymentType);
        if (option) {
          setPaymentOption(option);
        } else {
          setError("Invalid payment type");
        }
        if (info?.member) {
          setMember(info.member);
        }
        if (terms) {
          setTermsContent(terms);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setError("Failed to load payment options");
        setIsLoading(false);
      });
  }, [paymentType, i18n.language]);

  // Handle pay button click
  const handlePay = useCallback(
    async (method) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await Meteor.callAsync("payment.initiate", paymentType);
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
        setError(err.reason || err.message);
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
        loading={isLoading && !paymentOption}
        error={error}
        paymentOption={paymentOption}
        membershipDates={membershipDates}
        termsContent={termsContent}
        isLoading={isLoading}
        disabledMessage={disabledMessage}
        onPay={handlePay}
        onCancel={handleCancel}
      />
    </Layout>
  );
}
