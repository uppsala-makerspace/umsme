import { Meteor } from "meteor/meteor";
import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "/imports/components/Layout/Layout";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import { useSignedIn } from "../activities/components/useSignedIn";
import Emails from "./Emails";

/** /account/emails: the account's email addresses. */
export default () => {
  const { t } = useTranslation();
  const { user, userId, loggingIn } = useSignedIn();
  const { memberInfo, refetch } = useContext(MemberInfoContext);
  const [emails, setEmails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [taken, setTaken] = useState(null);

  // Again when the account changes: a verified address shows at once.
  const verifiedCount = (user?.emails || []).filter((e) => e.verified).length;
  useEffect(() => {
    if (!user) return;
    Meteor.callAsync("emails.list").then(setEmails, (e) => setError(e.reason || e.message));
  }, [user?._id, user?.emails?.length, verifiedCount]);

  if (!userId && !loggingIn) return <Navigate to="/login" />;

  // Runs a method; its result, when a list, is the new list.
  const run = async (method, address, done) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await Meteor.callAsync(method, address);
      if (Array.isArray(result)) setEmails(result);
      if (done) setNotice(done);
      return true;
    } catch (e) {
      if (e.error === "email-taken") setTaken(address);
      else setError(e.reason || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const hasMember = !!memberInfo?.member?.name;
  return (
    <Layout bottomNav={hasMember} showNotifications={hasMember}>
      <Emails
        loading={emails === null}
        emails={emails || []}
        busy={busy}
        error={error}
        notice={notice}
        taken={taken}
        onAdd={(address) => { setTaken(null); return run("emails.add", address, t("emailAdded", { address })); }}
        onResend={(address) => run("emails.resendVerification", address, t("emailSent", { address }))}
        onRemove={(address) => run("emails.remove", address)}
        onMakePrimary={async (address) => { if (await run("emails.makePrimary", address)) await refetch(); }}
        onRequestMerge={async (address) => { if (await run("emails.requestMerge", address, t("emailMergeRequested", { address }))) setTaken(null); }}
      />
    </Layout>
  );
};
