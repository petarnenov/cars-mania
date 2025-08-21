import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
	id: number
	type: ToastType
	message: string
}

export const toastState = reactive<{ items: Toast[] }>({ items: [] })

let idSeq = 1

function addToast(type: ToastType, message: string, durationMs = 3500) {
	const id = idSeq++
	toastState.items.push({ id, type, message })
	setTimeout(() => removeToast(id), durationMs)
}

export function toastSuccess(msg: string) { addToast('success', msg) }
export function toastError(msg: string) { addToast('error', msg, 5000) }
export function toastInfo(msg: string) { addToast('info', msg) }
export function toastWarning(msg: string) { addToast('warning', msg, 4000) }

export function removeToast(id: number) {
	toastState.items = toastState.items.filter(t => t.id !== id)
}


