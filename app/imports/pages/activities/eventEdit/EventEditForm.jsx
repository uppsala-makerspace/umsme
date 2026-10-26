import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import { localized } from "/imports/common/lib/groupRules";
import SharedFields from "../components/SharedFields";
import RegistrationFields from "../components/RegistrationFields";
import { Field, SelectField, DayField, ClockField, Row, Card } from "../components/fields";

/**
 * Add or change an event: of an activity (whose values show greyed where the
 * event has none) or free-standing in one of the member's groups; its day and
 * times, status, hosts among the group's active members, and the shared fields.
 */
const EventEditForm = ({
  isNew, values, onChange, choices, activity, hostChoices, saving, error, onSave, onCancel, onDelete,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [confirming, setConfirming] = useState(false);
  // A free-standing event belongs to a group one may create activities for.
  const groups = choices.groups.filter((g) => g.edit || g._id === values.groupId);
  const toggleHost = (id) => onChange("hostMemberIds", values.hostMemberIds.includes(id)
    ? values.hostMemberIds.filter((h) => h !== id)
    : [...values.hostMemberIds, id]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <h2 className="text-2xl m-0 mb-4">{t(isNew ? "eventNew" : "eventEdit")}</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <Card title={t("formCardEvent")}>
        <Row>
          <SelectField id="event-activityId" label={t("eventFieldActivity")} value={values.activityId} onChange={(v) => onChange("activityId", v)}
            empty={t("eventFieldFree")} options={choices.activities.map((a) => ({ value: a._id, label: localized(a.name, lang) }))} />
          {!values.activityId && (
            <SelectField id="event-groupId" label={t("activityFieldGroup")} value={values.groupId} onChange={(v) => onChange("groupId", v)}
              empty={choices.adminish ? t("activityFieldGroupNone") : undefined}
              options={groups.map((g) => ({ value: g._id, label: localized(g.name, lang) }))} />
          )}
        </Row>
        <Row>
          <DayField id="event-startDay" required label={t("eventFieldDay")} value={values.startDay} onChange={(v) => onChange("startDay", v)} />
          <ClockField id="event-startTime" required label={t("eventFieldStarts")} value={values.startTime} onChange={(v) => onChange("startTime", v)} />
          <ClockField id="event-endTime" label={t("eventFieldEnds")} hint={t("eventFieldEndsHint")} value={values.endTime} onChange={(v) => onChange("endTime", v)} />
        </Row>
        <SelectField id="event-status" label={t("eventFieldStatus")} value={values.status} onChange={(v) => onChange("status", v)}
          options={[
            ...(values.status === "awaiting" ? [{ value: "awaiting", label: t("eventAwaiting") }] : []),
            { value: "confirmed", label: t("eventConfirmed") },
            { value: "cancelled", label: t("eventCancelled") },
          ]} />
      </Card>
      <Card title={t("eventFieldHosts")}>
        <Field id="event-hosts" label="" hint={t("eventFieldHostsHint")}>
          <div id="event-hosts" className="flex flex-wrap gap-2">
            {hostChoices.map((m) => {
              const on = values.hostMemberIds.includes(m._id);
              return (
                <button key={m._id} type="button" aria-pressed={on} onClick={() => toggleHost(m._id)}
                  className={`text-sm rounded-full py-1 px-3 border cursor-pointer ${on ? "bg-brand-green text-white border-brand-green" : "bg-white text-gray-700 border-gray-300"}`}>
                  {m.name}
                </button>
              );
            })}
          </div>
        </Field>
      </Card>
      {values.activityId && <p className="text-sm text-gray-500 mb-4">{t("activityFieldInheritHint")}</p>}
      <SharedFields event values={values} onChange={onChange} choices={choices} inherited={values.activityId ? activity : null} />
      <RegistrationFields event values={values} onChange={onChange} choices={choices} inherited={values.activityId ? activity : null} />
      <div className="flex gap-3 mt-2">
        <Button type="submit" disabled={saving}>{saving ? t("saving") : t("save")}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t("cancel")}</Button>
      </div>
      {!isNew && onDelete && (
        <div className="mt-8 border-t border-gray-200 pt-4">
          {confirming ? (
            <div>
              <p className="mb-2">{t("eventDeleteConfirm")}</p>
              <div className="flex gap-3">
                <Button type="button" variant="danger" onClick={onDelete}>{t("activityDeleteButton")}</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>{t("cancel")}</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>{t("eventDelete")}</Button>
          )}
        </div>
      )}
    </form>
  );
};

EventEditForm.propTypes = {
  isNew: PropTypes.bool,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  choices: PropTypes.object.isRequired,
  activity: PropTypes.object,
  hostChoices: PropTypes.array,
  saving: PropTypes.bool,
  error: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};

EventEditForm.defaultProps = { hostChoices: [] };

export default EventEditForm;
