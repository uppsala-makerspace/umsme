import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CameraIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import Button from "../../../components/Button";
import { downscaleImage, readFileAsBase64, MAX_DOCUMENT_BYTES } from "../utils";

/**
 * Receipt photo picker. Offers two actions so both are available on every
 * device: "take photo" (camera input, `capture` forces the rear camera on
 * mobile) and "upload" (plain file input → gallery on mobile, file dialog on
 * desktop). Both downscale the image client-side and hand the result to
 * `onCapture({ base64, mimeType })`.
 *
 * `overlay` renders two compact icon pills meant to be absolutely positioned
 * over an existing photo; otherwise two full-width buttons sit side by side.
 *
 * The upload also accepts a PDF, passed on untouched rather than downscaled.
 * `invoice` switches the labels to the invoice wording.
 */
const ReceiptCapture = ({ onCapture, busy, overlay = false, invoice = false }) => {
  const { t } = useTranslation();
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [working, setWorking] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const pdf = file.type === "application/pdf";
    if (pdf && file.size > MAX_DOCUMENT_BYTES) {
      alert(t("expenseFileTooLarge"));
      return;
    }
    setWorking(true);
    try {
      const { base64, mimeType } = pdf ? await readFileAsBase64(file) : await downscaleImage(file);
      await onCapture({ base64, mimeType });
    } catch (err) {
      console.error("Receipt capture failed:", err);
      alert(t("expenseCaptureFailed"));
    } finally {
      setWorking(false);
    }
  };

  const disabled = busy || working;
  const cameraLabel = t(invoice ? "expenseTakePhotoInvoice" : "expenseTakePhoto");
  const uploadLabel = t(invoice ? "expenseUploadInvoice" : "expenseUploadReceipt");

  return (
    <>
      {/* capture forces the camera on mobile; ignored on desktop */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {/* no capture → gallery on mobile, file dialog on desktop */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      {overlay ? (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
            aria-label={cameraLabel}
            title={cameraLabel}
            className="flex items-center rounded-full bg-brand-green text-surface px-3 py-1 hover:bg-brand-green-dark disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            aria-label={uploadLabel}
            title={uploadLabel}
            className="flex items-center rounded-full bg-brand-green text-surface px-3 py-1 hover:bg-brand-green-dark disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
          </button>
        </div>
      ) : working ? (
        <Button variant="primary" fullWidth disabled>
          {t("expenseUploading")}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button
            variant="primary"
            disabled={disabled}
            className="flex-1"
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon className="h-5 w-5" />
            {cameraLabel}
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            className="flex-1"
            onClick={() => fileRef.current?.click()}
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            {uploadLabel}
          </Button>
        </div>
      )}
    </>
  );
};

export default ReceiptCapture;
