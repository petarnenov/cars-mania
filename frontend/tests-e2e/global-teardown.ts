import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PID_FILE = path.resolve(__dirname, '.backend-pid')

export default async function globalTeardown() {
	try {
		const pid = fs.existsSync(PID_FILE) ? Number(fs.readFileSync(PID_FILE, 'utf8')) : 0
		if (pid) {
			try { process.kill(pid) } catch {}
			fs.unlinkSync(PID_FILE)
		}
	} catch {}
}


