import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ReceiptPercentIcon, DocumentTextIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import MainContent from "/imports/components/MainContent";
import ReceiptCapture from "../components/ReceiptCapture";

const CHOICES = [
  { type: "receipt", Icon: ReceiptPercentIcon, titleKey: "expenseTypeReceipt", hintKey: "expenseTypeReceiptHint" },
  { type: "invoice", Icon: DocumentTextIcon, titleKey: "expenseTypeInvoice", hintKey: "expenseTypeInvoiceHint" },
];

/**
 * Starting a new expense: first choose receipt or invoice, then take a photo
 * or upload the document. With no `type` the two choices are shown; with one,
 * the capture step for that type.
 */
const NewExpense = ({ type, busy, onChooseType, onCapture }) => {
  const { t } = useTranslation();

  if (!type) {
    return (
      <MainContent>
        <h2 className="text-2xl mb-3">{t("expenseNew")}</h2>
        <p className="text-gray-600 mb-6">{t("expenseTypeQuestion")}</p>
        <ul className="list-none p-0 m-0">
          {CHOICES.map(({ type: choice, Icon, titleKey, hintKey }) => (
            <li key={choice} className="mb-3">
              <button
                type="button"
                onClick={() => onChooseType(choice)}
                className="flex items-center gap-4 w-full p-4 text-left rounded-lg bg-white border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <Icon className="w-8 h-8 flex-shrink-0 text-brand-green" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{t(titleKey)}</span>
                  <span className="block text-sm text-gray-500 mt-0.5">{t(hintKey)}</span>
                </span>
                <ChevronRightIcon className="w-5 h-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </MainContent>
    );
  }

  const invoice = type === "invoice";
  return (
    <MainContent>
      <h2 className="text-2xl mb-3">{t(invoice ? "expenseNewInvoice" : "expenseNewReceipt")}</h2>
      <p className="text-gray-600 mb-6">{t(invoice ? "expenseNewInvoiceIntro" : "expenseNewIntro")}</p>
      <ReceiptCapture onCapture={onCapture} busy={busy} invoice={invoice} />
    </MainContent>
  );
};

NewExpense.propTypes = {
  type: PropTypes.oneOf(["receipt", "invoice"]),
  busy: PropTypes.bool,
  onChooseType: PropTypes.func,
  onCapture: PropTypes.func,
};

NewExpense.defaultProps = {
  type: null,
  busy: false,
  onChooseType: () => {},
  onCapture: () => {},
};

export default NewExpense;
