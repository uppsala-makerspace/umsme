import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { isInvoice } from "/imports/common/lib/expenseType";
import { formatDate } from "../utils";

/**
 * Marks an expense row as an invoice, with its due date while it is still
 * unpaid — the one thing that tells an invoice apart in a list. Renders
 * nothing for receipts.
 */
const InvoiceBadge = ({ expense, className = "" }) => {
  const { t, i18n } = useTranslation();
  if (!isInvoice(expense)) return null;
  const unpaid = expense.status !== "reimbursed" && expense.dueDate;
  return (
    <span className={`inline-block rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-1 ${className}`}>
      {t("expenseTypeInvoice")}
      {unpaid && ` · ${t("expenseDueShort", { date: formatDate(expense.dueDate, i18n.language || "sv") })}`}
    </span>
  );
};

InvoiceBadge.propTypes = {
  expense: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default InvoiceBadge;
