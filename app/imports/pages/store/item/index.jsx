import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import StoreItem from "./StoreItem.jsx";

// Module-level cache for the terms, keyed by language — the same trick
// paymentSelection uses, so opening several items does not refetch the text.
const termsCache = {};

export default () => {
  const { code } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useTracker(() => Meteor.user());
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [termsContent, setTermsContent] = useState(null);
  const [error, setError] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const lang = i18n.language === "sv" ? "sv" : "en";
  const swishSettings = Meteor.settings?.public?.swish;
  const disabledMessage = swishSettings?.disabled === true
    ? (swishSettings?.disabledMessage?.[lang] || swishSettings?.disabledMessage?.en || t("paymentsDisabled"))
    : null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Meteor.callAsync("store.getItem", code);
      setItem(result);
      // Sequential, never Promise.all — see app/CLAUDE.md.
      if (termsCache[lang]) {
        setTermsContent(termsCache[lang]);
      } else {
        const terms = await Meteor.callAsync("texts.termsOfPurchaseStore", lang);
        if (terms) {
          termsCache[lang] = terms;
          setTermsContent(terms);
        }
      }
      setError(null);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }, [code, lang]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user?._id, fetchData]);

  const handleBuy = useCallback(
    async (method, { amount, comment }) => {
      setIsPaying(true);
      setError(null);
      try {
        const { externalId, paymentrequesttoken } = await Meteor.callAsync(
          "store.initiate",
          code,
          { amount, comment }
        );

        if (method === "qr") {
          const qrCode = await Meteor.callAsync("payment.getQrCode", paymentrequesttoken);
          navigate(`/initiatedPayment/${externalId}`, { state: { qrCode } });
          return;
        }

        const callbackUrl = `${window.location.origin}/initiatedPayment/${externalId}`;
        const deepLink =
          `swish://paymentrequest?token=${paymentrequesttoken}` +
          `&callbackurl=${encodeURIComponent(callbackUrl)}`;
        navigate(`/initiatedPayment/${externalId}`);
        window.location.href = deepLink;
      } catch (err) {
        console.error("Error initiating purchase:", err);
        setError(
          err.error === "payment-service-unavailable"
            ? t("paymentServiceUnavailable")
            : err.reason || err.message
        );
        setIsPaying(false);
      }
    },
    [code, navigate, t]
  );

  if (!Meteor.userId()) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <StoreItem
        loading={loading}
        error={error}
        item={item}
        termsContent={termsContent}
        isPaying={isPaying}
        disabledMessage={disabledMessage}
        onBuy={handleBuy}
      />
    </Layout>
  );
};
