<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toastError, toastSuccess } from '../toast'
import { authState } from '../auth'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
	loading.value = true
	error.value = ''
	try {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ email: email.value, password: password.value }),
		})
		if (!res.ok) {
			const m = await res.json().catch(() => ({}))
			throw new Error(m.error || 'Login failed')
		}
		const user = await res.json()
		authState.user = user
		authState.loaded = true
		toastSuccess('Logged in')
		const next = (route.query.next as string) || '/cars/new'
		router.push(next)
	} catch (e: any) {
		error.value = e.message || 'Login failed'
		toastError(error.value)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="container">
		<h1>Login</h1>
		<form @submit.prevent="onSubmit">
			<label>Email</label>
			<input v-model="email" type="email" required />
			<label>Password</label>
			<input v-model="password" type="password" required />
			<button :disabled="loading" type="submit">{{ loading ? '...' : 'Login' }}</button>
			<p v-if="error" class="error">{{ error }}</p>
		</form>
		<p>
			No account? <router-link to="/register">Register</router-link>
		</p>
	</div>
</template>

<style scoped>
.container { max-width: 420px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem; }
label { display: block; margin-top: 0.5rem; }
input { width: 100%; padding: 0.5rem; }
button { margin-top: 1rem; }
.error { color: #d33; }
</style>
