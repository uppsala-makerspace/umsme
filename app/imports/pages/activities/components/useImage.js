import { Meteor } from "meteor/meteor";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { downscaleImage } from "/imports/lib/images";

/**
 * The image of an activity or event being edited: chosen images are made
 * smaller on the phone (1600 px, JPEG) and uploaded at once with
 * `<prefix>.uploadImage`; for one not created yet the image waits and
 * `uploadPending(id)` uploads it once it is. `load` gives the image as it
 * now is: { url, own }.
 *
 * @param {{ prefix: "activities"|"events", docId?: string, load: () => Promise<{ url: string|null, own: boolean }> }} options
 */
export const useImage = ({ prefix, docId, load }) => {
  const { t } = useTranslation();
  const [shown, setShown] = useState({ url: null, own: false });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => setShown(await load());

  const select = async (file) => {
    setBusy(true);
    setError(null);
    try {
      const image = await downscaleImage(file);
      if (docId) {
        await Meteor.callAsync(`${prefix}.uploadImage`, docId, image.base64, image.mimeType);
        await refresh();
      } else {
        setPending(image);
      }
    } catch (err) {
      setError(err.reason || t("imageFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    if (!docId) {
      setPending(null);
      return;
    }
    setBusy(true);
    try {
      await Meteor.callAsync(`${prefix}.removeImage`, docId);
      await refresh();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setBusy(false);
    }
  };

  /** Upload the image chosen before the thing existed. */
  const uploadPending = async (id) => {
    if (pending) await Meteor.callAsync(`${prefix}.uploadImage`, id, pending.base64, pending.mimeType);
  };

  const pendingUrl = pending ? `data:${pending.mimeType};base64,${pending.base64}` : null;
  return {
    setShown,
    uploadPending,
    // ImageCard's props, but for `inherited` and `kind`, which the page knows.
    card: {
      imageUrl: pendingUrl || shown.url,
      own: !!pendingUrl || shown.own,
      busy,
      error,
      onSelect: select,
      onRemove: remove,
    },
  };
};
