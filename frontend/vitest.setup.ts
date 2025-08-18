import { vi } from 'vitest'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
  return {
    ...actual,
    RouterLink: { name: 'RouterLink', render: () => null },
  }
})


