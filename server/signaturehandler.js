const crypto = require('crypto');

module.exports = {VerifyString,SignString};

function VerifyString(plainText,signature,pubkey){
	const verifier = crypto.createVerify('RSA-SHA256');
	verifier.update(JSON.stringify(plainText));
	let result = verifier.verify(Buffer.from(pubkey,'utf-8'),Buffer.from(signature,'base64'));
	return result;
}

function SignString (plainText,keyString) {
	const signer = crypto.createSign('RSA-SHA256');
	signer.write(plainText);
	signer.end();
	return signer.sign(keyString, 'base64')
}