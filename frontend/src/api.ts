export async function api(path: string, init: RequestInit = {}) {
	const headers = new Headers(init.headers || {})
	if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
	const res = await fetch(`/api${path}`,
		{ credentials: 'include', ...init, headers }
	)
	if (!res.ok) {
		let msg = 'Request failed'
		try { const j = await res.json(); msg = j.error || msg } catch {}
		throw new Error(msg)
	}
	const ct = res.headers.get('content-type') || ''
	return ct.includes('application/json') ? res.json() : res.text()
}


