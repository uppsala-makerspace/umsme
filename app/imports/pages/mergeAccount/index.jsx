import { Meteor } from "meteor/meteor";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import { MemberInfoContext } from "/imports/context/MemberInfoContext";
import MergeAccount from "./MergeAccount";

/**
 * /merge-account/:token, from the mail to the other account's address. It
 * works signed in or not: the link is the proof.
 */
export default () => {
  const { token } = useParams();
  const { refetch } = useContext(MemberInfoContext);
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Meteor.callAsync("emails.mergeRequestInfo", token).then(setInfo, (e) => setError(e.reason || e.message));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await Meteor.callAsync("emails.confirmMerge", token));
      if (Meteor.userId()) await refetch();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout bottomNav={false} showNotifications={false}>
      <MergeAccount loading={!info && !error} info={info || { state: "invalid" }} result={result} busy={busy} error={error} onConfirm={confirm} />
    </Layout>
  );
};
