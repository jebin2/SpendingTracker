# Transaction Detail & Edit

Tap any transaction row — in the dashboard, the transactions list, or anywhere else — to open a bottom sheet showing the full details and options for that transaction.

---

## What you see

**Detail view** shows all the information recorded for the transaction: item name, merchant, date, time, payment method, source, notes, tags, and amount.

If the transaction came from a receipt scan, there are two extra options at the bottom:
- **View all items from this receipt** — shows every line item extracted from the same receipt image.
- **View original receipt image** — opens the original photo in Google Drive.

---

## Editing a transaction

Tap the **edit (pencil) icon** in the top-right to switch to edit mode. You can update any field — item name, amount, date, merchant, category, payment method, notes. Tap the **tick icon** to save.

Changes are saved to the sheet immediately. If you are offline, the change is queued and synced automatically when connectivity returns.

---

## Deleting a transaction

Tap the **delete (bin) icon** in the top-right. You will be asked to confirm. The transaction is soft-deleted from the sheet — it disappears from the list but is not permanently erased.

---

## In-flight and failed receipts

If a receipt is still being processed by AI, the sheet shows a spinner and a message instead of the transaction details. Once AI finishes, the detail view updates automatically.

If AI failed to read the receipt, a **Retry AI** button appears so you can re-trigger processing without re-uploading the image.
