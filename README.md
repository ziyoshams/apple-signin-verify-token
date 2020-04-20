# About
A small package that helps you verify Apple SignIn token on the server.
It uses Apple public keys to verify the **token**. [Apple website guide](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens). This package exists, because there isn't clear instructions from apple on how to do this.

This package uses  [jwks-rsa](https://www.npmjs.com/package/jwks-rsa) to retrieve RSA signing keys from Apple's JWKS (JSON Web Key Set) endpoint and generates a public key. [Apple guide](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens).  
 Then uses
 [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) to verify your **token** with that public key.

This package exports only one method `verify(token: string)`.

# Methods
### `.verify(token)`
Takes 1 `string` argument.   
Returns a `Promise` 
# Usage

Install:
```
npm i apple-signin-verify-token
```

Use it in your node.js sever
```
const Verifier = require("apple-signin-verify-token");

const token = 'LONG_TOKEN'; // token that apple sign in provides.

Verififier.verify(token).then(response => {
  // see response format below.
}).catch(error => {
  console.log(error);
})
```

**Response**  
Read the guide by Apple
[Authenticating Users with Sign in with Apple
](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple)
```
{
  iss: 'https://appleid.apple.com',
  aud: 'YOUR_BUNDLE_ID',
  exp: 1587334349,
  iat: 1587333749,
  sub: '001393.6d621dadasdd04956bds129fa982ba.1517', // user's unique ID by apple
  c_hash: 'dZusyqBNIzmfd8Uv_cVKSw',
  email: 'abcd@privaterelay.appleid.com', // user's email 
  email_verified: 'true',
  is_private_email: 'true',
  auth_time: 1587333749,
  nonce_supported: true
}

```
---
</br>  
</br>  
</br>  
    
# Example usage

Assuming you are using Express.js

```

const Verifier = require('apple-signin-verify-token');

...

// pass the token and unique identifier given by client.
app.post('/apple-login', async (req, res) => {
  try {
    const { identityToken, userID } = req.body;

    const credentials = await Verifier.verify(identityToken);
    const { email, iss, sub } = credentials;

    // make sure the token is issued by apple and comes from current user.
    if (iss === 'https://appleid.apple.com' && sub === userID) {
      // find or create the user by userID

      res.status(200).send(/* user info */);
    } else {
      throw new Error('Invalid token.');
    }
  } catch (err) {
    return res.status(401).send(err.message);
  }
});
```
You should go over Apple's explanations on [Verifying a User](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user)
# When would you get an error?

If the token is expired or it has been tempered with, Apple servers will reject it and you will get `Could not verify token` error message.