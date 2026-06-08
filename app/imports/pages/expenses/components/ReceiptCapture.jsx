import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CameraIcon } from "@heroicons/react/24/outline";
import Button from "../../../components/Button";
import { downscaleImage } from "../utils";

/**
 * Receipt photo picker. Lets the user take a photo (mobile camera) or pick
 * from the gallery, downscales it client-side, and hands the result to
 * `onCapture({ base64, mimeType })`.
 *
 * `overlay` renders a compact pill button (camera icon + label) meant to be
 * absolutely positioned over a photo; otherwise a full-width Button is used.
 */
const ReceiptCapture = ({ onCapture, label, busy, variant = "primary", overlay = false }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [working, setWorking] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setWorking(true);
    try {
      const { base64, mimeType } = await downscaleImage(file);
      await onCapture({ base64, mimeType });
    } catch (err) {
      console.error("Receipt capture failed:", err);
      alert(t("expenseCaptureFailed"));
    } finally {
      setWorking(false);
    }
  };

  const text = working ? t("expenseUploading") : label || t("expenseAddPhoto");
  const disabled = busy || working;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {overlay ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-brand-green text-surface text-xs px-3 py-1 hover:bg-brand-green-dark disabled:opacity-50"
        >
          <CameraIcon className="h-4 w-4" />
          {text}
        </button>
      ) : (
        <Button
          variant={variant}
          fullWidth
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {text}
        </Button>
      )}
    </>
  );
};

export default ReceiptCapture;
