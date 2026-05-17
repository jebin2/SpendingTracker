# Bank Statement Import

Lets you upload a PDF bank statement so FundsFlee can automatically read and add all your debit transactions.

---

## How to use it

Go to **Settings** and tap **Import Statement**. Choose a PDF file from your device (up to 20 MB) and tap **Upload**.

---

## What happens step by step

1. As soon as you tap Upload, the PDF is saved to your account and you are taken to your **Transactions** list.

2. A temporary "Bank Statement" entry appears at the top of the list with a **processing indicator** — this shows the import is in progress.

3. In the background, AI reads through your statement and pulls out each debit transaction — cleaning up merchant names and filling in categories automatically.

4. When finished, the placeholder disappears and all the extracted transactions appear in the list, ready to view and edit.

5. If something goes wrong during reading, the placeholder shows an error indicator. The app will retry automatically on its next scheduled run.

---

## What gets imported

Only debit (money-out) transactions are extracted. Credit entries and balance summaries are ignored.

---

## Related features

Imported transactions go through the same duplicate check as email imports — if a transaction already exists from another source, it will be flagged.
