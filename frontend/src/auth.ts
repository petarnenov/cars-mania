import { reactive } from 'vue'
import { api } from './api'

type Role = 'USER' | 'ADMIN'

export const authState = reactive<{ loaded: boolean; user: null | { id: string; email: string; role: Role } }>({

	loaded: false,
	user: null,
})

export async function fetchMe() {
	try {
		authState.user = await api('/auth/me')
	} catch {
		authState.user = null
	} finally {
		authState.loaded = true
	}
}

export function requireRole(role: Role) {
	return !!authState.user && authState.user.role === role
}


