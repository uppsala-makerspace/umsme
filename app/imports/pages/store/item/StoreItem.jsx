import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import Markdown from "../../../components/Markdown";
import Input from "../../../components/Input";
import { localized } from "/imports/common/lib/groupRules";
import { hasFixedPrice } from "/imports/common/lib/storeRules";

/**
 * One item, and the form for buying it: the amount when the buyer sets it, the
 * comment when the item asks for one, the terms, and the Swish method.
 *
 * Everything validated here is validated again on the server — this is guidance
 * for the buyer, not the control.
 */
const StoreItem = ({
  loading,
  error,
  item,
  termsContent,
  isPaying,
  disabledMessage,
  onBuy,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [method, setMethod] = useState("deeplink");
  const [showTerms, setShowTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !item) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error || t("storeItemNotFound")}</p>
      </MainContent>
    );
  }

  const buyerSetsAmount = !hasFixedPrice(item);
  const numericAmount = Number(amount);
  const amountOk =
    !buyerSetsAmount ||
    (Number.isInteger(numericAmount) &&
      numericAmount > 0 &&
      (item.minPrice === null || numericAmount >= item.minPrice) &&
      (item.maxPrice === null || numericAmount <= item.maxPrice));
  const commentOk = !item.commentRequired || comment.trim().length > 0;
  const canSubmit = item.canBuy && amountOk && commentOk && accepted && !isPaying;

  const bounds = [
    item.minPrice !== null ? `${t("storeMin")} ${item.minPrice} kr` : null,
    item.maxPrice !== null ? `${t("storeMax")} ${item.maxPrice} kr` : null,
  ].filter(Boolean).join(" · ");

  return (
    <MainContent>
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={localized(item.name, lang)}
          className="w-full max-h-64 object-cover rounded-lg mb-4"
        />
      )}

      <h2 className="text-2xl mb-1">{localized(item.name, lang)}</h2>
      <p className="text-sm text-gray-500 mt-0 mb-4">
        {buyerSetsAmount ? t("storeYouSetTheAmount") : `${item.price} kr`}
      </p>

      {localized(item.description, lang) && (
        <Markdown className="text-gray-700 mb-6" startLevel={3}>
          {localized(item.description, lang)}
        </Markdown>
      )}

      {!item.canBuy && (
        <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          {item.requiresMembership ? t("storeNeedsMembership") : t("storeNotAvailable")}
        </div>
      )}

      {disabledMessage && (
        <div className="p-4 mb-6 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
          {disabledMessage}
        </div>
      )}

      {item.canBuy && (
        <div className="flex flex-col gap-4">
          {buyerSetsAmount && (
            <div>
              <label htmlFor="storeAmount" className="block font-semibold mb-1">
                {t("storeAmount")}
              </label>
              <Input
                id="storeAmount"
                type="number"
                inputMode="numeric"
                min={item.minPrice ?? 1}
                max={item.maxPrice ?? undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mb-0"
              />
              {bounds && <p className="text-sm text-gray-500 mt-1">{bounds}</p>}
              {amount !== "" && !amountOk && (
                <p className="text-sm text-red-600 mt-1">{t("storeAmountInvalid")}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="storeComment" className="block font-semibold mb-1">
              {t("storeComment")}
              {!item.commentRequired && (
                <span className="font-normal text-gray-500"> ({t("optional")})</span>
              )}
            </label>
            <textarea
              id="storeComment"
              rows={2}
              placeholder={localized(item.commentPlaceholder, lang) || ""}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-surface border border-black rounded py-2.5 px-3 text-base font-mono w-full box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            />
          </div>

          {termsContent && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 mt-1 accent-[#5fc86f]"
              />
              <span>
                {t("storeAcceptTerms")}{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    // Inside a label: without this the click would also toggle
                    // the checkbox on the way past.
                    e.preventDefault();
                    setShowTerms(true);
                  }}
                  className="underline bg-transparent border-none p-0 cursor-pointer text-brand-green"
                >
                  {t("termsOfPurchase")}
                </button>
              </span>
            </label>
          )}

          <div className="flex flex-col gap-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="storeMethod"
                checked={method === "deeplink"}
                onChange={() => setMethod("deeplink")}
              />
              <span>{t("SwishOnThisDevice")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="storeMethod"
                checked={method === "qr"}
                onChange={() => setMethod("qr")}
              />
              <span>{t("SwishOnOtherDevice")}</span>
            </label>
          </div>

          <Button
            fullWidth
            disabled={!canSubmit || !!disabledMessage}
            onClick={() =>
              onBuy?.(method, {
                amount: buyerSetsAmount ? numericAmount : undefined,
                comment: comment.trim() || undefined,
              })
            }
          >
            {t("Pay")}
          </Button>
        </div>
      )}

      {showTerms && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16 pb-24"
          onClick={() => setShowTerms(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-lg font-semibold">{t("termsOfPurchase")}</h2>
              <button
                onClick={() => setShowTerms(false)}
                aria-label={t("close")}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none bg-transparent border-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <Markdown>{termsContent}</Markdown>
            </div>
            <div className="p-4 border-t">
              <Button fullWidth onClick={() => setShowTerms(false)}>
                {t("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  );
};

StoreItem.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  item: PropTypes.object,
  termsContent: PropTypes.string,
  isPaying: PropTypes.bool,
  disabledMessage: PropTypes.string,
  onBuy: PropTypes.func,
};

StoreItem.defaultProps = {
  loading: false,
  error: null,
  item: null,
  termsContent: null,
  isPaying: false,
  disabledMessage: null,
  onBuy: () => {},
};

export default StoreItem;
