<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from './api'
import { authState, fetchMe } from './auth'
import Toaster from './components/Toaster.vue'

const router = useRouter()
async function logout() {
	try {
		await api('/auth/logout', { method: 'POST' })
	} finally {
		authState.user = null
		router.push('/login')
	}
}

onMounted(() => { if (!authState.loaded) fetchMe() })

const isAuthed = computed(() => !!authState.user)
const isAdmin = computed(() => authState.user?.role === 'ADMIN')
</script>

<template>
	<nav style="display:flex; gap:1rem; padding:1rem; border-bottom:1px solid #eee;">
		<router-link to="/">New Catalog</router-link>
		<router-link v-if="!isAuthed" to="/login">Login</router-link>
		<router-link v-if="!isAuthed" to="/register">Register</router-link>
		<router-link v-if="isAuthed && !isAdmin" to="/cars/new">New Car</router-link>
		<router-link v-if="isAuthed" to="/inbox">Inbox</router-link>
		<router-link v-if="isAdmin" to="/admin/moderation">Admin Queue</router-link>
		<router-link v-if="isAdmin" to="/monitoring">Monitoring</router-link>
		<button v-if="isAuthed" @click="logout">Logout</button>
	</nav>
	<router-view />
	<Toaster />
</template>

<style scoped>
</style>
