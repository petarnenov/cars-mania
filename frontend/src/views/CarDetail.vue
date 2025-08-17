<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { useRoute } from 'vue-router'
import { authState } from '../auth'
import { toastError, toastSuccess } from '../toast'

const route = useRoute()
const car = ref<any>(null)
const loading = ref(false)
const error = ref('')
const message = ref('')
const sending = ref(false)

async function load() {
	loading.value = true
	error.value = ''
	try {
		car.value = await api(`/cars/${route.params.id}`)
	} catch (e: any) {
		error.value = e.message || 'Failed to load car'
	} finally {
		loading.value = false
	}
}

onMounted(load)

async function sendMessage() {
	sending.value = true
	try {
		await api(`/cars/${route.params.id}/message`, { method: 'POST', body: JSON.stringify({ body: message.value }) })
		message.value = ''
		toastSuccess('Message sent')
	} catch (e: any) {
		toastError(e.message || 'Failed to send message')
	} finally {
		sending.value = false
	}
}
</script>

<template>
	<div class="container">
		<p v-if="loading">Loading…</p>
		<p v-if="error" class="error">{{ error }}</p>
		<div v-if="car">
			<h1>{{ car.brand }} {{ car.model }}</h1>
			<div class="gallery" v-if="car.images?.length">
				<img v-for="img in car.images" :key="img.url" :src="'/api' + img.url" class="photo" />
			</div>
			<p>{{ car.description }}</p>
			<p><b>Color:</b> {{ car.color }} • <b>First reg:</b> {{ new Date(car.firstRegistrationDate).toLocaleDateString() }}</p>
			<p class="price">{{ (car.priceCents/100).toFixed(2) }}</p>
			<div v-if="authState.user && authState.user.id !== car.ownerId" class="msg">
				<textarea v-model="message" rows="3" placeholder="Write a message to the seller..."></textarea>
				<button :disabled="sending || !message.trim()" @click="sendMessage">Send</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
.price { font-weight: 700; }
.error { color: #d33; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .5rem; margin: 1rem 0; }
.photo { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }
.msg { margin-top: 1rem; display: flex; flex-direction: column; gap: .5rem; }
textarea { width: 100%; padding: .5rem; }
</style>


