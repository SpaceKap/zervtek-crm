import { InquirySource, InquiryStatus } from "@prisma/client"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const sampleInquiries = [
  {
    source: InquirySource.WHATSAPP,
    customerName: "John Tanaka",
    email: "john.tanaka@example.com",
    phone: "+81-90-1234-5678",
    message: "I'm interested in purchasing a Toyota Prius. Can you provide more information about availability and pricing?",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.EMAIL,
    customerName: "Sarah Yamada",
    email: "sarah.yamada@example.com",
    phone: "+81-80-2345-6789",
    message: "Hello, I saw your listing for a Honda Civic. Is it still available? I'd like to schedule a test drive.",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.WEB,
    customerName: "Michael Suzuki",
    email: "michael.suzuki@example.com",
    phone: "+81-70-3456-7890",
    message: "Looking for a reliable sedan under 2 million yen. Do you have any recommendations?",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.CHATBOT,
    customerName: "Emily Watanabe",
    email: "emily.watanabe@example.com",
    phone: "+81-90-4567-8901",
    message: "I'm interested in your financing options for a Nissan Leaf. What are the interest rates?",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.WHATSAPP,
    customerName: "David Kimura",
    email: "david.kimura@example.com",
    phone: "+81-80-5678-9012",
    message: "Do you have any hybrid vehicles in stock? I'm particularly interested in Toyota models.",
    status: InquiryStatus.CONTACTED,
  },
  {
    source: InquirySource.EMAIL,
    customerName: "Lisa Nakamura",
    email: "lisa.nakamura@example.com",
    phone: "+81-70-6789-0123",
    message: "I need to trade in my current vehicle. Can you provide an estimate? It's a 2018 Mazda CX-5.",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.WEB,
    customerName: "Robert Ito",
    email: "robert.ito@example.com",
    phone: "+81-90-7890-1234",
    message: "Looking for a family car with good safety ratings. Budget is around 3 million yen.",
    status: InquiryStatus.QUALIFIED,
  },
  {
    source: InquirySource.CHATBOT,
    customerName: "Anna Kobayashi",
    email: "anna.kobayashi@example.com",
    phone: "+81-80-8901-2345",
    message: "I'm interested in leasing a vehicle. What are your lease terms and available models?",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.WHATSAPP,
    customerName: "James Saito",
    email: "james.saito@example.com",
    phone: "+81-70-9012-3456",
    message: "Do you offer delivery service? I'm located in Tokyo and interested in a Honda Fit.",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.EMAIL,
    customerName: "Maria Kato",
    email: "maria.kato@example.com",
    phone: "+81-90-0123-4567",
    message: "I saw your special promotion on Subaru vehicles. Can you send me more details?",
    status: InquiryStatus.CONTACTED,
  },
  {
    source: InquirySource.WEB,
    customerName: "Thomas Matsumoto",
    email: "thomas.matsumoto@example.com",
    phone: "+81-80-1234-5678",
    message: "Looking for a used car with low mileage. Prefer something from 2020 or newer.",
    status: InquiryStatus.NEW,
  },
  {
    source: InquirySource.CHATBOT,
    customerName: "Jennifer Hayashi",
    email: "jennifer.hayashi@example.com",
    phone: "+81-70-2345-6789",
    message: "I'm interested in your warranty options. What coverage do you provide?",
    status: InquiryStatus.NEW,
  },
]

async function main() {
  console.log("Seeding sample inquiries...")

  for (const inquiry of sampleInquiries) {
    try {
      await prisma.inquiry.create({
        data: inquiry,
      })
      console.log(`Created inquiry for ${inquiry.customerName}`)
    } catch (error) {
      console.error(`Error creating inquiry for ${inquiry.customerName}:`, error)
    }
  }

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
