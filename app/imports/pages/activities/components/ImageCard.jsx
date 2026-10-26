import React, { useRef } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Card } from "./fields";

/**
 * The image of an activity or an event, as the form's first card: the image
 * shown, a button to choose one and one to remove it. An event without one
 * of its own shows its activity's, greyed, to be replaced by its own.
 * Choosing goes straight to `onSelect` (with the File): the page uploads it
 * at once, or once a new one is created.
 */
const ImageCard = ({ kind, imageUrl, inherited, busy, error, onSelect, onRemove }) => {
  const { t } = useTranslation();
  const input = useRef(null);
  return (
    <Card title={t("formCardImage")} kind={kind}>
      {imageUrl ? (
        <figure className="m-0 mb-3">
          <img src={imageUrl} alt="" className={`block w-full max-h-56 object-cover rounded ${inherited ? "opacity-50" : ""}`} />
          {inherited && <figcaption className="text-xs text-gray-500 mt-1">{t("imageInherited")}</figcaption>}
        </figure>
      ) : (
        <p className="m-0 mb-3 text-sm text-gray-500">{t("imageNone")}</p>
      )}
      {error && <p className="m-0 mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3 mb-4">
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          className="text-sm rounded py-2 px-3 border border-black bg-white cursor-pointer disabled:opacity-50">
          {busy ? t("imageUploading") : t(imageUrl && !inherited ? "imageReplace" : "imageChoose")}
        </button>
        {imageUrl && !inherited && onRemove && (
          <button type="button" disabled={busy} onClick={onRemove}
            className="text-sm rounded py-2 px-3 border border-gray-300 bg-white text-red-700 cursor-pointer disabled:opacity-50">
            {t("removeImage")}
          </button>
        )}
        <input
          ref={input} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onSelect(file); }}
        />
      </div>
    </Card>
  );
};

ImageCard.propTypes = {
  kind: PropTypes.oneOf(["activity", "event"]).isRequired,
  imageUrl: PropTypes.string,
  inherited: PropTypes.bool,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
};

export default ImageCard;
