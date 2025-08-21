<script setup lang="ts">
import { toastState, removeToast } from '../toast'
</script>

<template>
	<div class="toaster">
		<div v-for="t in toastState.items" :key="t.id" class="toast" :class="t.type">
			<span class="msg">{{ t.message }}</span>
			<button class="x" @click="removeToast(t.id)">×</button>
		</div>
	</div>
</template>

<style scoped>
.toaster { position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
.toast { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid; min-width: 260px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.toast.success { background: #ecfdf5; color: #065f46; border-color: #10b981; }
.toast.error { background: #fef2f2; color: #7f1d1d; border-color: #ef4444; }
.toast.info { background: #eff6ff; color: #1e40af; border-color: #3b82f6; }
.toast.warning { background: #fffbeb; color: #92400e; border-color: #f59e0b; }
.msg { flex: 1; }
.x { background: transparent; border: none; color: inherit; font-size: 18px; cursor: pointer; }
</style>


