const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

/**
 * Verified apple sign in token Result.
 * @typedef {Object} DecodedToken
 * @property {string} iss - https://appleid.apple.com.
 * @property {string} aud - Your bundle id.
 * @property {number} exp - expiration.
 * @property {number} iat - issued at time.
 * @property {string} sub - user's unique ID.
 * @property {string} c_hash - hash.
 * @property {string} email - user's hidden or unhidden email (e.g abc@privaterelay.appleid.com).
 * @property {boolean} email_verified - if email is verified.
 * @property {boolean} is_private_email - if email is private.
 * @property {boolean} auth_time - login time.
 * @property {boolean} nonce_supported - .
 */

class AppleAuthTokenVerifier {
  constructor() {
    this.client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });
  }

  getKeys() {
    return new Promise((resolve, reject) => {
      this.client.getKeys((err, keys) => {
        if (err) return reject(err);

        return resolve(keys);
      });
    });
  }

  /**
   * Internal use only.
   * Generates RSA public key from Apple's JWKS
   * @param {string} kid property of Apple public keys
   * @return {Promise<string>} returns RSA public key.
   */
  getPublicKey(kid) {
    return new Promise((resolve, reject) => {
      this.client.getSigningKey(kid, (err, key) => {
        if (err) return reject(err);

        const signingKey = key.getPublicKey();

        return resolve(signingKey);
      });
    });
  }

  /**
   * Internal use only.
   * Verifies token passed to .verify method agains Apple's RSA public key.
   * @param {string} identityToken Apple's sign-in token
   * @param {string} publicKey generated RSA key.
   * @return {Promise<DecodedToken>} Returns decoded token data
   */
  verifyJwtToken(identityToken, publicKey) {
    return new Promise((resolve, reject) => {
      jwt.verify(identityToken, publicKey, (err, decoded) => {
        if (err) return reject(err);

        return resolve(decoded);
      });
    });
  }

  /**
   * Verifies if the token is valid.
   * If it is valid it returnes a decoded token object.
   * Or if it is expired or not valid, it returns Error with "Could not verify token" message.
   * @param {string} identityToken token send from the client
   * @return {Promise<DecodedToken | Error>}
   */
  verify(identityToken) {
    return new Promise(async (resolve, reject) => {
      try {
        // get public keys from apple servers (https://appleid.apple.com/auth/keys)
        const keys = await this.getKeys();

        // for each public key generate
        const publicKeyPromises = keys.map(key => this.getPublicKey(key.kid));
        const publicKeys = await Promise.all(publicKeyPromises);
        const verifiedTokenPromises = publicKeys.map(publicKey =>
          this.verifyJwtToken(identityToken, publicKey).catch(e => null)
        );

        const decodedTokens = await Promise.all(verifiedTokenPromises);

        // most likely, one of the public keys will not verify the token
        // therefore, we need to filter out null values, then pop the verified value
        const result = decodedTokens.filter(elem => elem).pop();

        if (!result) return reject(new Error('Could not verify token'));

        return resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
}

module.exports = new AppleAuthTokenVerifier();
