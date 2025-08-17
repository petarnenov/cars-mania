import { createRouter, createWebHistory } from 'vue-router'
import { authState, fetchMe } from './auth'

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: () => import('./views/CarsList.vue') },
		{ path: '/login', component: () => import('./views/Login.vue') },
		{ path: '/register', component: () => import('./views/Register.vue') },
		{ path: '/cars/new', component: () => import('./views/CreateCar.vue'), meta: { requiresAuth: true, requiresRole: 'USER' } },
		{ path: '/cars/:id', component: () => import('./views/CarDetail.vue') },
		{ path: '/admin/moderation', component: () => import('./views/AdminQueue.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
		{ path: '/inbox', component: () => import('./views/Inbox.vue'), meta: { requiresAuth: true } },
	],
})

router.beforeEach(async (to) => {
	const isAuthPage = to.path === '/login' || to.path === '/register'
	if (!authState.loaded && !isAuthPage) await fetchMe()
	const meta = to.meta as any
	// if already authed, avoid login/register; send to new-car by default
	if ((to.path === '/login' || to.path === '/register') && authState.user) {
		return { path: authState.user.role === 'ADMIN' ? '/admin/moderation' : '/cars/new' }
	}
	if (meta.requiresAuth && !authState.user) return { path: '/login', query: { next: to.fullPath } }
	if (meta.requiresAdmin && authState.user?.role !== 'ADMIN') {
		return { path: authState.user ? '/cars/new' : '/login' }
	}
	if (meta.requiresRole && authState.user?.role !== meta.requiresRole) {
		const role = (authState.user?.role ?? '') as string
		return { path: role === 'ADMIN' ? '/admin/moderation' : '/cars/new' }
	}
})
