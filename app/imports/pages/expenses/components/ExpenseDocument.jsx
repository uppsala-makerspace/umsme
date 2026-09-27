import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { isPdf } from "/imports/common/lib/expenseType";

/**
 * The receipt or invoice behind an expense. Images are shown inline; a PDF
 * cannot be, so it gets a card that opens it in a new tab. Both link to the
 * signed URL.
 */
const ExpenseDocument = ({ url, mimeType, invoice, className = "" }) => {
  const { t } = useTranslation();
  if (isPdf(mimeType)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-3 p-4 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50 ${className}`}
      >
        <DocumentTextIcon className="w-10 h-10 flex-shrink-0 text-red-600" aria-hidden="true" />
        <span className="flex-1 font-semibold">{t(invoice ? "expenseOpenPdf" : "expenseOpenReceiptPdf")}</span>
        <ArrowTopRightOnSquareIcon className="w-5 h-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`block ${className}`}>
      <img
        src={url}
        alt={t(invoice ? "expenseTypeInvoice" : "expenseReceipt")}
        className="w-full rounded-lg border border-gray-200"
      />
    </a>
  );
};

ExpenseDocument.propTypes = {
  url: PropTypes.string.isRequired,
  mimeType: PropTypes.string,
  invoice: PropTypes.bool,
  className: PropTypes.string,
};

export default ExpenseDocument;
