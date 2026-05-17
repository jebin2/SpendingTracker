# iPhone Shortcut Automation

Lets your iPhone automatically send bank SMS messages to FundsFlee the moment they arrive, so transactions are logged without any manual steps.

---

## How to use it

Go to **Settings**, then **iPhone Shortcut**. Follow the on-screen setup guide to connect FundsFlee to the iOS Shortcuts app.

For the fastest setup, tap **Install Shortcut** — this creates the shortcut on your iPhone with everything already configured. Just tap **Add Shortcut** when prompted.

---

## What happens step by step

### One-time setup

1. Open the **iPhone Shortcut** settings page in FundsFlee. Your personal access token is shown — this is used to securely link your phone to your account.

2. Tap **Install Shortcut** to open the Shortcuts app with the shortcut ready to install, or follow the manual steps to set it up yourself.

3. In the Shortcuts app, create a Personal Automation that triggers when a message arrives from your bank. Point it at the shortcut you just installed. Turn off "Ask Before Running" so it works silently.

### Every time a bank SMS arrives

1. Your iPhone detects the message and the shortcut runs automatically in the background.

2. The SMS text is sent securely to FundsFlee, where AI reads it and extracts the transaction details — amount, merchant, date, category, and payment method.

3. The transaction is added to your list immediately. No spinning, no waiting — it just appears.

---

## Token security

Your access token is private and ties the shortcut to your account. If you think it has been compromised, tap **Regenerate Token** in settings and reinstall the shortcut with the new token.

---

## Related features

SMS text can also be pasted manually using the **Capture** screen if you prefer not to use the shortcut automation.
