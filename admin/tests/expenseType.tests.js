import assert from 'assert';
import { EXPENSE_TYPES, DOCUMENT_MIME, isInvoice, isPdf } from '/imports/common/lib/expenseType';

describe('expenseType', function () {
  it('knows receipts and invoices', function () {
    assert.deepStrictEqual(EXPENSE_TYPES, ['receipt', 'invoice']);
  });

  it('treats only an explicit invoice as an invoice', function () {
    assert.strictEqual(isInvoice({ type: 'invoice' }), true);
    assert.strictEqual(isInvoice({ type: 'receipt' }), false);
    // Expenses from before the field existed are receipts.
    assert.strictEqual(isInvoice({}), false);
    assert.strictEqual(isInvoice(null), false);
  });

  it('accepts images and PDFs as documents', function () {
    assert.ok(DOCUMENT_MIME.includes('application/pdf'));
    assert.ok(DOCUMENT_MIME.includes('image/jpeg'));
    assert.ok(!DOCUMENT_MIME.includes('text/html'));
  });

  it('recognises a PDF document', function () {
    assert.strictEqual(isPdf('application/pdf'), true);
    assert.strictEqual(isPdf('image/png'), false);
    assert.strictEqual(isPdf(undefined), false);
  });
});
