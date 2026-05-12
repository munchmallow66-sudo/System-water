// This file runs before the application starts
// Set DATABASE_URL for Turbopack compatibility
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_zKX2utWUvy4Y@ep-rough-bonus-a1rixpjo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'village-water-management-secret-key-2024'
}
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = 'dg5rr9ett'
}

export async function register() {
  // This function is called when the server starts
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Ensure DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_zKX2utWUvy4Y@ep-rough-bonus-a1rixpjo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    }
  }
}
