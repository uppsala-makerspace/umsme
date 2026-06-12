import { WebApp } from "meteor/webapp";
import { makeReceiptHandler } from "/imports/common/server/receiptToken";

// Serves receipt images for signed capability URLs (see common/server/
// receiptToken.js). Tokens are minted by expenses.adminGetReceiptUrl after the
// role check.
WebApp.handlers.use("/api/expenses", makeReceiptHandler());
