import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';

// The bank export: a bank report in, a SIE file and the unrecognized rest
// out, nothing stored. Written against the Blaze page and meant to pass
// against its replacement (see liability.spec.ts).

// Swedbank's format: a comment line, the column header, then rows. Nothing
// here matches the e2e data, so every row comes back as remaining.
const REPORT = [
  '* Transaktionsrapport Period 2026-05-22 - 2026-06-21',
  'Radnr,Clnr,Kontonr,Produkt,Valuta,Bokfdag,Transdag,Valutadag,Referens,Text,Belopp,Saldo',
  '1,00000,9999999999,"Foretagskonto",SEK,2026-06-22,2026-06-21,2026-06-22,"1111111111","Swish +46700000001",350.00,393752.52',
  '2,00000,9999999999,"Foretagskonto",SEK,2026-05-25,2026-05-25,2026-05-25,"Hyra Juni","Pg-bet. via internet",-74000.00,369551.25',
].join('\r\n') + '\r\n';

const upload = (page: Page) => page.getByLabel(/bank file/i).setInputFiles({ name: 'transaktioner.csv', mimeType: 'text/csv', buffer: Buffer.from(REPORT, 'latin1') });

test.describe('Bank export', () => {
  test('sums up a bank report and offers the files', async ({ page }) => {
    await openAs(page, 'treasurer', '/accounting/bankexport');
    await expect(page.getByRole('heading', { name: /^bank export$/i, level: 1 })).toBeVisible();
    await upload(page);
    await expect(page.getByRole('heading', { name: /^summary$/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /total in file/i })).toContainText('2');
    await expect(page.getByText(/^OK$/)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /download remaining csv/i }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('is not for the board', async ({ page }) => {
    await openAs(page, 'board', '/accounting/bankexport');
    await upload(page);
    await expect(page.getByText(/insufficient role|not authorized|no access|do not have access/i)).toBeVisible();
  });
});
