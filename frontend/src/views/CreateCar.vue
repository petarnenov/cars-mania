<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../api'
import { toastError, toastSuccess } from '../toast'
import { useRouter } from 'vue-router'

const router = useRouter()
const brand = ref('')
const model = ref('')
const firstRegistrationDate = ref('') // yyyy-mm-dd
const color = ref('')
const price = ref<number | null>(null) // in major units
const description = ref('')
const loading = ref(false)
const error = ref('')
const createdId = ref<string | null>(null)
const files = ref<FileList | null>(null)

function toCents(value: number) { return Math.round(value * 100) }

async function createCar() {
	loading.value = true
	error.value = ''
	try {
		if (price.value == null || Number.isNaN(price.value)) throw new Error('Price is required')
		const data = await api('/cars', {
			method: 'POST',
			body: JSON.stringify({
				brand: brand.value,
				model: model.value,
				firstRegistrationDate: firstRegistrationDate.value,
				color: color.value,
				priceCents: toCents(price.value),
				description: description.value,
			}),
		})
		createdId.value = data.id
		toastSuccess('Draft created')
	} catch (e: any) {
		error.value = e.message || 'Failed to create car'
		toastError(error.value)
	} finally {
		loading.value = false
	}
}

async function submitForReview() {
	if (!createdId.value) return
	loading.value = true
	error.value = ''
	try {
		await api(`/cars/${createdId.value}/submit`, { method: 'POST' })
		toastSuccess('Submitted for review')
		router.push('/')
	} catch (e: any) {
		error.value = e.message || 'Failed to submit for review'
		toastError(error.value)
	} finally {
		loading.value = false
	}
}

async function uploadImages() {
	if (!createdId.value || !files.value || files.value.length === 0) return
	const form = new FormData()
	Array.from(files.value).slice(0, 3).forEach((f) => form.append('images', f))
	loading.value = true
	error.value = ''
	try {
		await fetch(`/api/upload/cars/${createdId.value}/images`, {
			method: 'POST',
			credentials: 'include',
			body: form,
		})
		toastSuccess('Images uploaded')
	} catch (e: any) {
		error.value = e.message || 'Failed to upload images'
		toastError(error.value)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="container">
		<h1>New Car</h1>
		<form @submit.prevent="createCar">
			<label>Brand</label>
			<input v-model="brand" required />
			<label>Model</label>
			<input v-model="model" required />
			<label>First registration</label>
			<input v-model="firstRegistrationDate" type="date" required />
			<label>Color</label>
			<input v-model="color" required />
			<label>Price</label>
			<input v-model.number="price" type="number" step="0.01" min="0" required />
			<label>Description</label>
			<textarea v-model="description" required rows="4" />
			<button :disabled="loading" type="submit">{{ loading ? '...' : 'Create Draft' }}</button>
		</form>
		<div v-if="createdId" class="post-create">
			<p>Created draft: {{ createdId }}</p>
			<div class="uploader">
				<input type="file" accept="image/*" multiple @change="files = ($event.target as HTMLInputElement).files" />
				<button :disabled="loading" @click="uploadImages">Upload up to 3 images</button>
			</div>
			<button :disabled="loading" @click="submitForReview">Submit for review</button>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<style scoped>
.container { max-width: 640px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem; }
label { display: block; margin-top: 0.5rem; }
input, textarea { width: 100%; padding: 0.5rem; }
button { margin-top: 1rem; }
.error { color: #d33; }
.post-create { margin-top: 1rem; display: flex; align-items: center; gap: 1rem; }
.uploader { display: flex; align-items: center; gap: .5rem; }
</style>


