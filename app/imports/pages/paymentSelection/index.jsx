import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopBar from "/imports/components/TopBar";
import BottomNavigation from "/imports/components/BottomNavigation";
import PaymentSelection from "./PaymentSelection";

export default function PaymentSelectionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { paymentType } = useParams();

  const [paymentOption, setPaymentOption] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get Swish disabled status from public settings
  const swishSettings = Meteor.settings?.public?.swish;
  const swishDisabled = swishSettings?.disabled === true;
  const lang = i18n.language === "sv" ? "sv" : "en";
  const disabledMessage = swishDisabled
    ? (swishSettings?.disabledMessage?.[lang] || swishSettings?.disabledMessage?.en || t("paymentsDisabled"))
    : null;

  // Load payment option from config
  useEffect(() => {
    Meteor.callAsync("payment.getOptions")
      .then((data) => {
        const option = data?.find((o) => o.paymentType === paymentType);
        if (option) {
          setPaymentOption(option);
        } else {
          setError("Invalid payment type");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load payment options config:", err);
        setError("Failed to load payment options");
        setIsLoading(false);
      });
  }, [paymentType]);

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

  // Redirect if not logged in
  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  // Loading state while fetching config
  if (isLoading && !paymentOption) {
    return (
      <>
        <TopBar />
        <div className="login-form">
          <div className="flex flex-col gap-4 items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            <span>{t("loading")}</span>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <TopBar />
        <div className="login-form">
          <div className="flex flex-col gap-4 items-center">
            <p className="text-red-600">{error}</p>
            <button className="form-button white" onClick={handleCancel}>
              {t("cancel")}
            </button>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="login-form">
        <PaymentSelection
          paymentOption={paymentOption}
          isLoading={isLoading}
          disabledMessage={disabledMessage}
          onPay={handlePay}
          onCancel={handleCancel}
        />
      </div>
      <BottomNavigation />
    </>
  );
}
