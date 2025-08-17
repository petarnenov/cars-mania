<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api'

type Car = {
	id: string
	brand: string
	model: string
	firstRegistrationDate: string
	color: string
	priceCents: number
	description: string
	status: 'DRAFT'|'PENDING'|'VERIFIED'|'REJECTED'
}

const items = ref<Car[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
	loading.value = true
	error.value = ''
	try {
		const res = await api('/cars/admin/list?status=PENDING')
		items.value = res.items
	} catch (e: any) {
		error.value = e.message || 'Failed to load'
	} finally {
		loading.value = false
	}
}

async function verify(id: string) {
	await api(`/cars/admin/${id}/verify`, { method: 'POST' })
	items.value = items.value.filter(i => i.id !== id)
}

async function reject(id: string) {
	const reason = prompt('Reason (optional)') || undefined
	await api(`/cars/admin/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
	items.value = items.value.filter(i => i.id !== id)
}

onMounted(load)
</script>

<template>
	<div class="container">
		<h1>Pending Cars</h1>
		<p v-if="loading">Loading…</p>
		<p v-if="error" class="error">{{ error }}</p>
		<table v-if="!loading && items.length" class="list">
			<thead>
				<tr>
					<th>Brand</th>
					<th>Model</th>
					<th>Price</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="c in items" :key="c.id">
					<td>{{ c.brand }}</td>
					<td>{{ c.model }}</td>
					<td>{{ (c.priceCents/100).toFixed(2) }}</td>
					<td>
						<button @click="verify(c.id)">Verify</button>
						<button @click="reject(c.id)">Reject</button>
					</td>
				</tr>
			</tbody>
		</table>
		<p v-else-if="!loading">No pending items</p>
	</div>
</template>

<style scoped>
.container { max-width: 900px; margin: 2rem auto; }
.list { width: 100%; border-collapse: collapse; }
.list th, .list td { border-bottom: 1px solid #eee; text-align: left; padding: 0.5rem; }
button { margin-right: 0.5rem; }
.error { color: #d33; }
</style>


