# Integration Guide: Login with DIDChain

Allow your users to sign in using their **DIDChain Identity**. This ensures your users have a verified on-chain identity and a trust score.

> [!TIP]
> For a live interactive version of this guide, visit the **[Professional Docs](/docs)** route on your deployed instance.

## 1. Add the Button
Copy and paste this HTML snippet into your website:

```html
<!-- Add the Styles -->
<link rel="stylesheet" href="https://did-blockchain.onrender.com/css/did-button.css">

<!-- The Button -->
<a href="https://did-blockchain.onrender.com/authorize?redirect_uri=YOUR_URL" class="did-connect-button">
  <span class="did-icon">⬡</span>
  Sign in with DIDChain
</a>
```

## 2. Handle the Redirect
After the user authorizes, your website will receive a redirect like this:
`https://your-site.com/callback?did_token=JWT_TOKEN_HERE&address=0x...`

## 3. Verify the Token (Backend)
To ensure the identity is real and hasn't been tampered with, your backend should verify the token:

```javascript
const response = await fetch('https://did-blockchain.onrender.com/verify-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'JWT_TOKEN_HERE' })
});

const result = await response.json();
if (result.valid) {
  console.log("Verified User:", result.data.sub);
  console.log("Trust Score:", result.data.score);
}
```

## Why use DIDChain Login?
1. **Verified Users**: Every user must have a registered identity on the Sepolia blockchain.
2. **Reputation-based Access**: You can block users with low "Trust Scores".
3. **No Passwords**: Users log in with their private keys via MetaMask.

## Next Steps
- Try the **[Live Demo](https://did-blockchain.onrender.com/demo/index.html)**.
- Explore the **[Full API Docs](https://did-blockchain.onrender.com/docs)**.
