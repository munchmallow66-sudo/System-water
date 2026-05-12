import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@village-water.com' },
    update: {},
    create: {
      email: 'admin@village-water.com',
      name: 'ผู้ดูแลระบบ',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12)
  
  const staff = await prisma.user.upsert({
    where: { email: 'staff@village-water.com' },
    update: {},
    create: {
      email: 'staff@village-water.com',
      name: 'พนักงานตัวอย่าง',
      password: staffPassword,
      role: 'STAFF',
      isActive: true,
    },
  })

  console.log('✅ Created staff user:', staff.email)

  // Create water rates
  const waterRates = await Promise.all([
    prisma.waterRate.upsert({
      where: { id: 'rate-1' },
      update: {},
      create: {
        id: 'rate-1',
        name: '0-10 ลบ.ม.',
        minUnits: 0,
        maxUnits: 10,
        ratePerUnit: 8.50,
        isActive: true,
      },
    }),
    prisma.waterRate.upsert({
      where: { id: 'rate-2' },
      update: {},
      create: {
        id: 'rate-2',
        name: '10-20 ลบ.ม.',
        minUnits: 10,
        maxUnits: 20,
        ratePerUnit: 10.00,
        isActive: true,
      },
    }),
    prisma.waterRate.upsert({
      where: { id: 'rate-3' },
      update: {},
      create: {
        id: 'rate-3',
        name: '20-30 ลบ.ม.',
        minUnits: 20,
        maxUnits: 30,
        ratePerUnit: 12.00,
        isActive: true,
      },
    }),
    prisma.waterRate.upsert({
      where: { id: 'rate-4' },
      update: {},
      create: {
        id: 'rate-4',
        name: 'มากกว่า 30 ลบ.ม.',
        minUnits: 30,
        maxUnits: 0,
        ratePerUnit: 15.00,
        isActive: true,
      },
    }),
  ])

  console.log('✅ Created water rates:', waterRates.length, 'records')

  // Create sample houses
  const houses = await Promise.all([
    prisma.house.upsert({
      where: { houseNumber: '1/1' },
      update: {},
      create: {
        houseNumber: '1/1',
        ownerName: 'นายสมชาย ใจดี',
        isActive: true,
      },
    }),
    prisma.house.upsert({
      where: { houseNumber: '1/2' },
      update: {},
      create: {
        houseNumber: '1/2',
        ownerName: 'นางสมหญิง รักสะอาด',
        isActive: true,
      },
    }),
    prisma.house.upsert({
      where: { houseNumber: '2/1' },
      update: {},
      create: {
        houseNumber: '2/1',
        ownerName: 'นายวิชัย มั่งมี',
        isActive: true,
      },
    }),
    prisma.house.upsert({
      where: { houseNumber: '2/2' },
      update: {},
      create: {
        houseNumber: '2/2',
        ownerName: 'นางพิมพ์ ใจงาม',
        isActive: true,
      },
    }),
    prisma.house.upsert({
      where: { houseNumber: '3/1' },
      update: {},
      create: {
        houseNumber: '3/1',
        ownerName: 'นายประยุทธ์ ทำดี',
        isActive: true,
      },
    }),
  ])

  console.log('✅ Created sample houses:', houses.length, 'records')

  // Create sample meter readings for the past 6 months
  const today = new Date()
  const meterReadings: any[] = []

  for (const house of houses) {
    let previousReading = 0
    
    for (let i = 5; i >= 0; i--) {
      const readingDate = new Date(today.getFullYear(), today.getMonth() - i, 15)
      const usage = Math.floor(Math.random() * 25) + 5 // 5-30 cubic meters
      const currentReading = previousReading + usage
      
      const reading = await prisma.meterReading.create({
        data: {
          houseId: house.id,
          readingDate,
          readingValue: currentReading,
          usage,
          isAnomaly: usage > 40,
          recordedById: admin.id,
        },
      })
      
      meterReadings.push(reading)
      previousReading = currentReading
    }
  }

  console.log('✅ Created sample meter readings:', meterReadings.length, 'records')

  // Create sample bills
  const bills: any[] = []

  for (const reading of meterReadings) {
    // Skip the current month bill (not yet due)
    if (reading.readingDate.getMonth() === today.getMonth()) continue

    const billNumber = `BILL-${reading.readingDate.getFullYear()}${String(reading.readingDate.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    
    // Calculate usage fee based on tier
    const usage = Number(reading.usage)
    let usageFee = 0
    if (usage <= 10) {
      usageFee = usage * 8.50
    } else if (usage <= 20) {
      usageFee = (10 * 8.50) + ((usage - 10) * 10.00)
    } else if (usage <= 30) {
      usageFee = (10 * 8.50) + (10 * 10.00) + ((usage - 20) * 12.00)
    } else {
      usageFee = (10 * 8.50) + (10 * 10.00) + (10 * 12.00) + ((usage - 30) * 15.00)
    }

    const totalAmount = usageFee + 10 // Add base fee of 10 baht
    const dueDate = new Date(reading.readingDate)
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setDate(15)

    const isPaid = Math.random() > 0.3 // 70% paid

    const bill = await prisma.bill.create({
      data: {
        houseId: reading.houseId,
        meterReadingId: reading.id,
        billNumber,
        periodStart: new Date(reading.readingDate.getFullYear(), reading.readingDate.getMonth(), 1),
        periodEnd: new Date(reading.readingDate.getFullYear(), reading.readingDate.getMonth() + 1, 0),
        previousReading: Number(reading.readingValue) - Number(reading.usage),
        currentReading: Number(reading.readingValue),
        usage: Number(reading.usage),
        baseFee: 10,
        usageFee,
        totalAmount,
        dueDate,
        isPaid,
        paidAt: isPaid ? dueDate : null,
      },
    })

    bills.push(bill)

    // Create payment for paid bills
    if (isPaid) {
      await prisma.payment.create({
        data: {
          billId: bill.id,
          houseId: bill.houseId,
          amount: totalAmount,
          paymentMethod: Math.random() > 0.5 ? 'CASH' : 'TRANSFER',
          receiptNumber: `RCP-${bill.billNumber.replace('BILL-', '')}`,
          collectorId: Math.random() > 0.5 ? admin.id : staff.id,
          paymentDate: dueDate,
        },
      })
    }
  }

  console.log('✅ Created sample bills:', bills.length, 'records')

  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('📋 Login credentials:')
  console.log('   Admin: admin@village-water.com / admin123')
  console.log('   Staff: staff@village-water.com / staff123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
