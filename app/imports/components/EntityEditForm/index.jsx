import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import Input from "../Input";

const textareaStyles =
  "bg-surface border border-black rounded py-2.5 px-3 text-base font-mono w-full box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20";

/**
 * The limited edit form used by the group and workshop edit pages. Purely
 * presentational: the container fetches the entity, gates on permission and
 * loading, and wires the method calls. Text fields are local state (seeded
 * once from `values`); the image is read live from `imageUrl` so it updates
 * after an upload/remove without resetting the text edits.
 *
 * @param {string} name        Entity name, shown read-only as a heading
 * @param {string} imageUrl    Current image URL (null when none)
 * @param {object} values      { descriptionSv, descriptionEn, slackChannel, guidesUrl }
 * @param {boolean} showGuidesUrl  Whether to show the guides URL field (workshops)
 * @param {boolean} saving
 * @param {function} onSave        (patch) => void
 * @param {function} onImageSelect ({ base64, mimeType }) => void
 * @param {function} onImageRemove () => void
 */
const EntityEditForm = ({
  name,
  imageUrl,
  values,
  showGuidesUrl,
  saving,
  onSave,
  onImageSelect,
  onImageRemove,
}) => {
  const { t } = useTranslation();
  const [descriptionSv, setDescriptionSv] = useState(values?.descriptionSv || "");
  const [descriptionEn, setDescriptionEn] = useState(values?.descriptionEn || "");
  const [slackChannel, setSlackChannel] = useState(values?.slackChannel || "");
  const [guidesUrl, setGuidesUrl] = useState(values?.guidesUrl || "");

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL; the method wants raw base64.
      const base64 = String(reader.result).split(",")[1] || "";
      onImageSelect({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSave = () => {
    onSave({
      description: { sv: descriptionSv, en: descriptionEn },
      slackChannel,
      ...(showGuidesUrl ? { guidesUrl } : {}),
    });
  };

  return (
    <div>
      {name && <h2 className="text-2xl m-0 mb-4">{name}</h2>}

      <div className="mb-4">
        <span className="block mb-1 font-bold">{t("image")}</span>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="w-full max-h-48 object-cover rounded-lg mb-2"
          />
        )}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <span className="inline-block font-mono text-base py-2.5 px-4 rounded bg-surface text-black border border-black hover:bg-gray-200">
              {t("uploadImage")}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleFile}
            />
          </label>
          {imageUrl && (
            <button
              type="button"
              onClick={onImageRemove}
              className="text-sm text-red-600 bg-transparent border-none cursor-pointer hover:underline"
            >
              {t("removeImage")}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="descriptionSv" className="block mb-1 font-bold">
          {t("descriptionSv")}
        </label>
        <textarea
          id="descriptionSv"
          rows={8}
          className={textareaStyles}
          value={descriptionSv}
          onChange={(e) => setDescriptionSv(e.target.value)}
        />
        <p className="text-gray-500 mt-1 text-sm">{t("descriptionMarkdownHint")}</p>
      </div>

      <div className="mb-4">
        <label htmlFor="descriptionEn" className="block mb-1 font-bold">
          {t("descriptionEn")}
        </label>
        <textarea
          id="descriptionEn"
          rows={8}
          className={textareaStyles}
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
        />
      </div>

      <Input
        id="slackChannel"
        label={t("slackChannel")}
        value={slackChannel}
        onChange={(e) => setSlackChannel(e.target.value)}
      />

      {showGuidesUrl && (
        <Input
          id="guidesUrl"
          label={t("guidesUrl")}
          value={guidesUrl}
          onChange={(e) => setGuidesUrl(e.target.value)}
        />
      )}

      <div className="mb-8">
        <Button fullWidth disabled={saving} onClick={handleSave}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
};

EntityEditForm.propTypes = {
  name: PropTypes.string,
  imageUrl: PropTypes.string,
  values: PropTypes.shape({
    descriptionSv: PropTypes.string,
    descriptionEn: PropTypes.string,
    slackChannel: PropTypes.string,
    guidesUrl: PropTypes.string,
  }),
  showGuidesUrl: PropTypes.bool,
  saving: PropTypes.bool,
  onSave: PropTypes.func,
  onImageSelect: PropTypes.func,
  onImageRemove: PropTypes.func,
};

EntityEditForm.defaultProps = {
  name: "",
  imageUrl: null,
  values: {},
  showGuidesUrl: false,
  saving: false,
  onSave: () => {},
  onImageSelect: () => {},
  onImageRemove: () => {},
};

export default EntityEditForm;
