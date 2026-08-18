#!/usr/bin/env node
// Prints a fresh Ed25519 key pair (base64 PEM) for JWT_PRIVATE_KEY / JWT_PUBLIC_KEY.
import { generateKeyPairSync } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const b64 = (k, type) => Buffer.from(k.export({ type, format: 'pem' })).toString('base64');
console.log(`JWT_PRIVATE_KEY=${b64(privateKey, 'pkcs8')}`);
console.log(`JWT_PUBLIC_KEY=${b64(publicKey, 'spki')}`);
