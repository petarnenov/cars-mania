<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { api } from '../api'
import { authState } from '../auth'

type Conversation = {
	id: string
	car: { id: string; brand: string; model: string }
	unread: number
	lastMessageAt?: string
}

type Message = {
	id: string
	senderId: string
	body: string
	createdAt: string
}

const loading = ref(false)
const error = ref('')
const conversations = ref<Conversation[]>([])
const selectedId = ref<string | null>(null)
const messages = ref<Message[]>([])
const messagesEl = ref<HTMLDivElement | null>(null)
const sending = ref(false)
const input = ref('')

async function loadConversations() {
	loading.value = true
	error.value = ''
	try {
		const res = await api('/me/conversations')
		conversations.value = res.items
		if (!selectedId.value && conversations.value.length) {
			selectedId.value = conversations.value[0].id
			await loadMessages()
		}
	} catch (e: any) {
		error.value = e.message || 'Failed to load inbox'
	} finally {
		loading.value = false
	}
}

async function loadMessages() {
	if (!selectedId.value) return
	try {
		const res = await api(`/me/conversations/${selectedId.value}/messages`)
		messages.value = res.items
		scrollToBottom()
	} catch (e: any) {
		error.value = e.message || 'Failed to load messages'
	}
}

async function send() {
	if (!selectedId.value || !input.value.trim()) return
	sending.value = true
	try {
		const msg: Message = await api(`/me/conversations/${selectedId.value}/messages`, {
			method: 'POST',
			body: JSON.stringify({ body: input.value })
		})
		messages.value = [...messages.value, msg]
		input.value = ''
		scrollToBottom()
	} catch (e: any) {
		error.value = e.message || 'Failed to send'
	} finally {
		sending.value = false
	}
}

function select(id: string) {
	selectedId.value = id
	loadMessages()
}

onMounted(loadConversations)

function scrollToBottom() {
	nextTick(() => {
		const el = messagesEl.value
		if (el) el.scrollTop = el.scrollHeight
	})
}
</script>

<template>
	<div class="inbox">
		<div class="sidebar">
			<h2>Conversations</h2>
			<p v-if="loading">Loading…</p>
			<p v-if="error" class="error">{{ error }}</p>
			<ul>
				<li v-for="c in conversations" :key="c.id" :class="{ active: c.id === selectedId }" @click="select(c.id)">
					<span>{{ c.car.brand }} {{ c.car.model }}</span>
					<span v-if="c.unread" class="badge">{{ c.unread }}</span>
				</li>
			</ul>
		</div>
		<div class="thread">
			<div v-if="!selectedId" class="empty">Select a conversation</div>
			<div v-else ref="messagesEl" class="messages">
				<div v-for="m in messages" :key="m.id" class="msg" :class="m.senderId === authState.user?.id ? 'me' : 'them'">
					<div class="bubble">
						<div class="body">{{ m.body }}</div>
						<div class="meta">{{ new Date(m.createdAt).toLocaleString() }}</div>
					</div>
				</div>
			</div>
			<div v-if="selectedId" class="composer">
				<textarea v-model="input" rows="2" placeholder="Type a message…" />
				<button :disabled="sending || !input.trim()" @click="send">Send</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.inbox { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 60px); }
.sidebar { border-right: 1px solid #eee; padding: .75rem; overflow: auto; background: #ffffff; }
.sidebar h2 { color: #111827; font-weight: 700; margin: 0 0 .5rem; padding-bottom: .4rem; border-bottom: 1px solid #e5e7eb; }
.thread { display: grid; grid-template-rows: 1fr auto; height: 100%; }
.messages { padding: .75rem; overflow: auto; display: flex; flex-direction: column; gap: .5rem; }
.composer { padding: .75rem; border-top: 1px solid #eee; display: flex; gap: .5rem; }
textarea { flex: 1; padding: .5rem; }
ul { list-style: none; padding: 0; margin: .5rem 0 0; }
li { padding: .5rem; cursor: pointer; border-radius: 8px; border: 1px solid #e5e7eb; border-left: 4px solid transparent; background: #f8fafc; color: #111827; display: flex; justify-content: space-between; align-items: center; gap: .5rem; transition: background .15s ease, border-color .15s ease, color .15s ease; }
li:hover { background: #eef2ff; border-color: #c7d2fe; }
li.active { background: #dbeafe; border-color: #93c5fd; color: #1e3a8a; border-left-color: #3b82f6; }
.badge { background: #ef4444; color: white; padding: 0 .5rem; border-radius: 999px; font-size: .75rem; font-weight: 700; min-width: 1.5rem; text-align: center; }
.msg { display: flex; width: 100%; }
.msg.me { justify-content: flex-end; }
.msg.them { justify-content: flex-start; }
.bubble { background: #f1f5f9; color: #0f172a; padding: .5rem .6rem; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 70%; }
.msg.me .bubble { background: #2563eb; color: #fff; border-color: #1d4ed8; }
.msg.me .bubble { margin-left: auto; }
.msg.them .bubble { margin-right: auto; }
.body { white-space: pre-wrap; }
.meta { margin-top: .25rem; font-size: .75rem; opacity: .8; }
.msg.me .meta { text-align: right; }
.error { color: #d33; }
.empty { padding: 1rem; color: #666; }
</style>


