import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { useTracker } from "meteor/react-meteor-data";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import Layout from "/imports/components/Layout/Layout";
import Storage from "./Storage";

const ERROR_TRANSLATIONS = {
  "not-authorized": "storageErrorNotAuthorized",
  "family-read-only": "storageErrorFamilyReadOnly",
  "not-eligible": "storageErrorNotEligible",
  "bad-preference": "storageErrorBadPreference",
  "bad-request-type": "storageErrorBadRequest",
  "bad-state": "storageErrorChangedState",
  "not-found": "storageErrorChangedState",
  conflict: "storageErrorConflict",
};

const commandId = () => {
  const id = globalThis.crypto?.randomUUID?.() || Random.id();
  return `member-storage:${id}`;
};

export default function StoragePage() {
  const user = useTracker(() => Meteor.user());
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const mutationInFlight = useRef(false);
  const pendingCommands = useRef(new Map());

  const errorMessage = useCallback((exception, fallbackKey = "storageActionFailed") => {
    const translation = ERROR_TRANSLATIONS[exception?.error];
    return translation ? t(translation) : (exception?.reason || exception?.message || t(fallbackKey));
  }, [t]);

  const fetchState = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const nextState = await Meteor.callAsync("storage.member.getState");
      setState(nextState);
      setError(null);
      return nextState;
    } catch (exception) {
      setError(errorMessage(exception, "storageLoadFailed"));
      throw exception;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setLoading(true);
    Meteor.callAsync("storage.member.getState")
      .then((nextState) => {
        if (!active) return;
        setState(nextState);
        setError(null);
      })
      .catch((exception) => {
        if (!active) return;
        setState(null);
        setError(errorMessage(exception, "storageLoadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?._id, errorMessage]);

  const mutate = useCallback(async (method, args, intent) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setError(null);
    let actionError = null;
    let succeeded = false;
    const stableCommandId = intent && (pendingCommands.current.get(intent) || commandId(intent));
    if (intent && !pendingCommands.current.has(intent)) pendingCommands.current.set(intent, stableCommandId);
    try {
      await Meteor.callAsync(method, intent ? { ...args, command_id: stableCommandId } : args);
      succeeded = true;
    } catch (exception) {
      actionError = errorMessage(exception);
    }
    // A disconnect can hide a method result, and a method can fail after a
    // durable command committed. Always refresh before presenting the error.
    try {
      await fetchState();
      if (actionError) setError(actionError);
    } catch (_) {
      // fetchState has already recorded its own load error.
    } finally {
      if (succeeded && intent) pendingCommands.current.delete(intent);
      mutationInFlight.current = false;
    }
  }, [errorMessage, fetchState]);

  const upsertRequest = (requestType, preference) => {
    const args = { request_type: requestType, preference };
    return mutate("storage.member.upsertRequest", args, `upsert:${JSON.stringify(args)}`);
  };
  const cancelRequest = (requestId) => mutate(
    "storage.member.cancelRequest",
    { request_id: requestId },
    `cancel:${requestId}`,
  );
  // Move completion is idempotent by move and actor on the server.
  const confirmMove = (moveId) => mutate("storage.member.confirmMove", { move_id: moveId });

  return (
    <Layout>
      {!Meteor.userId() ? <Navigate to="/login" /> : null}
      <Storage
        state={state}
        loading={loading}
        error={error}
        onRetry={() => fetchState({ showLoader: true }).catch(() => {})}
        onUpsertRequest={upsertRequest}
        onCancelRequest={cancelRequest}
        onConfirmMove={confirmMove}
      />
    </Layout>
  );
}
