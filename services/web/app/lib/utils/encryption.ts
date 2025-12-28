import crypto from 'crypto'

// Using AES-256-GCM for encryption, which is more secure than CBC mode
// It provides both confidentiality and authenticity
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits for AES
const AUTH_TAG_LENGTH = 16 // 128 bits

// Generate a secure encryption key from a password/secret
export function generateEncryptionKey(secret: string): Buffer {
	// Use PBKDF2 with a high iteration count for key derivation
	const salt = crypto.randomBytes(16)
	return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512')
}

// Generate a secure random IV (Initialization Vector)
export function generateIV(): Buffer {
	return crypto.randomBytes(IV_LENGTH)
}

// Encrypt data using AES-256-GCM
export function encrypt(
	text: string,
	key: Buffer
): {
	encryptedData: string
	iv: string
	authTag: string
} {
	try {
		const iv = generateIV()

		const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

		let encrypted = cipher.update(text, 'utf8', 'hex')
		encrypted += cipher.final('hex')

		const authTag = cipher.getAuthTag().toString('hex')

		return {
			encryptedData: encrypted,
			iv: iv.toString('hex'),
			authTag,
		}
	} catch (error) {
		console.error('Error in encrypt function:', error)
		throw new Error(
			`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}

// Decrypt data using AES-256-GCM
export function decrypt(
	encryptedData: string,
	iv: string,
	authTag: string,
	key: Buffer
): string {
	const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))

	// Set the authentication tag
	decipher.setAuthTag(Buffer.from(authTag, 'hex'))

	let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
	decrypted += decipher.final('utf8')

	return decrypted
}

// Encrypt an API key for storage
export function encryptApiKey(
	apiKey: string,
	secret: string
): {
	encryptedKey: string
	iv: string
	authTag: string
} {
	if (!apiKey) {
		console.error('Error: API key is empty or null')
		throw new Error('API key cannot be empty')
	}

	if (!secret) {
		console.error('Error: Encryption secret is empty or null')
		throw new Error('Encryption secret cannot be empty')
	}

	try {
		const key = crypto.pbkdf2Sync(
			secret,
			'static-salt-for-api-keys',
			100000,
			KEY_LENGTH,
			'sha512'
		)

		const result = encrypt(apiKey, key)
		// Map encryptedData to encryptedKey for the expected return format
		return {
			encryptedKey: result.encryptedData,
			iv: result.iv,
			authTag: result.authTag,
		}
	} catch (error) {
		console.error('Error in encryptApiKey:', error)
		throw new Error(
			`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}

// Decrypt an API key from storage
export function decryptApiKey(
	encryptedKey: string,
	iv: string,
	authTag: string,
	secret: string
): string {
	const key = crypto.pbkdf2Sync(
		secret,
		'static-salt-for-api-keys',
		100000,
		KEY_LENGTH,
		'sha512'
	)
	return decrypt(encryptedKey, iv, authTag, key)
}
