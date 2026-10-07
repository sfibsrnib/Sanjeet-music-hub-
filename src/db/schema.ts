import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (Firebase Auth user sync)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admins table
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bookings table
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingId: text('booking_id').notNull().unique(),
  customerName: text('customer_name').notNull(),
  mobileNumber: text('mobile_number').notNull(),
  whatsappNumber: text('whatsapp_number'),
  email: text('email'),
  service: text('service').notNull(),
  language: text('language').notNull(),
  songName: text('song_name').notNull(),
  artistName: text('artist_name'),
  nameToAdd: text('name_to_add'),
  preferredStyle: text('preferred_style'),
  additionalRequirements: text('additional_requirements'),
  deliveryTime: text('delivery_time'),
  audioFileName: text('audio_file_name'),
  audioFileData: text('audio_file_data'),
  originalPrice: integer('original_price').notNull().default(250),
  discount: integer('discount').notNull().default(0),
  giftCode: text('gift_code'),
  finalPrice: integer('final_price').notNull().default(250),
  status: text('status').notNull().default('Pending'),
  customerUid: text('customer_uid').default('guest'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Services table
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  serviceName: text('service_name').notNull(),
  description: text('description'),
  price: integer('price').notNull().default(300),
  discountPrice: integer('discount_price').notNull().default(250),
  icon: text('icon').default('🎚️'),
  status: text('status').notNull().default('Active'),
  highlights: text('highlights'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Gift / Promo Codes table
export const giftCodes = pgTable('gift_codes', {
  code: text('code').primaryKey(),
  discountType: text('discount_type').notNull().default('percentage'),
  discountValue: integer('discount_value').notNull().default(50),
  minOrderValue: integer('min_order_value').default(0),
  maxDiscount: integer('max_discount').default(500),
  startDate: timestamp('start_date').defaultNow(),
  expiryDate: timestamp('expiry_date'),
  usageLimit: integer('usage_limit').default(100),
  usedCount: integer('used_count').default(0),
  perCustomerLimit: integer('per_customer_limit').default(1),
  status: text('status').notNull().default('active'),
  showPublicOffer: boolean('show_public_offer').default(false),
  publicBannerText: text('public_banner_text'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Website Configuration Settings table
export const websiteSettings = pgTable('website_settings', {
  id: text('id').primaryKey(),
  businessName: text('business_name').default('Sanjeet Music Hub'),
  ownerName: text('owner_name').default('Sanjeet Raj'),
  tagline: text('tagline').default('Turn Your Song Into Something Powerful'),
  heroTitle: text('hero_title').default('Turn Your Song Into Something Powerful'),
  heroSubtitle: text('hero_subtitle').default('Professional Bhojpuri • Nagpuri • Hindi Music & Remix Services'),
  heroDescription: text('hero_description'),
  phoneNumber: text('phone_number').default('+91 98765 43210'),
  whatsappNumber: text('whatsapp_number').default('+91 98765 43210'),
  businessEmail: text('business_email').default('contact@sanjeetmusichub.com'),
  supportEmail: text('support_email').default('support@sanjeetmusichub.com'),
  instagramUsername: text('instagram_username').default('@sanjeetmusichub_official'),
  instagramUrl: text('instagram_url').default('https://instagram.com/sanjeetmusichub_official'),
  youtubeUrl: text('youtube_url').default('https://youtube.com/@sanjeetmusichub'),
  footerText: text('footer_text'),
  copyrightText: text('copyright_text').default('© 2026 Sanjeet Music Hub. All Rights Reserved.'),
  logoUrl: text('logo_url'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  adminUser: text('admin_user').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});
