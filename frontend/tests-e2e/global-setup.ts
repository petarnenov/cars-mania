/// <reference types="node" />
import type { FullConfig } from '@playwright/test'
import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PID_FILE = path.resolve(__dirname, '.backend-pid')

export default async function globalSetup(_config: FullConfig) {
	const backendDir = path.resolve(__dirname, '../../backend')
	const env = {
		...process.env,
		NODE_ENV: 'test',
		PORT: '3301',
		JWT_ACCESS_SECRET: 'test_access_secret',
		JWT_REFRESH_SECRET: 'test_refresh_secret',
		ACCESS_TOKEN_TTL_SECONDS: '900',
		REFRESH_TOKEN_TTL_SECONDS: '1209600',
		DATABASE_URL: 'file:./test-e2e.db',
	}

	// Ensure schema is in place for a fresh db
	execSync('npx prisma db push', { cwd: backendDir, env, stdio: 'inherit' })
	// Generate Prisma client for TS runtime
	execSync('npx prisma generate', { cwd: backendDir, env, stdio: 'inherit' })

	// Start backend in watch mode (fast startup via tsx)
	const child = spawn('npm', ['run', 'dev'], { cwd: backendDir, env, stdio: 'inherit' })
	fs.writeFileSync(PID_FILE, String(child.pid))

	// wait for /api/health to be reachable
	const base = 'http://127.0.0.1:3301/api/health'
	const started = await waitFor(async () => {
		try {
			const res = await fetch(base)
			if (res.ok) return true
		} catch {}
		return false
	}, 20_000, 300)
	if (!started) throw new Error('Backend failed to start for e2e')

	// Expose backend URL for Vite proxy
	process.env.BACKEND_URL = 'http://127.0.0.1:3301'
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number, intervalMs: number) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		if (await check()) return true
		await new Promise(r => setTimeout(r, intervalMs))
	}
	return false
}


