const crypto = require('crypto');
const iv = '1234567891113150';
const algorithm = 'aes-128-cbc';

/**@param {String} text 
 * @param {String} key 
 * @returns {String} 
 */
function Encrypt(text, key) {
    const secret = crypto.scryptSync(key, 'salt', 16);;
    let cipher = crypto.createCipheriv(algorithm, secret, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
}

/**@param {String} text 
 * @param {String} key 
 * @returns {String} 
 */
function Decrypt(text, key) {
    const secret = crypto.scryptSync(key, 'salt', 16);;
    let encryptedText = Buffer.from(text, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, secret, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = {
    Encrypt,
    Decrypt
}