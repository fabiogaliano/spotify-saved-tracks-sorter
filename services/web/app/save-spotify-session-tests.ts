import { fileURLToPath } from 'url'
import path from 'path'
import { writeFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const filePath = path.resolve(__dirname, '../tests/spotify.session.json')

export default async function saveSessionToFile(sessionData: any) {
	try {
		const sessionString = JSON.stringify(sessionData, null, 2)

		await writeFile(filePath, sessionString, 'utf8')
		console.log(`Session saved to ${filePath}`)
	} catch (error) {
		console.error('Error writing session to file:', error)
	}
}
