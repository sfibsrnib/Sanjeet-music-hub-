import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { 
  admins, 
  bookings, 
  services, 
  giftCodes, 
  websiteSettings, 
  auditLogs 
} from './src/db/schema.ts';
import { requireAuth, AuthRequest as FirebaseAuthRequest } from './src/middleware/auth.ts';
import { getUsers } from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sanjeet_music_hub_secure_jwt_token_key_2026';
const INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'sanjeet143';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper: Audit Logger in PostgreSQL
async function logAudit(action: string, details: string, adminUser: string = 'admin') {
  try {
    await db.insert(auditLogs).values({
      action,
      details,
      adminUser,
    });
  } catch (err) {
    console.warn('[PostgreSQL] Audit log insert warning:', err);
  }
}

// System Database Bootstrapper for PostgreSQL
async function bootstrapPostgreSQL() {
  try {
    console.log('[PostgreSQL] Checking and initializing database records...');

    // 1. Check or initialize admin account
    const existingAdmins = await db.select().from(admins).limit(1);
    if (existingAdmins.length === 0) {
      console.log('[PostgreSQL] Seeding initial master admin account (sanjeet)...');
      const passwordHash = bcrypt.hashSync(INITIAL_PASSWORD, 10);
      await db.insert(admins).values({
        username: 'sanjeet',
        email: 'ashi142kumari@gmail.com',
        passwordHash,
        role: 'admin',
      });
      console.log('[PostgreSQL] Master admin created with secure password hash.');
      await logAudit('Admin Setup', 'Initial admin account created with hashed password in PostgreSQL', 'System');
    }

    // 2. Check or initialize website settings
    const existingSettings = await db.select().from(websiteSettings).where(eq(websiteSettings.id, 'general'));
    if (existingSettings.length === 0) {
      console.log('[PostgreSQL] Seeding default website settings...');
      await db.insert(websiteSettings).values({
        id: 'general',
        businessName: 'Sanjeet Music Hub',
        ownerName: 'Sanjeet Raj',
        tagline: 'Turn Your Song Into Something Powerful',
        heroTitle: 'Turn Your Song Into Something Powerful',
        heroSubtitle: 'Professional Bhojpuri • Nagpuri • Hindi Music & Remix Services',
        heroDescription: 'Elevate your audio with heavyweight festival basslines, crystal-clear 320kbps mastering, custom DJ voice drops, and regional rhythm perfection tailored for stages, DJ competition boxes, and digital releases.',
        phoneNumber: '+91 98765 43210',
        whatsappNumber: '+91 98765 43210',
        businessEmail: 'contact@sanjeetmusichub.com',
        supportEmail: 'support@sanjeetmusichub.com',
        instagramUsername: '@sanjeetmusichub_official',
        instagramUrl: 'https://instagram.com/sanjeetmusichub_official',
        youtubeUrl: 'https://youtube.com/@sanjeetmusichub',
        footerText: 'Professional Bhojpuri, Nagpuri & Hindi Music Remix, DJ Voice Tagging, and Sub-Bass Studio Mastering.',
        copyrightText: '© 2026 Sanjeet Music Hub. All Rights Reserved.',
        logoUrl: '',
      });
    }

    // 3. Check or initialize services catalog
    const existingServices = await db.select().from(services);
    if (existingServices.length === 0) {
      console.log('[PostgreSQL] Seeding default remix services catalog...');
      const defaultServices = [
        {
          id: 'bhojpuri-remix',
          serviceName: 'Bhojpuri Remix',
          description: 'High-energy electro dholki beats, crisp vocal chops, and deep sub-bass created for massive DJ sound boxes and stage programs.',
          price: 300,
          discountPrice: 250,
          icon: '🎚️',
          status: 'Active',
          highlights: 'High-energy electro dholki beats, Crisp vocal pitch & frequency balancing, Mastered for club and live sound setups',
          sortOrder: 1
        },
        {
          id: 'nagpuri-remix',
          serviceName: 'Nagpuri Remix',
          description: 'Authentic traditional Jharkhandi theka percussion fused with modern synthetic 808 bass, groovy drops, and festival dance energy.',
          price: 300,
          discountPrice: 250,
          icon: '🥁',
          status: 'Active',
          highlights: 'Tribal theka & modern bass combination, Smooth transitions & infectious groove, Vibrant regional celebration mastering',
          sortOrder: 2
        },
        {
          id: 'hindi-remix',
          serviceName: 'Hindi Remix',
          description: 'Bollywood club bangers, tech-house crossovers, commercial dance mashups, and trending slowed & reverb acoustic atmospheres.',
          price: 350,
          discountPrice: 299,
          icon: '🎹',
          status: 'Active',
          highlights: 'Club & festival structure arrangement, Clean acapella isolation & tuning, Punchy contemporary kick-bass sidechain',
          sortOrder: 3
        },
        {
          id: 'name-voice-remix',
          serviceName: 'Name Voice Remix',
          description: 'Personalize any track with your studio or DJ signature tag. Studio vocal recording and vocoder FX embedded right before the hardest drops.',
          price: 200,
          discountPrice: 150,
          icon: '🎙️',
          status: 'Active',
          highlights: 'Professional voice artist recording, Laser sweeps, echo & stutter effects, Seamless integration into the master song',
          sortOrder: 4
        },
        {
          id: 'dj-style-remix',
          serviceName: 'DJ Style Remix',
          description: 'Extended DJ friendly intro and outro tracks for seamless live mixing, hard competition drops, sirens, build-ups, and snare rolls.',
          price: 400,
          discountPrice: 350,
          icon: '⚡',
          status: 'Active',
          highlights: '32-bar intro/outro cue beat markers, Heavy festival siren & riser FX, Maximized loudness without harsh distortion',
          sortOrder: 5
        },
        {
          id: 'sound-check-mix',
          serviceName: 'Sound Check / Bass Mix',
          description: 'Ultra sub-harmonic bass tuning (35Hz - 80Hz) specifically designed to test woofers, line arrays, and competition sound competition setups.',
          price: 250,
          discountPrice: 199,
          icon: '🔊',
          status: 'Active',
          highlights: 'Pounding sub-bass low-end frequency, Spatial stereo 8D imaging dynamics, Extreme cone excursion audio fidelity',
          sortOrder: 6
        },
        {
          id: 'custom-music-editing',
          serviceName: 'Custom Music Editing',
          description: 'Custom song mashups, tempo/pitch shifting, clean radio edits, dance choreo cuts, and noise cleanup for special stage performances.',
          price: 250,
          discountPrice: 199,
          icon: '✂️',
          status: 'Active',
          highlights: 'Precise timestamp cut & crossfades, Artifact-free BPM speeding/slowing, Wedding & school event dance mixdowns',
          sortOrder: 7
        },
        {
          id: 'special-custom-request',
          serviceName: 'Special Custom Request',
          description: 'Full-scale custom arrangement tailored directly to your exact artistic brief. Dedicated studio engineer session for your production.',
          price: 500,
          discountPrice: 450,
          icon: '✨',
          status: 'Active',
          highlights: '1-on-1 audio engineer consultation, Custom instruments, synthesizers & stems, Unlimited revisions until stage satisfaction',
          sortOrder: 8
        }
      ];

      for (const s of defaultServices) {
        await db.insert(services).values(s);
      }
    }

    // 4. Check or initialize gift codes
    const existingGifts = await db.select().from(giftCodes);
    if (existingGifts.length === 0) {
      console.log('[PostgreSQL] Seeding default promotional gift codes...');
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(giftCodes).values([
        {
          code: 'SANJEET50',
          discountType: 'percentage',
          discountValue: 50,
          minOrderValue: 200,
          maxDiscount: 200,
          expiryDate: expiry,
          usageLimit: 500,
          usedCount: 0,
          perCustomerLimit: 1,
          status: 'active',
          showPublicOffer: true,
          publicBannerText: 'Special Studio Offer: Use code SANJEET50 for 50% OFF on all remix bookings!'
        },
        {
          code: 'WELCOME100',
          discountType: 'fixed',
          discountValue: 100,
          minOrderValue: 250,
          maxDiscount: 100,
          expiryDate: expiry,
          usageLimit: 200,
          usedCount: 0,
          perCustomerLimit: 1,
          status: 'active',
          showPublicOffer: false,
          publicBannerText: 'Flat ₹100 OFF on orders above ₹250 with code WELCOME100'
        },
        {
          code: 'MUSIC20',
          discountType: 'percentage',
          discountValue: 20,
          minOrderValue: 150,
          maxDiscount: 100,
          expiryDate: expiry,
          usageLimit: 300,
          usedCount: 0,
          perCustomerLimit: 1,
          status: 'active',
          showPublicOffer: false,
          publicBannerText: 'Get 20% OFF using promo code MUSIC20'
        }
      ]);
    }

    // 5. Seed initial booking if table is empty
    const existingBookings = await db.select().from(bookings).limit(1);
    if (existingBookings.length === 0) {
      console.log('[PostgreSQL] Seeding initial booking record...');
      await db.insert(bookings).values({
        bookingId: 'SMH-2026-000001',
        customerName: 'DJ Rahul Rock',
        mobileNumber: '9876543211',
        whatsappNumber: '9876543211',
        email: 'djrahul@gmail.com',
        service: 'Bhojpuri Remix',
        language: 'Bhojpuri',
        songName: 'Lollipop Lagelu Festival Punch',
        artistName: 'Pawan Singh',
        nameToAdd: 'DJ Rahul Rock Ranchi',
        preferredStyle: 'Hard Dholki / Electro DJ Punch',
        additionalRequirements: 'Heavy drop at 0:45 with vocal stutter and competition siren.',
        deliveryTime: 'Express (24 Hours)',
        originalPrice: 300,
        discount: 50,
        giftCode: 'SANJEET50',
        finalPrice: 250,
        status: 'In Progress',
        customerUid: 'demo_user',
      });
    }

    console.log('[PostgreSQL] Database bootstrap verified.');
  } catch (err) {
    console.error('[PostgreSQL] Bootstrap error:', err);
  }
}

bootstrapPostgreSQL();

// Authentication Middleware
interface AuthRequest extends Request {
  adminUser?: {
    username: string;
    email: string;
    role: string;
  };
}

function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied: Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; email: string; role: string };
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// ---------------------------------------------------------------------
// PUBLIC & USER APIS (POSTGRESQL-BACKED)
// ---------------------------------------------------------------------

// Get synced users (Protected via Firebase Auth)
app.get('/api/users', requireAuth, async (req: FirebaseAuthRequest, res: Response) => {
  try {
    const userList = await getUsers();
    return res.json(userList);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// 1. Get Website Settings
app.get('/api/public/settings', async (req: Request, res: Response) => {
  try {
    const settings = await db.select().from(websiteSettings).where(eq(websiteSettings.id, 'general')).limit(1);
    if (settings.length > 0) {
      return res.json(settings[0]);
    }
    return res.json({});
  } catch (err) {
    console.error('Settings read error:', err);
    return res.status(500).json({ error: 'Could not load website settings' });
  }
});

// 2. Get Public Active Services
app.get('/api/public/services', async (req: Request, res: Response) => {
  try {
    const serviceList = await db.select().from(services).where(eq(services.status, 'Active')).orderBy(asc(services.sortOrder));
    // Parse highlights string to array if needed
    const mapped = serviceList.map(s => ({
      ...s,
      highlights: s.highlights ? s.highlights.split(',').map(h => h.trim()) : []
    }));
    return res.json(mapped);
  } catch (err) {
    console.error('Services read error:', err);
    return res.status(500).json({ error: 'Could not load services' });
  }
});

// 3. Get Public Active Offers (for banner display)
app.get('/api/public/offers', async (req: Request, res: Response) => {
  try {
    const codes = await db.select().from(giftCodes).where(eq(giftCodes.status, 'active'));
    const now = new Date();
    const publicOffers = codes
      .filter(g => g.showPublicOffer && (!g.expiryDate || new Date(g.expiryDate) > now))
      .map(g => ({
        code: g.code,
        discountType: g.discountType,
        discountValue: g.discountValue,
        publicBannerText: g.publicBannerText,
        minOrderValue: g.minOrderValue
      }));

    return res.json(publicOffers);
  } catch (err) {
    console.error('Offers read error:', err);
    return res.status(500).json({ error: 'Could not load offers' });
  }
});

// 4. Validate Gift Code (Backend PostgreSQL Validation & Calculation)
app.post('/api/public/validate-gift-code', async (req: Request, res: Response) => {
  try {
    const { code, serviceName, baseAmount } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Please enter a promo code.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const results = await db.select().from(giftCodes).where(eq(giftCodes.code, cleanCode)).limit(1);

    if (results.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid gift code.' });
    }

    const gift = results[0];

    if (gift.status !== 'active') {
      return res.status(400).json({ valid: false, error: 'This gift code is no longer active.' });
    }

    const now = new Date();
    if (gift.expiryDate && new Date(gift.expiryDate) < now) {
      return res.status(400).json({ valid: false, error: 'This gift code has expired.' });
    }

    if (gift.usageLimit && (gift.usedCount || 0) >= gift.usageLimit) {
      return res.status(400).json({ valid: false, error: 'Usage limit reached for this promo code.' });
    }

    // Determine baseline price
    let originalPrice = Number(baseAmount) || 0;
    if (!originalPrice && serviceName) {
      const svcResults = await db.select().from(services).where(eq(services.serviceName, serviceName)).limit(1);
      if (svcResults.length > 0) {
        originalPrice = Number(svcResults[0].discountPrice || svcResults[0].price) || 250;
      } else {
        originalPrice = 250;
      }
    }

    if (gift.minOrderValue && originalPrice < gift.minOrderValue) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order value of ₹${gift.minOrderValue} required for this code.`
      });
    }

    // Backend-authoritative discount calculation
    let discount = 0;
    if (gift.discountType === 'percentage') {
      discount = Math.round((originalPrice * Number(gift.discountValue)) / 100);
      if (gift.maxDiscount && discount > gift.maxDiscount) {
        discount = gift.maxDiscount;
      }
    } else {
      discount = Number(gift.discountValue);
    }

    discount = Math.min(discount, originalPrice);
    const finalPrice = Math.max(0, originalPrice - discount);

    return res.json({
      valid: true,
      code: gift.code,
      discountType: gift.discountType,
      discountValue: gift.discountValue,
      originalPrice,
      discount,
      finalPrice,
      message: `Coupon ${gift.code} applied! ₹${discount} discount saved.`
    });
  } catch (err) {
    console.error('Gift code validation error:', err);
    return res.status(500).json({ valid: false, error: 'Server error validating code.' });
  }
});

// 5. Submit Booking (Central PostgreSQL Database Insertion)
app.post('/api/public/bookings', async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      mobileNumber,
      whatsappNumber,
      email,
      service,
      language,
      songName,
      artistName,
      nameToAdd,
      preferredStyle,
      additionalRequirements,
      deliveryTime,
      giftCode,
      audioFileName,
      audioFileData,
      customerUid
    } = req.body;

    if (!customerName || !mobileNumber || !service || !songName) {
      return res.status(400).json({ error: 'Please provide all required fields (Name, Phone, Service, Song Title).' });
    }

    // Determine baseline price from database
    let originalPrice = 250;
    const svcResults = await db.select().from(services).where(eq(services.serviceName, service)).limit(1);
    if (svcResults.length > 0) {
      originalPrice = Number(svcResults[0].discountPrice || svcResults[0].price) || 250;
    }

    let discount = 0;
    let appliedCode = '';

    // Verify promo code on backend if passed
    if (giftCode && String(giftCode).trim()) {
      const cleanCode = String(giftCode).trim().toUpperCase();
      const codeResults = await db.select().from(giftCodes).where(eq(giftCodes.code, cleanCode)).limit(1);

      if (codeResults.length > 0) {
        const gift = codeResults[0];
        const now = new Date();

        if (gift.status === 'active' && (!gift.expiryDate || new Date(gift.expiryDate) >= now)) {
          if (!gift.usageLimit || (gift.usedCount || 0) < gift.usageLimit) {
            if (!gift.minOrderValue || originalPrice >= gift.minOrderValue) {
              appliedCode = cleanCode;
              if (gift.discountType === 'percentage') {
                discount = Math.round((originalPrice * Number(gift.discountValue)) / 100);
                if (gift.maxDiscount && discount > gift.maxDiscount) {
                  discount = gift.maxDiscount;
                }
              } else {
                discount = Number(gift.discountValue);
              }
              discount = Math.min(discount, originalPrice);

              // Increment usage counter in PostgreSQL
              await db.update(giftCodes)
                .set({ 
                  usedCount: (gift.usedCount || 0) + 1,
                  updatedAt: new Date()
                })
                .where(eq(giftCodes.code, cleanCode));
            }
          }
        }
      }
    }

    const finalPrice = Math.max(0, originalPrice - discount);

    // Generate unique sequential / formatted Booking ID: SMH-2026-XXXXXX
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    const seq = (Number(countResult[0]?.count) || 0) + 1;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const bookingId = `SMH-2026-${String(seq).padStart(3, '0')}${randomSuffix}`;

    const newBooking = {
      bookingId,
      customerName: String(customerName).trim().slice(0, 100),
      mobileNumber: String(mobileNumber).trim().slice(0, 25),
      whatsappNumber: String(whatsappNumber || mobileNumber).trim().slice(0, 25),
      email: String(email || '').trim().slice(0, 150),
      service: String(service).trim().slice(0, 100),
      language: String(language || 'Bhojpuri').trim().slice(0, 50),
      songName: String(songName).trim().slice(0, 150),
      artistName: String(artistName || '').trim().slice(0, 100),
      nameToAdd: String(nameToAdd || '').trim().slice(0, 100),
      preferredStyle: String(preferredStyle || 'Hard Dholki / Electro DJ Punch').slice(0, 100),
      additionalRequirements: String(additionalRequirements || '').slice(0, 1000),
      deliveryTime: String(deliveryTime || 'Standard (2-3 Days)').slice(0, 50),
      audioFileName: audioFileName || '',
      audioFileData: audioFileData || '',
      originalPrice,
      discount,
      giftCode: appliedCode,
      finalPrice,
      status: 'Pending',
      customerUid: customerUid || 'guest',
    };

    // Insert into PostgreSQL
    const inserted = await db.insert(bookings).values(newBooking).returning();

    await logAudit(
      'New Booking Created',
      `Booking ${bookingId} submitted by ${customerName} for ${service} (Final: ₹${finalPrice})`,
      'Public Client'
    );

    return res.status(201).json({
      success: true,
      bookingId,
      booking: inserted[0] || newBooking
    });
  } catch (err) {
    console.error('PostgreSQL Booking submission error:', err);
    return res.status(500).json({ error: 'Failed to submit booking. Central database error.' });
  }
});

// ---------------------------------------------------------------------
// ADMIN AUTHENTICATION APIS (POSTGRESQL-BACKED)
// ---------------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanUser = String(username || 'sanjeet').trim();
    const adminRecords = await db.select().from(admins).where(eq(admins.username, cleanUser)).limit(1);

    if (adminRecords.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    const adminData = adminRecords[0];
    const isMatch = bcrypt.compareSync(String(password).trim(), adminData.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    // Generate JWT token (24 hours expiry)
    const token = jwt.sign(
      {
        username: adminData.username,
        email: adminData.email,
        role: adminData.role || 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit('Admin Login', `Successful login for user '${adminData.username}'`, adminData.username);

    return res.json({
      success: true,
      token,
      user: {
        username: adminData.username,
        email: adminData.email,
        role: adminData.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Authentication service error.' });
  }
});

// Verify Admin Session Token
app.get('/api/admin/verify-session', requireAdminAuth, (req: AuthRequest, res: Response) => {
  return res.json({
    valid: true,
    user: req.adminUser
  });
});

// ---------------------------------------------------------------------
// PROTECTED ADMIN MANAGEMENT APIS (POSTGRESQL-BACKED)
// ---------------------------------------------------------------------

// 1. Dashboard Overview Stats
app.get('/api/admin/dashboard-stats', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allB = await db.select().from(bookings);
    const allG = await db.select().from(giftCodes);
    const allS = await db.select().from(services);

    let totalBookings = allB.length;
    let pending = 0;
    let confirmed = 0;
    let paymentPending = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;
    let totalRevenue = 0;

    for (const b of allB) {
      const s = b.status || 'Pending';
      if (s === 'Pending') pending++;
      else if (s === 'Confirmed') confirmed++;
      else if (s === 'Payment Pending' || s === 'Payment Received') paymentPending++;
      else if (s === 'In Progress') inProgress++;
      else if (s === 'Completed') {
        completed++;
        totalRevenue += (Number(b.finalPrice) || 0);
      }
      else if (s === 'Cancelled') cancelled++;
    }

    const now = new Date();
    const activeCodes = allG.filter(g => g.status === 'active' && (!g.expiryDate || new Date(g.expiryDate) > now)).length;

    return res.json({
      totalBookings,
      pending,
      confirmed,
      paymentPending,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
      totalServices: allS.length,
      totalOffers: allG.length,
      activeCodes
    });
  } catch (err) {
    console.error('Stats computation error:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard stats from PostgreSQL' });
  }
});

// 2. Bookings Management
app.get('/api/admin/bookings', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    return res.json(list);
  } catch (err) {
    console.error('Bookings fetch error:', err);
    return res.status(500).json({ error: 'Could not fetch bookings from PostgreSQL' });
  }
});

app.patch('/api/admin/bookings/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();

    await db.update(bookings).set(updates).where(eq(bookings.bookingId, id));

    await logAudit(
      'Booking Updated',
      `Booking ${id} status set to '${updates.status || 'modified'}'`,
      req.adminUser?.username || 'admin'
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Booking update error:', err);
    return res.status(500).json({ error: 'Failed to update booking in PostgreSQL' });
  }
});

app.delete('/api/admin/bookings/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(bookings).where(eq(bookings.bookingId, id));

    await logAudit('Booking Deleted', `Booking ${id} deleted from PostgreSQL`, req.adminUser?.username || 'admin');
    return res.json({ success: true });
  } catch (err) {
    console.error('Booking delete error:', err);
    return res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// 3. Services Management
app.get('/api/admin/services', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(services).orderBy(asc(services.sortOrder));
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load services' });
  }
});

app.post('/api/admin/services', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceName, description, price, discountPrice, icon, status, highlights } = req.body;
    if (!serviceName || price === undefined) {
      return res.status(400).json({ error: 'Service name and price are required.' });
    }

    const id = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const highlightsStr = Array.isArray(highlights) ? highlights.join(', ') : (highlights || '');

    const record = {
      id,
      serviceName: String(serviceName).trim(),
      description: String(description || '').trim(),
      price: Number(price),
      discountPrice: discountPrice !== undefined ? Number(discountPrice) : Number(price),
      icon: icon || '🎚️',
      status: status || 'Active',
      highlights: highlightsStr,
      sortOrder: Math.floor(Date.now() / 1000)
    };

    await db.insert(services).values(record);
    await logAudit('Service Added', `Added service: ${serviceName} (₹${price}) in PostgreSQL`, req.adminUser?.username || 'admin');

    return res.status(201).json({ success: true, service: record });
  } catch (err) {
    console.error('Create service error:', err);
    return res.status(500).json({ error: 'Failed to create service in PostgreSQL' });
  }
});

app.put('/api/admin/services/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();
    if (updates.price) updates.price = Number(updates.price);
    if (updates.discountPrice) updates.discountPrice = Number(updates.discountPrice);
    if (Array.isArray(updates.highlights)) updates.highlights = updates.highlights.join(', ');

    await db.update(services).set(updates).where(eq(services.id, id));
    await logAudit('Service Edited', `Edited service ${id}`, req.adminUser?.username || 'admin');

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/admin/services/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(services).where(eq(services.id, id));
    await logAudit('Service Deleted', `Deleted service ${id}`, req.adminUser?.username || 'admin');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Quick Batch Price Management
app.patch('/api/admin/prices', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { prices } = req.body; // array of { id, price, discountPrice }
    if (!Array.isArray(prices)) {
      return res.status(400).json({ error: 'Expected array of prices.' });
    }

    for (const item of prices) {
      if (item.id && item.price !== undefined) {
        await db.update(services)
          .set({
            price: Number(item.price),
            discountPrice: item.discountPrice !== undefined ? Number(item.discountPrice) : Number(item.price),
            updatedAt: new Date()
          })
          .where(eq(services.id, item.id));
      }
    }

    await logAudit('Prices Updated', `Batch updated ${prices.length} service prices in PostgreSQL`, req.adminUser?.username || 'admin');
    return res.json({ success: true });
  } catch (err) {
    console.error('Batch price update error:', err);
    return res.status(500).json({ error: 'Failed to update prices' });
  }
});

// 4. Gift Codes / Offers Management
app.get('/api/admin/gift-codes', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(giftCodes).orderBy(desc(giftCodes.createdAt));
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch gift codes' });
  }
});

app.post('/api/admin/gift-codes', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    let {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      expiryDate,
      usageLimit,
      showPublicOffer,
      publicBannerText
    } = req.body;

    if (!code) {
      code = 'SANJEET' + Math.floor(10 + Math.random() * 90);
    }
    const cleanCode = String(code).trim().toUpperCase();

    const record = {
      code: cleanCode,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue) || 20,
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : 500,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit ? Number(usageLimit) : 100,
      usedCount: 0,
      perCustomerLimit: 1,
      status: 'active',
      showPublicOffer: Boolean(showPublicOffer),
      publicBannerText: publicBannerText || `Special Offer: Use code ${cleanCode} for savings!`
    };

    await db.insert(giftCodes).values(record);
    await logAudit('Gift Code Created', `Created code '${cleanCode}' in PostgreSQL`, req.adminUser?.username || 'admin');

    return res.status(201).json({ success: true, giftCode: record });
  } catch (err) {
    console.error('Gift code creation error:', err);
    return res.status(500).json({ error: 'Failed to create gift code' });
  }
});

app.put('/api/admin/gift-codes/:code', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const cleanCode = code.toUpperCase();
    const updates = req.body;
    if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate);
    updates.updatedAt = new Date();

    await db.update(giftCodes).set(updates).where(eq(giftCodes.code, cleanCode));
    await logAudit('Gift Code Updated', `Updated gift code ${cleanCode}`, req.adminUser?.username || 'admin');

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update gift code' });
  }
});

app.delete('/api/admin/gift-codes/:code', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    await db.delete(giftCodes).where(eq(giftCodes.code, code.toUpperCase()));
    await logAudit('Gift Code Deleted', `Deleted code ${code}`, req.adminUser?.username || 'admin');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete gift code' });
  }
});

// 5. Website Settings Management
app.get('/api/admin/settings', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const results = await db.select().from(websiteSettings).where(eq(websiteSettings.id, 'general')).limit(1);
    return res.json(results[0] || {});
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put('/api/admin/settings', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();

    await db.update(websiteSettings).set(updates).where(eq(websiteSettings.id, 'general'));
    await logAudit('Website Settings Updated', 'Modified global website information in PostgreSQL', req.adminUser?.username || 'admin');

    return res.json({ success: true, message: 'Settings saved and applied to website.' });
  } catch (err) {
    console.error('Settings update error:', err);
    return res.status(500).json({ error: 'Failed to update website settings' });
  }
});

// 6. Security & Credentials
app.post('/api/admin/change-password', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const adminUser = req.adminUser?.username || 'sanjeet';
    const records = await db.select().from(admins).where(eq(admins.username, adminUser)).limit(1);
    if (records.length === 0) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const adminData = records[0];
    const isMatch = bcrypt.compareSync(String(currentPassword).trim(), adminData.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = bcrypt.hashSync(String(newPassword).trim(), 10);
    await db.update(admins)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(admins.id, adminData.id));

    await logAudit('Password Changed', 'Admin password was updated successfully in PostgreSQL', adminUser);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

app.post('/api/admin/change-account', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email } = req.body;
    const adminUser = req.adminUser?.username || 'sanjeet';
    const updates: any = { updatedAt: new Date() };
    if (username) updates.username = String(username).trim();
    if (email) updates.email = String(email).trim();

    await db.update(admins).set(updates).where(eq(admins.username, adminUser));
    await logAudit('Account Details Changed', `Updated username/email to ${updates.username || ''} / ${updates.email || ''}`, adminUser);

    return res.json({ success: true, message: 'Account details updated.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update account details.' });
  }
});

// 7. Audit Logs
app.get('/api/admin/audit-logs', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch audit logs' });
  }
});

// ---------------------------------------------------------------------
// ROUTE PROTECTION & MASKING
// ---------------------------------------------------------------------

// Mask /admin.html or /admin: Redirect to root so the word "admin" is never exposed
app.get(['/admin.html', '/admin', '/administrator'], (req: Request, res: Response) => {
  return res.redirect('/');
});

// Hidden Admin Route: /manage and /manage/dashboard serve manage.html
app.get(['/manage', '/manage/dashboard'], (req: Request, res: Response) => {
  const managePath = path.resolve(__dirname, 'manage.html');
  if (fs.existsSync(managePath)) {
    return res.sendFile(managePath);
  }
  return res.redirect('/');
});

// Setup Vite in middleware mode for Development / Production static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sanjeet Music Hub] Full-Stack Server active on http://0.0.0.0:${PORT} (PostgreSQL Connected)`);
  });
}

startServer();
