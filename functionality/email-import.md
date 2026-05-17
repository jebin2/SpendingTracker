# Gmail Email Import

Automatically reads your bank and payment emails from Gmail and adds the transactions to FundsFlee without any manual entry.

---

## How to use it

Go to **Settings**, then **Email Import**. Enter the sender names or keywords from your bank emails (for example, "HDFC" or "SBI"), then tap **Save**. From that point on, the import runs on its own every day.

You can also tap **Fetch now** to run it immediately.

---

## What happens step by step

1. When the import runs, FundsFlee checks your Gmail for new emails from the senders you configured.

2. Each new email is read by AI, which decides whether it contains a payment transaction. Promotional emails, OTPs, and non-transaction messages are quietly skipped.

3. Each payment found is added to your transaction list with the merchant, amount, date, category, and payment method already filled in.

4. After import, the new transactions are automatically checked for duplicates — if any match entries added from other sources, they are flagged.

5. The import runs silently in the background each time you open the app (if more than 23 hours have passed) and again at noon every day.

---

## Cooldown / limits

The import fetches emails from the last 7 days by default. You can change this lookback window in the Email Import settings. Running it twice in quick succession is safe — it will not create duplicate entries for emails it has already processed.

---

## Related features

Flagged duplicates appear in the **Duplicates** view in the Transactions filter bar.
