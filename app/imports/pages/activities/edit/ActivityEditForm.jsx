import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import { localized } from "/imports/common/lib/groupRules";
import SharedFields from "../components/SharedFields";
import ImageCard from "../components/ImageCard";
import RegistrationFields from "../components/RegistrationFields";
import VisibilityFields from "../components/VisibilityFields";
import { SelectField, Card } from "../components/fields";

/**
 * Add or change an activity: its owning group (one the member may create
 * activities for) and the shared fields. Removal only for one without events.
 */
const ActivityEditForm = ({ isNew, values, onChange, choices, saving, error, hasEvents, onSave, onCancel, onDelete, image }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [confirming, setConfirming] = useState(false);
  const groups = choices.groups.filter((g) => g.edit || g._id === values.groupId);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <h2 className="text-2xl m-0 mb-4">{t(isNew ? "activityNew" : "activityEdit")}</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {image && <ImageCard kind="activity" {...image} />}
      <Card title={t("formCardOwner")} kind="activity">
        <SelectField id="activity-groupId" label={t("activityFieldGroup")} value={values.groupId} onChange={(v) => onChange("groupId", v)}
          empty={choices.adminish ? t("activityFieldGroupNone") : undefined}
          options={groups.map((g) => ({ value: g._id, label: localized(g.name, lang) }))} />
        <SelectField id="activity-eventBookers" label={t("activityFieldEventBookers")} value={values.eventBookers}
          onChange={(v) => onChange("eventBookers", v)}
          options={[
            { value: "groupMembers", label: t("activityEventBookersGroupMembers") },
            { value: "activityEditors", label: t("activityEventBookersActivityEditors") },
          ]} />
      </Card>
      <SharedFields values={values} onChange={onChange} choices={choices}
        afterDescription={<VisibilityFields values={values} onChange={onChange} />} />
      <RegistrationFields values={values} onChange={onChange} choices={choices} />
      <div className="flex gap-3 mt-2">
        <Button type="submit" disabled={saving}>{saving ? t("saving") : t("save")}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t("cancel")}</Button>
      </div>
      {!isNew && onDelete && (
        <div className="mt-8 border-t border-gray-200 pt-4">
          {hasEvents ? (
            <p className="text-sm text-gray-500">{t("activityHasEvents")}</p>
          ) : confirming ? (
            <div>
              <p className="mb-2">{t("activityDeleteConfirm")}</p>
              <div className="flex gap-3">
                <Button type="button" variant="danger" onClick={onDelete}>{t("activityDeleteButton")}</Button>
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>{t("cancel")}</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>{t("activityDelete")}</Button>
          )}
        </div>
      )}
    </form>
  );
};

ActivityEditForm.propTypes = {
  // ImageCard's props: imageUrl, inherited, busy, error, onSelect, onRemove.
  image: PropTypes.object,
  isNew: PropTypes.bool,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  choices: PropTypes.object.isRequired,
  saving: PropTypes.bool,
  error: PropTypes.string,
  hasEvents: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};

export default ActivityEditForm;
