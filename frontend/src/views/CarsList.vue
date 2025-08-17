<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '../api'
import { useRouter } from 'vue-router'

type Car = {
	id: string
	brand: string
	model: string
	firstRegistrationDate: string
	color: string
	priceCents: number
	description: string
	images?: { url: string }[]
}

const router = useRouter()
const items = ref<Car[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const loading = ref(false)
const error = ref('')

const brand = ref('')
const model = ref('')
const color = ref('')
const minPrice = ref<string>('')
const maxPrice = ref<string>('')
const sort = ref<'newest'|'price_asc'|'price_desc'>('newest')

async function load() {
	loading.value = true
	error.value = ''
	try {
		const params = new URLSearchParams()
		if (brand.value) params.set('brand', brand.value)
		if (model.value) params.set('model', model.value)
		if (color.value) params.set('color', color.value)
		if (minPrice.value) params.set('minPrice', String(Math.round(Number(minPrice.value) * 100)))
		if (maxPrice.value) params.set('maxPrice', String(Math.round(Number(maxPrice.value) * 100)))
		params.set('page', String(page.value))
		params.set('pageSize', String(pageSize.value))
		params.set('sort', sort.value)
		const res = await api(`/cars?${params.toString()}`)
		items.value = res.items
		total.value = res.total
	} catch (e: any) {
		error.value = e.message || 'Failed to load cars'
	} finally {
		loading.value = false
	}
}

function openCar(id: string) { router.push(`/cars/${id}`) }

onMounted(load)
watch([brand, model, color, minPrice, maxPrice, sort], () => { page.value = 1; load() })

</script>

<template>
	<div class="container">
		<h1>Cars</h1>
		<div class="filters">
			<input v-model="brand" placeholder="Brand" />
			<input v-model="model" placeholder="Model" />
			<input v-model="color" placeholder="Color" />
			<input v-model="minPrice" placeholder="Min Price" type="number" step="0.01" min="0" />
			<input v-model="maxPrice" placeholder="Max Price" type="number" step="0.01" min="0" />
			<select v-model="sort">
				<option value="newest">Newest</option>
				<option value="price_asc">Price ↑</option>
				<option value="price_desc">Price ↓</option>
			</select>
		</div>
		<p v-if="loading">Loading…</p>
		<p v-if="error" class="error">{{ error }}</p>
		<div class="grid">
			<div v-for="c in items" :key="c.id" class="card" @click="openCar(c.id)">
				<img v-if="c.images && c.images.length" class="thumb" :src="'/api' + c.images[0].url" alt="thumb" />
				<div class="title">{{ c.brand }} {{ c.model }}</div>
				<div class="meta">{{ new Date(c.firstRegistrationDate).getFullYear() }} • {{ c.color }}</div>
				<div class="price">{{ (c.priceCents/100).toFixed(2) }}</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
.filters { display: grid; grid-template-columns: repeat(6, 1fr); gap: .5rem; margin-bottom: 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.card { border: 1px solid #eee; padding: .75rem; cursor: pointer; border-radius: 8px; }
.thumb { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: .5rem; }
.title { font-weight: 600; }
.meta { color: #666; font-size: .9rem; }
.price { margin-top: .5rem; font-weight: 700; }
.error { color: #d33; }
input, select { width: 100%; padding: .4rem; }
</style>


