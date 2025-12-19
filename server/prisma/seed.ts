import { prisma } from "../src/lib/prisma"

async function main() {

    await prisma.user.createMany({
        data: [
            {
                username: 'teen_dev',
                email: 'teen.dev@example.com',
                hashed_password: 'password123',
                coins: 100,
            },
            {
                username: 'handsome_teen',
                email: 'handsome.teen@example.com',
                hashed_password: 'password123',
                coins: 0,
            },
        ],
        skipDuplicates: true,
    })

    console.log('Seed success')
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
    })
