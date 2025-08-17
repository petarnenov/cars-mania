import { prisma } from '../src/lib/prisma'

async function main() {
	const email = process.argv[2]
	if (!email) {
		console.error('Usage: tsx scripts/makeAdmin.ts <email>')
		process.exit(1)
	}
	const user = await prisma.user.findUnique({ where: { email } })
	if (!user) {
		console.error(`No user found for email: ${email}`)
		process.exit(1)
	}
	if (user.role === 'ADMIN') {
		console.log(`User already ADMIN: ${email}`)
		process.exit(0)
	}
	await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
	console.log(`Promoted to ADMIN: ${email}`)
}

main().finally(async () => {
	await prisma.$disconnect()
})


