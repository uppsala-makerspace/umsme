import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isEditableStorageRequest } from "/imports/common/lib/storageRules";
import Button from "../../components/Button";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";

const FLOOR_OPTIONS = [
  { value: "", key: "storageAnyFloor" },
  { value: "floor1", key: "storageFloor1" },
  { value: "floor2", key: "storageFloor2" },
];
const HEIGHT_OPTIONS = [
  { value: "", key: "storageAnyHeight" },
  { value: "low", key: "storageHeightLow" },
  { value: "high", key: "storageHeightHigh" },
];

const formatDate = (date, language) => date
  ? new Date(date).toLocaleDateString(language === "sv" ? "sv-SE" : "en-GB")
  : "";

const StatusCard = ({ tone, children, testId }) => {
  const tones = {
    blue: "border-blue-300 bg-blue-50",
    yellow: "border-yellow-400 bg-yellow-50",
    green: "border-green-400 bg-green-50",
  };
  return <section className={`w-full rounded border p-4 ${tones[tone]}`} data-testid={testId}>{children}</section>;
};

const PreferenceFields = ({ preference, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block">{t("storagePreferredFloor")}</span>
        <select
          className="select-chevron w-full appearance-none rounded border border-black bg-surface px-3 py-2.5 pr-10"
          value={preference.floor || ""}
          onChange={(event) => onChange({ ...preference, floor: event.target.value })}
          disabled={disabled}
        >
          {FLOOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block">{t("storagePreferredHeight")}</span>
        <select
          className="select-chevron w-full appearance-none rounded border border-black bg-surface px-3 py-2.5 pr-10"
          value={preference.height || ""}
          onChange={(event) => onChange({ ...preference, height: event.target.value })}
          disabled={disabled}
        >
          {HEIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}
        </select>
      </label>
    </div>
  );
};

const PreferenceSummary = ({ preference }) => {
  const { t } = useTranslation();
  if (!preference?.floor && !preference?.height) return <span>{t("storageNoPreference")}</span>;
  const parts = [];
  if (preference.floor) parts.push(t(preference.floor === "floor1" ? "storageFloor1" : "storageFloor2"));
  if (preference.height) parts.push(t(preference.height === "low" ? "storageHeightLow" : "storageHeightHigh"));
  return <span>{parts.join(", ")}</span>;
};

/** Member-facing view of the safe, authoritative storage.member.getState DTO. */
const Storage = ({ state, loading, error, onRetry, onUpsertRequest, onCancelRequest, onConfirmOffer }) => {
  const { t, i18n } = useTranslation();
  const [preference, setPreference] = useState({ floor: "", height: "" });
  const [submitting, setSubmitting] = useState(null);
  const [confirmingRelease, setConfirmingRelease] = useState(false);

  useEffect(() => {
    setPreference({
      floor: state?.request?.preference?.floor || "",
      height: state?.request?.preference?.height || "",
    });
  }, [state?.request?._id, state?.request?.preference?.floor, state?.request?.preference?.height]);
  useEffect(() => { setConfirmingRelease(false); }, [state?.request?._id, state?.unit?._id]);

  const run = async (action, callback) => {
    setSubmitting(action);
    try {
      await callback();
    } finally {
      setSubmitting(null);
    }
  };
  const preferencePayload = () => ({
    ...(preference.floor ? { floor: preference.floor } : {}),
    ...(preference.height ? { height: preference.height } : {}),
  });

  if (loading) return <MainContent><Loader /></MainContent>;
  if (!state) {
    return (
      <MainContent className="items-center gap-4 pt-8">
        <p className="text-center text-red-700" role="alert">{error || t("storageLoadFailed")}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry}>{t("tryAgain")}</Button>}
      </MainContent>
    );
  }

  const { unit, awaiting_clearance: awaitingClearance, offer, request, warning } = state;
  const readOnly = state.family_read_only;
  const activeLab = state.has_active_lab_membership;
  const requestCanBeEdited = isEditableStorageRequest(request);

  return (
    <MainContent className="items-center gap-4 pb-8 pt-8">
      {error && <p className="w-full rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

      {readOnly && (
        <StatusCard tone="blue" testId="storage-family-read-only">
          <h2 className="font-semibold">{t("storageSharedFamilyTitle")}</h2>
          <p className="mt-1 text-sm">{t("storageFamilyReadOnly")}</p>
        </StatusCard>
      )}
      {unit && (
        <StatusCard tone="green" testId="storage-occupied">
          <p className="text-sm text-gray-600">{t("myBoxNumber")}</p>
          <p className="mt-1 text-3xl font-bold text-green-700">{unit.name || "—"}</p>
          {unit.assigned_at && <p className="mt-2 text-xs text-gray-600">{t("storageAssignedAt", { date: formatDate(unit.assigned_at, i18n.language) })}</p>}
        </StatusCard>
      )}
      {warning && (
        <StatusCard tone="yellow" testId="storage-warning">
          <h2 className="font-semibold">{t("storageWarningTitle")}</h2>
          <p className="mt-1 text-sm">{t("storageWarningDeadline", { date: formatDate(warning.deadline_at, i18n.language) })}</p>
          <p className="mt-2 text-sm">{t("storageWarningRenewHelp")}</p>
        </StatusCard>
      )}
      {offer && (
        <StatusCard tone="blue" testId="storage-move-pending">
          <h2 className="font-semibold">{t("storageMovePendingTitle")}</h2>
          <p className="mt-1 text-sm">{t("storageMoveDestination", { unit: offer.destination?.name || "—" })}</p>
          <p className="mt-1 text-sm">{t("storageMoveDeadline", { date: formatDate(offer.deadline_at, i18n.language) })}</p>
          {offer.requires_inspection && <p className="mt-2 text-sm">{t("storageMoveInspection")}</p>}
          {!readOnly && (
            <Button className="mt-4" fullWidth disabled={!!submitting} onClick={() => run("confirm-offer", () => onConfirmOffer(offer._id))}>
              {submitting === "confirm-offer" ? t("loading") : t("storageConfirmMove")}
            </Button>
          )}
        </StatusCard>
      )}
      {awaitingClearance && (
        <StatusCard tone="yellow" testId="storage-awaiting-clearance">
          <h2 className="font-semibold">{t("storageAwaitingClearanceTitle")}</h2>
          <p className="mt-1 text-sm">{t("storageAwaitingClearanceBody", { unit: awaitingClearance.name })}</p>
        </StatusCard>
      )}
      {request && !offer && (
        <StatusCard tone={request.request_status === "paused_ineligible" ? "yellow" : "blue"} testId={`storage-request-${request.request_type}`}>
          <h2 className="font-semibold">{t(`storageRequest_${request.request_type}`)}</h2>
          <p className="mt-1 text-sm">{t(`storageRequestStatus_${request.request_status}`)}</p>
          <p className="mt-2 text-xs text-gray-600">{t("storageRequestedAt", { date: formatDate(request.requested_at, i18n.language) })}</p>
          {request.request_type !== "release" && <p className="mt-1 text-xs text-gray-600">{t("storagePreferenceSummary")}: <PreferenceSummary preference={request.preference} /></p>}
        </StatusCard>
      )}
      {!unit && !request && !awaitingClearance && (
        <p className="text-center text-gray-600" data-testid="storage-none">{activeLab ? t("noBoxAssigned") : t("storageRequiresLab")}</p>
      )}

      {!readOnly && !offer && requestCanBeEdited && request.request_type !== "release" && activeLab && (
        <section className="w-full">
          <h2 className="mb-2 text-lg font-medium">{t("boxPreference")}</h2>
          <p className="mb-3 text-sm text-gray-600">{t("boxPreferenceInfo")}</p>
          <PreferenceFields preference={preference} onChange={setPreference} disabled={!!submitting} />
          <Button className="mt-3" fullWidth disabled={!!submitting} onClick={() => run("save", () => onUpsertRequest(request.request_type, preferencePayload()))}>
            {submitting === "save" ? t("loading") : t("storageUpdateRequest")}
          </Button>
        </section>
      )}
      {!readOnly && !unit && !request && activeLab && !awaitingClearance && (
        <section className="w-full">
          <p className="mb-3 text-sm text-gray-600">{t("queueForBoxInfo")}</p>
          <PreferenceFields preference={preference} onChange={setPreference} disabled={!!submitting} />
          <Button className="mt-3" fullWidth disabled={!!submitting} onClick={() => run("allocation", () => onUpsertRequest("allocation", preferencePayload()))}>
            {submitting === "allocation" ? t("loading") : t("queueForBox")}
          </Button>
        </section>
      )}
      {!readOnly && unit && !request && !offer && (
        <section className="w-full space-y-3">
          {activeLab && (
            <>
              <h2 className="text-lg font-medium">{t("requestBoxChange")}</h2>
              <p className="text-sm text-gray-600">{t("requestBoxChangeInfo")}</p>
              <PreferenceFields preference={preference} onChange={setPreference} disabled={!!submitting} />
              <Button fullWidth disabled={!!submitting || (!preference.floor && !preference.height)} onClick={() => run("move", () => onUpsertRequest("move", preferencePayload()))}>
                {submitting === "move" ? t("loading") : t("storageRequestMove")}
              </Button>
            </>
          )}
          {confirmingRelease ? (
            <StatusCard tone="yellow" testId="storage-release-confirm">
              <p className="text-sm">{t("storageReleaseConfirm")}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button variant="danger" fullWidth disabled={!!submitting} onClick={() => run("release", () => onUpsertRequest("release", {}))}>
                  {submitting === "release" ? t("loading") : t("storageReleaseConfirmYes")}
                </Button>
                <Button variant="secondary" fullWidth disabled={!!submitting} onClick={() => setConfirmingRelease(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </StatusCard>
          ) : (
            <Button variant="secondary" fullWidth disabled={!!submitting} onClick={() => setConfirmingRelease(true)}>
              {t("storageRequestRelease")}
            </Button>
          )}
          <p className="text-xs text-gray-600">{t("storageReleaseHelp")}</p>
        </section>
      )}
      {!readOnly && requestCanBeEdited && (
        <Button variant="danger" fullWidth disabled={!!submitting} onClick={() => run("cancel", () => onCancelRequest(request._id))}>
          {submitting === "cancel" ? t("loading") : t("storageCancelRequest")}
        </Button>
      )}
    </MainContent>
  );
};

export default Storage;
