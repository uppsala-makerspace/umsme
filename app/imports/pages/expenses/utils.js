export const EXPENSE_STATUSES = ["pending", "submitted", "rejected", "confirmed", "reimbursed"];

export const EDITABLE_STATUSES = ["pending", "rejected"];

export const isEditable = (status) => EDITABLE_STATUSES.includes(status);

export const formatDate = (date, lang) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US");
};

// For <input type="date"> value (YYYY-MM-DD).
export const toDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

/**
 * Downscale an image File to a JPEG data URL (long edge <= maxEdge).
 * Returns { base64, mimeType } where base64 is the raw (no data: prefix) payload.
 */
export const downscaleImage = (file, maxEdge = 1600, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.replace(/^data:[^;]+;base64,/, ""), mimeType: "image/jpeg" });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
