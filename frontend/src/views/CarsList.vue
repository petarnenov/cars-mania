<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { api } from '../api'
import { useRouter, useRoute } from 'vue-router'
import { toastError, toastSuccess } from '../toast'

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
const route = useRoute()
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
const fromYear = ref<string>('')
const toYear = ref<string>('')

// new: slider + saved
const sliderMin = ref(0)
const sliderMax = ref(50000)
const sliderMaxCap = 200000

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const minPct = computed(() => Math.min(100, Math.max(0, (sliderMin.value / sliderMaxCap) * 100)))
const maxPct = computed(() => Math.min(100, Math.max(0, (sliderMax.value / sliderMaxCap) * 100)))
const fillStyle = computed(() => ({ left: `${minPct.value}%`, right: `${100 - maxPct.value}%` }))

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
		if (fromYear.value) params.set('fromYear', fromYear.value)
		if (toYear.value) params.set('toYear', toYear.value)
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

function applyToRoute() {
	const q: Record<string, string> = {}
	if (brand.value) q.brand = brand.value
	if (model.value) q.model = model.value
	if (color.value) q.color = color.value
	if (minPrice.value) q.minPrice = minPrice.value
	if (maxPrice.value) q.maxPrice = maxPrice.value
	if (fromYear.value) q.fromYear = fromYear.value
	if (toYear.value) q.toYear = toYear.value
	q.page = String(page.value)
	q.pageSize = String(pageSize.value)
	q.sort = sort.value
	router.replace({ query: q })
}

function syncFromRoute() {
	const q = route.query as Record<string, string>
	brand.value = q.brand || ''
	model.value = q.model || ''
	color.value = q.color || ''
	minPrice.value = q.minPrice || ''
	maxPrice.value = q.maxPrice || ''
	fromYear.value = q.fromYear || ''
	toYear.value = q.toYear || ''
	page.value = q.page ? Math.max(parseInt(q.page, 10) || 1, 1) : 1
	pageSize.value = q.pageSize ? Math.max(parseInt(q.pageSize, 10) || 12, 1) : 12
	sort.value = (q.sort as any) || 'newest'
	// set sliders from price strings (dollars)
	sliderMin.value = minPrice.value ? Math.max(0, Math.min(sliderMaxCap, Math.round(Number(minPrice.value)))) : 0
	sliderMax.value = maxPrice.value ? Math.max(0, Math.min(sliderMaxCap, Math.round(Number(maxPrice.value)))) : 50000
}

let t: number | undefined
function scheduleLoad(resetPage = false) {
	if (resetPage) page.value = 1
	applyToRoute()
	if (t) window.clearTimeout(t)
	t = window.setTimeout(() => load(), 300)
}

function nextPage() { if (page.value < totalPages.value) { page.value++; applyToRoute(); load() } }
function prevPage() { if (page.value > 1) { page.value--; applyToRoute(); load() } }

onMounted(() => { syncFromRoute(); load() })
watch([brand, model, color, minPrice, maxPrice, sort, fromYear, toYear], () => scheduleLoad(true))

// keep numeric prices in sync with sliders
watch([sliderMin, sliderMax], () => {
	if (sliderMin.value > sliderMax.value) sliderMin.value = sliderMax.value
	minPrice.value = String(sliderMin.value)
	maxPrice.value = String(sliderMax.value)
})

// saved filters
type SavedFilters = {
	name: string
	brand?: string
	model?: string
	color?: string
	minPrice?: string
	maxPrice?: string
	fromYear?: string
	toYear?: string
	sort: 'newest'|'price_asc'|'price_desc'
}

const savedFilters = ref<SavedFilters[]>([])
const saveName = ref('')

function loadSaved() {
	try {
		const raw = localStorage.getItem('cars_filters')
		savedFilters.value = raw ? JSON.parse(raw) : []
	} catch { savedFilters.value = [] }
}

function persistSaved() {
	localStorage.setItem('cars_filters', JSON.stringify(savedFilters.value))
}

function saveCurrent() {
	const name = saveName.value.trim()
	if (!name) { toastError('Enter a name'); return }
	const cfg: SavedFilters = { name, brand: brand.value || undefined, model: model.value || undefined, color: color.value || undefined, minPrice: minPrice.value || undefined, maxPrice: maxPrice.value || undefined, fromYear: fromYear.value || undefined, toYear: toYear.value || undefined, sort: sort.value }
	const idx = savedFilters.value.findIndex(f => f.name === name)
	if (idx >= 0) savedFilters.value[idx] = cfg; else savedFilters.value.push(cfg)
	persistSaved()
	toastSuccess('Filters saved')
}

function applySaved(f: SavedFilters) {
	brand.value = f.brand || ''
	model.value = f.model || ''
	color.value = f.color || ''
	minPrice.value = f.minPrice || ''
	maxPrice.value = f.maxPrice || ''
	sliderMin.value = minPrice.value ? Math.round(Number(minPrice.value)) : 0
	sliderMax.value = maxPrice.value ? Math.round(Number(maxPrice.value)) : 50000
	fromYear.value = f.fromYear || ''
	toYear.value = f.toYear || ''
	sort.value = f.sort
	scheduleLoad(true)
}

function removeSaved(name: string) {
	savedFilters.value = savedFilters.value.filter(f => f.name !== name)
	persistSaved()
}

onMounted(loadSaved)
</script>

<template>
	<div class="container">
		<div class="header">
			<h1>Cars</h1>
			<div class="slider">
				<label>Price: <b>{{ minPrice || 0 }}</b> - <b>{{ maxPrice || 50000 }}</b></label>
				<div class="range">
					<div class="track"></div>
					<div class="fill" :style="fillStyle"></div>
					<input type="range" min="0" :max="sliderMaxCap" step="500" v-model.number="sliderMin" />
					<input type="range" min="0" :max="sliderMaxCap" step="500" v-model.number="sliderMax" />
				</div>
			</div>
		</div>
		<div class="filters">
			<input v-model="brand" placeholder="Brand" />
			<input v-model="model" placeholder="Model" />
			<input v-model="color" placeholder="Color" />
			<input v-model="fromYear" placeholder="From Year" type="number" min="1900" max="2100" />
			<input v-model="toYear" placeholder="To Year" type="number" min="1900" max="2100" />
			<select v-model="sort">
				<option value="newest">Newest</option>
				<option value="price_asc">Price ↑</option>
				<option value="price_desc">Price ↓</option>
			</select>
		</div>
		<div class="saved">
			<div class="row">
				<input v-model="saveName" placeholder="Save current as…" />
				<button @click="saveCurrent">Save</button>
			</div>
			<div class="chips" v-if="savedFilters.length">
				<span class="chip" v-for="f in savedFilters" :key="f.name" @click="applySaved(f)">{{ f.name }}<button class="x" @click.stop="removeSaved(f.name)">×</button></span>
			</div>
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
		<div class="pagination">
			<button :disabled="page===1" @click="prevPage">Prev</button>
			<span>Page {{ page }} / {{ totalPages }}</span>
			<button :disabled="page===totalPages" @click="nextPage">Next</button>
		</div>
	</div>
</template>

<style scoped>
.container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
.header { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: end; margin-bottom: .75rem; }
.header h1 { margin: 0; }
.filters { display: grid; grid-template-columns: repeat(8, 1fr); gap: .5rem; margin-bottom: 1rem; align-items: end; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.card { border: 1px solid #eee; padding: .75rem; cursor: pointer; border-radius: 8px; }
.thumb { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: .5rem; }
.title { font-weight: 600; }
.meta { color: #666; font-size: .9rem; }
.price { margin-top: .5rem; font-weight: 700; }
.error { color: #d33; }
input, select { width: 100%; padding: .4rem; }
.pagination { display: flex; justify-content: center; align-items: center; gap: .75rem; margin: 1rem 0; }
.slider { display: flex; flex-direction: column; gap: .25rem; }
.range { position: relative; height: 32px; display: grid; grid-template-columns: 1fr; }
.range .track { position: absolute; left: 0; right: 0; top: 12px; height: 8px; background: #e5e7eb; border-radius: 6px; z-index: 0; }
.range .fill { position: absolute; top: 12px; height: 8px; background: #3b82f6; border-radius: 6px; z-index: 1; }
.range input[type="range"] { pointer-events: none; position: absolute; width: 100%; height: 8px; top: 12px; appearance: none; background: transparent; z-index: 2; }
.range input[type="range"]:focus { outline: none; }
.range input[type="range"]::-webkit-slider-thumb { pointer-events: auto; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; border: 2px solid #3b82f6; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: transform .1s ease; }
.range input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.05); }
.range input[type="range"]::-webkit-slider-runnable-track { height: 8px; background: transparent; border-radius: 6px; }
.saved { display: flex; flex-direction: column; gap: .5rem; margin: .5rem 0 1rem; }
.saved .row { display: flex; gap: .5rem; }
.chips { display: flex; gap: .5rem; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .5rem; background: #f1f5f9; border: 1px solid #e5e7eb; border-radius: 999px; cursor: pointer; }
.chip .x { background: transparent; border: none; cursor: pointer; font-size: 14px; }
</style>


