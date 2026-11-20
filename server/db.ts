import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'maison_crumb.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      addresses_json TEXT DEFAULT '[]',
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'staff', 'manager', 'super_admin')),
      account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active', 'suspended')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_bootstrap (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      passcode_hash TEXT,
      claimed_by_email TEXT,
      claimed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category_id TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      image_urls_json TEXT NOT NULL,
      ingredients_json TEXT NOT NULL,
      allergens_json TEXT NOT NULL,
      weight TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS discount_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('percent', 'fixed')),
      value INTEGER NOT NULL CHECK(value > 0),
      min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      guest_token TEXT UNIQUE,
      discount_code TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      UNIQUE(cart_id, product_id),
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      user_id TEXT,
      customer_details_json TEXT NOT NULL,
      delivery_address_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      delivery_fee_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      discount_code TEXT,
      total_cents INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('stripe', 'bakery_pickup')),
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      order_status TEXT NOT NULL DEFAULT 'pending' CHECK(order_status IN ('pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
      payment_reference TEXT,
      idempotency_key TEXT UNIQUE,
      internal_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workshops (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_urls_json TEXT NOT NULL,
      duration TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      level TEXT NOT NULL DEFAULT 'All Levels',
      location TEXT NOT NULL DEFAULT '42 Rue des Martyrs, Paris',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workshop_slots (
      id TEXT PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      maximum_participants INTEGER NOT NULL CHECK(maximum_participants > 0),
      booked_participants INTEGER NOT NULL DEFAULT 0 CHECK(booked_participants >= 0),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'full', 'cancelled')),
      FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_number TEXT NOT NULL UNIQUE,
      user_id TEXT,
      workshop_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      participant_count INTEGER NOT NULL CHECK(participant_count > 0),
      customer_details_json TEXT NOT NULL,
      total_amount_cents INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('stripe', 'bakery_pickup')),
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      booking_status TEXT NOT NULL DEFAULT 'pending' CHECK(booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
      payment_reference TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id),
      FOREIGN KEY (slot_id) REFERENCES workshop_slots(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      booking_id TEXT,
      provider TEXT NOT NULL,
      provider_reference TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'eur',
      status TEXT NOT NULL,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS website_content (
      section_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      images_json TEXT NOT NULL DEFAULT '[]',
      content_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'in_review', 'resolved')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'subscribed' CHECK(status IN ('subscribed', 'unsubscribed')),
      subscribed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'not_configured', 'failed')),
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      author_name TEXT NOT NULL,
      published_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_slots_workshop ON workshop_slots(workshop_id, date);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
  `);

  seedInitialData();
}

function seedInitialData() {
  const existingCategories = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  if (existingCategories.c > 0) return;

  const now = new Date().toISOString();

  // Seed Categories
  const categories = [
    {
      id: 'cat-sourdough',
      name: 'Artisan Sourdough',
      slug: 'artisan-sourdough',
      description: 'Naturally fermented boules nourished by our 110-year-old levain mother.',
      imageUrl: '/src/assets/images/product_country_sourdough_1795207472437.jpg',
      sortOrder: 1,
    },
    {
      id: 'cat-baguettes',
      name: 'Traditional Baguettes',
      slug: 'traditional-baguettes',
      description: 'Crisp, blistered crusts and creamy open crumb baked on granite stone hearths.',
      imageUrl: '/src/assets/images/product_baguette_tradition_1795207473023.jpg',
      sortOrder: 2,
    },
    {
      id: 'cat-croissants',
      name: 'Croissants',
      slug: 'croissants',
      description: '27 delicate layers laminated with AOP Charentes-Poitou cultured butter.',
      imageUrl: '/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg',
      sortOrder: 3,
    },
    {
      id: 'cat-pastries',
      name: 'French Pastries',
      slug: 'french-pastries',
      description: 'Heritage viennoiserie, brioche feuilletée, and warm Parisian tarts.',
      imageUrl: '/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg',
      sortOrder: 4,
    },
    {
      id: 'cat-specialty',
      name: 'Specialty Bread',
      slug: 'specialty-bread',
      description: 'Touraine rye, Khorasan heritage grains, toasted walnuts, and sea salt.',
      imageUrl: '/src/assets/images/product_rye_specialty_1795207471602.jpg',
      sortOrder: 5,
    },
    {
      id: 'cat-seasonal',
      name: 'Seasonal Collections',
      slug: 'seasonal-collections',
      description: 'Limited-harvest loaves celebrating French botanicals and stone-milled grains.',
      imageUrl: '/src/assets/images/terroir_ancestral_flour_1795207471972.jpg',
      sortOrder: 6,
    },
  ];

  const insertCat = db.prepare(
    `INSERT INTO categories (id, name, slug, description, image_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  for (const c of categories) {
    insertCat.run(c.id, c.name, c.slug, c.description, c.imageUrl, c.sortOrder);
  }

  // Seed Products (12 artisan items across all 6 categories)
  const products = [
    {
      id: 'prod-miche-1894',
      name: 'La Grande Miche 1894',
      slug: 'la-grande-miche-1894',
      description:
        'Our signature 1.2kg country sourdough boule fermented for 72 hours using stone-milled Touraine T80 wheat and our 110-year-old mother culture. Deeply caramelized crust with notes of toasted hazelnut and honey.',
      categoryId: 'cat-sourdough',
      priceCents: 1150,
      imageUrls: ['/src/assets/images/product_country_sourdough_1795207472437.jpg'],
      ingredients: ['Stone-milled Touraine T80 wheat flour', 'Spring water', '110-year liquid levain', 'Guérande grey sea salt'],
      allergens: ['Gluten (Wheat)'],
      weight: '1.2 kg',
      stock: 18,
      isFeatured: 1,
      salesCount: 142,
    },
    {
      id: 'prod-pain-campagne',
      name: 'Pain de Campagne au Levain',
      slug: 'pain-de-campagne-au-levain',
      description:
        'Classic Parisian farmhouse sourdough combining organic stone-ground wheat with 15% dark Touraine rye for lingering acidity and a tender, custard-soft crumb.',
      categoryId: 'cat-sourdough',
      priceCents: 890,
      imageUrls: ['/src/assets/images/product_country_sourdough_1795207472437.jpg'],
      ingredients: ['Organic T65 wheat flour', 'Stone-ground rye flour', 'Natural sourdough mother', 'Guérande sea salt'],
      allergens: ['Gluten (Wheat, Rye)'],
      weight: '850 g',
      stock: 24,
      isFeatured: 1,
      salesCount: 196,
    },
    {
      id: 'prod-baguette-tradition',
      name: 'Baguette de Tradition Française',
      slug: 'baguette-de-tradition-francaise',
      description:
        'Baked in small batches every hour on our granite deck. Crisp amber ear, translucent honeycombed crumb, and pure fermented wheat sweetness with zero commercial yeast.',
      categoryId: 'cat-baguettes',
      priceCents: 260,
      imageUrls: ['/src/assets/images/product_baguette_tradition_1795207473023.jpg'],
      ingredients: ['Label Rouge T65 wheat flour', 'Filtered water', 'Poolish & liquid levain', 'Fine sea salt'],
      allergens: ['Gluten (Wheat)'],
      weight: '250 g',
      stock: 48,
      isFeatured: 1,
      salesCount: 410,
    },
    {
      id: 'prod-baguette-graines',
      name: 'Baguette aux Graines Torréfiées',
      slug: 'baguette-aux-graines-torrefiees',
      description:
        'Our Tradition dough rolled generously in toasted golden flax, black sesame, sunflower, and poppy seeds before granite baking.',
      categoryId: 'cat-baguettes',
      priceCents: 320,
      imageUrls: ['/src/assets/images/product_baguette_tradition_1795207473023.jpg'],
      ingredients: ['T65 heritage wheat flour', 'Golden flax', 'Sesame', 'Sunflower seeds', 'Poppy seeds', 'Liquid levain'],
      allergens: ['Gluten (Wheat)', 'Sesame'],
      weight: '280 g',
      stock: 22,
      isFeatured: 0,
      salesCount: 128,
    },
    {
      id: 'prod-croissant-aop',
      name: 'Croissant au Beurre AOP',
      slug: 'croissant-au-beurre-aop',
      description:
        '72-hour cold-fermented brioche-levain dough laminated with cultured Charentes-Poitou AOP butter. Shatteringly crisp exterior with a warm, fragrant honeycomb center.',
      categoryId: 'cat-croissants',
      priceCents: 340,
      imageUrls: ['/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg'],
      ingredients: ['T45 pastry flour', 'Charentes-Poitou AOP cultured butter', 'Whole Normandy milk', 'Wildflower honey', 'Sea salt'],
      allergens: ['Gluten (Wheat)', 'Dairy', 'Eggs'],
      weight: '85 g',
      stock: 30,
      isFeatured: 1,
      salesCount: 318,
    },
    {
      id: 'prod-pain-chocolat',
      name: 'Pain au Chocolat Grand Cru',
      slug: 'pain-au-chocolat-grand-cru',
      description:
        'Flaky cultured butter pastry folded around twin batons of 70% single-origin Valrhona dark chocolate.',
      categoryId: 'cat-croissants',
      priceCents: 380,
      imageUrls: ['/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg'],
      ingredients: ['T45 pastry flour', 'AOP cultured butter', '70% Valrhona dark chocolate', 'Organic raw cane sugar', 'Normandy milk'],
      allergens: ['Gluten (Wheat)', 'Dairy', 'Eggs', 'Soy lecithin'],
      weight: '95 g',
      stock: 26,
      isFeatured: 1,
      salesCount: 274,
    },
    {
      id: 'prod-brioche-feuilletee',
      name: 'Brioche Feuilletée à la Fleur de Sel',
      slug: 'brioche-feuilletee-fleur-de-sel',
      description:
        'Caramelized laminated brioche swirled with Madagascar vanilla bean sugar and finished with crunchy Guérande fleur de sel.',
      categoryId: 'cat-pastries',
      priceCents: 680,
      imageUrls: ['/src/assets/images/product_rye_specialty_1795207471602.jpg'],
      ingredients: ['Stone-ground pastry flour', 'Farmhouse eggs', 'AOP butter', 'Madagascar vanilla', 'Fleur de sel'],
      allergens: ['Gluten (Wheat)', 'Dairy', 'Eggs'],
      weight: '260 g',
      stock: 4, // Low stock trigger for Admin dashboard!
      isFeatured: 0,
      salesCount: 94,
    },
    {
      id: 'prod-flan-parisien',
      name: 'Flan Pâtissier à la Vanille Bourbon',
      slug: 'flan-patissier-vanille-bourbon',
      description:
        'Silky baked custard infused with whole Bourbon vanilla pods inside a crisp inverted puff pastry shell.',
      categoryId: 'cat-pastries',
      priceCents: 590,
      imageUrls: ['/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg'],
      ingredients: ['Raw whole milk', 'Crème fraîche', 'Free-range egg yolks', 'Bourbon vanilla pods', 'AOP butter pastry'],
      allergens: ['Gluten (Wheat)', 'Dairy', 'Eggs'],
      weight: '220 g',
      stock: 12,
      isFeatured: 0,
      salesCount: 86,
    },
    {
      id: 'prod-seigle-touraine',
      name: 'Tourte de Seigle & Graines',
      slug: 'tourte-de-seigle-graines',
      description:
        'Dense, aromatic dark Touraine rye loaf encrusted with toasted pumpkin, flax, and oat flakes. Ideal paired with aged Comté or salted butter.',
      categoryId: 'cat-specialty',
      priceCents: 940,
      imageUrls: ['/src/assets/images/product_rye_specialty_1795207471602.jpg'],
      ingredients: ['100% Stone-milled Touraine rye T130', 'Toasted pumpkin & flax seeds', 'Rye levain', 'Guérande sea salt'],
      allergens: ['Gluten (Rye, Oats)'],
      weight: '750 g',
      stock: 14,
      isFeatured: 1,
      salesCount: 112,
    },
    {
      id: 'prod-pain-noix',
      name: 'Pain aux Noix du Périgord',
      slug: 'pain-aux-noix-perigord',
      description:
        'Naturally fermented whole-grain boule folded with roasted Périgord walnut halves and a touch of chestnut honey.',
      categoryId: 'cat-specialty',
      priceCents: 1020,
      imageUrls: ['/src/assets/images/product_country_sourdough_1795207472437.jpg'],
      ingredients: ['Touraine T110 wheat', 'AOP Périgord walnuts', 'Chestnut honey', '110-year levain', 'Sea salt'],
      allergens: ['Gluten (Wheat)', 'Tree Nuts (Walnuts)'],
      weight: '700 g',
      stock: 3, // Low stock!
      isFeatured: 0,
      salesCount: 79,
    },
    {
      id: 'prod-khorasan-harvest',
      name: 'Pain Ancestral au Khorasan',
      slug: 'pain-ancestral-khorasan',
      description:
        'Golden heirloom Khorasan grain milled fresh weekly in Touraine, delivering a naturally buttery aroma and radiant amber crumb.',
      categoryId: 'cat-seasonal',
      priceCents: 1080,
      imageUrls: ['/src/assets/images/terroir_ancestral_flour_1795207471972.jpg'],
      ingredients: ['Organic Touraine Khorasan flour', 'Spring water', 'Liquid levain', 'Guérande salt'],
      allergens: ['Gluten (Wheat)'],
      weight: '800 g',
      stock: 11,
      isFeatured: 0,
      salesCount: 64,
    },
    {
      id: 'prod-levain-pot',
      name: 'Le Levain Mère 1914 (Starter Jar)',
      slug: 'le-levain-mere-1914-starter',
      description:
        'A living portion of our 110-year-old Parisian sourdough mother in a reusable stoneware jar, accompanied by Laurent Duval’s feeding & hydration parchment guide.',
      categoryId: 'cat-seasonal',
      priceCents: 1800,
      imageUrls: ['/src/assets/images/terroir_sourdough_mother_1795207472098.jpg'],
      ingredients: ['110-year active wheat & rye levain culture', 'Organic Touraine stone-milled flour', 'Spring water'],
      allergens: ['Gluten (Wheat, Rye)'],
      weight: '300 g',
      stock: 9,
      isFeatured: 0,
      salesCount: 53,
    },
  ];

  const insertProd = db.prepare(
    `INSERT INTO products (id, name, slug, description, category_id, price_cents, image_urls_json, ingredients_json, allergens_json, weight, stock, is_available, is_featured, sales_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  );
  for (const p of products) {
    insertProd.run(
      p.id,
      p.name,
      p.slug,
      p.description,
      p.categoryId,
      p.priceCents,
      JSON.stringify(p.imageUrls),
      JSON.stringify(p.ingredients),
      JSON.stringify(p.allergens),
      p.weight,
      p.stock,
      p.isFeatured,
      p.salesCount,
      now,
      now
    );
  }

  // Discount codes
  db.prepare(`INSERT INTO discount_codes (id, code, type, value, min_subtotal_cents, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run(
    'disc-levain10',
    'LEVAIN10',
    'percent',
    10,
    1500
  );
  db.prepare(`INSERT INTO discount_codes (id, code, type, value, min_subtotal_cents, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run(
    'disc-paris5',
    'PARIS5',
    'fixed',
    500,
    2500
  );

  // Seed Workshops & Upcoming Slots
  const workshops = [
    {
      id: 'ws-levain-masterclass',
      title: 'The 110-Year Levain Masterclass',
      slug: '110-year-levain-masterclass',
      description:
        'An intimate four-hour immersion in our Rue des Martyrs bakehouse. Learn levain maintenance, gentle autolyse hydration, hand-shaping Country Boules, and granite-hearth scoring alongside Maître Boulanger Laurent Duval. Leave with two baked loaves, a banneton, and a jar of our living 1914 sourdough mother.',
      imageUrls: ['/src/assets/images/workshop_atelier_hands_1795207472589.jpg', '/src/assets/images/terroir_sourdough_mother_1795207472098.jpg'],
      duration: '4 Hours',
      priceCents: 14500,
      level: 'Beginner & Enthusiast',
      location: '42 Rue des Martyrs, 75009 Paris',
    },
    {
      id: 'ws-viennoiserie-butter',
      title: 'Cultured Butter Croissant & Viennoiserie Atelier',
      slug: 'cultured-butter-croissant-atelier',
      description:
        'Master the French art of tourage with Pastry Director Claire de Saint-Amand. Work with cold-fermented détrempe and Charentes-Poitou AOP butter to fold 27 crisp, honeycomb layers for croissants and pain au chocolat.',
      imageUrls: ['/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg', '/src/assets/images/artisan_claire_saint_amand_1795207472288.jpg'],
      duration: '3.5 Hours',
      priceCents: 16500,
      level: 'Intermediate',
      location: '42 Rue des Martyrs, 75009 Paris',
    },
    {
      id: 'ws-ancestral-grains',
      title: 'Stone-Milled Heritage Grains & Baguette de Tradition',
      slug: 'stone-milled-heritage-grains-baguette',
      description:
        'Explore Touraine Khorasan, Rouge de Bordeaux, and dark rye flours with miller Gaspard Moreau. Practice shaping and scoring crisp Baguettes de Tradition using slow poolish and liquid levain.',
      imageUrls: ['/src/assets/images/product_baguette_tradition_1795207473023.jpg', '/src/assets/images/terroir_ancestral_flour_1795207471972.jpg'],
      duration: '3 Hours',
      priceCents: 12500,
      level: 'All Levels',
      location: '42 Rue des Martyrs, 75009 Paris',
    },
  ];

  const insertWs = db.prepare(
    `INSERT INTO workshops (id, title, slug, description, image_urls_json, duration, price_cents, level, location, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );
  for (const w of workshops) {
    insertWs.run(w.id, w.title, w.slug, w.description, JSON.stringify(w.imageUrls), w.duration, w.priceCents, w.level, w.location, now);
  }

  // Generate upcoming slots over the next 21 days from current date
  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const slots = [
    { id: 'slot-1', workshopId: 'ws-levain-masterclass', date: addDays(3), startTime: '09:00', endTime: '13:00', max: 8, booked: 4 },
    { id: 'slot-2', workshopId: 'ws-levain-masterclass', date: addDays(7), startTime: '14:00', endTime: '18:00', max: 8, booked: 2 },
    { id: 'slot-3', workshopId: 'ws-levain-masterclass', date: addDays(14), startTime: '09:00', endTime: '13:00', max: 8, booked: 8 }, // full slot example
    { id: 'slot-4', workshopId: 'ws-viennoiserie-butter', date: addDays(4), startTime: '08:30', endTime: '12:00', max: 6, booked: 3 },
    { id: 'slot-5', workshopId: 'ws-viennoiserie-butter', date: addDays(11), startTime: '08:30', endTime: '12:00', max: 6, booked: 1 },
    { id: 'slot-6', workshopId: 'ws-ancestral-grains', date: addDays(5), startTime: '15:00', endTime: '18:00', max: 10, booked: 5 },
    { id: 'slot-7', workshopId: 'ws-ancestral-grains', date: addDays(12), startTime: '15:00', endTime: '18:00', max: 10, booked: 2 },
  ];

  const insertSlot = db.prepare(
    `INSERT INTO workshop_slots (id, workshop_id, date, start_time, end_time, maximum_participants, booked_participants, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of slots) {
    insertSlot.run(s.id, s.workshopId, s.date, s.startTime, s.endTime, s.max, s.booked, s.booked >= s.max ? 'full' : 'open');
  }

  // Seed Website CMS Content (All homepage & editorial sections editable in /admin/cms)
  const cmsSections = [
    {
      sectionId: 'hero',
      title: 'From a Hundred-Year-Old Sourdough Mother to the Heart of Paris.',
      subtitle: 'MAISON CRUMB · BOULANGERIE ARTISANALE · PARIS IX',
      description:
        'Since 1894, four generations have tended a living culture of wild yeast, cold-fermenting Touraine stone-milled grains for seventy-two unhurried hours before baking on heated granite hearths.',
      images: ['/src/assets/images/hero_artisan_baker_1795207471833.jpg'],
      content: {
        quoteOverlay: '« Le pain est une mémoire vivante que l’on partage chaque matin. »',
        quoteAttribution: 'Laurent Duval · Maître Boulanger',
        infoCards: [
          { label: 'Mother Culture', value: '110 Years Active', detail: 'Refreshed daily since 1914' },
          { label: 'Fermentation', value: '72-Hour Cold Craft', detail: 'Zero commercial dry yeast' },
          { label: 'Grain Origin', value: 'Touraine Terroir', detail: 'Stone-milled T80 & Khorasan' },
          { label: 'Hearth Baking', value: 'Granite Deck', detail: 'Caramelized blistered crust' },
        ],
      },
    },
    {
      sectionId: 'timeline',
      title: "L'Épopée du Levain – A Century of Craft",
      subtitle: 'OUR HERITAGE CHRONICLE',
      description: 'Five defining chapters that shaped our Parisian bakehouse and preserved an unbroken lineage of natural fermentation.',
      images: [],
      content: {
        milestones: [
          {
            year: '1894',
            title: 'The Stone Mill in Touraine',
            description: 'Henri Duval opens a water-powered stone mill along the Cher valley, grinding heirloom Rouge de Bordeaux wheat for local farmhouses.',
            highlighted: false,
          },
          {
            year: '1938',
            title: 'Preserving the Mother Levain',
            description: 'Amid wartime flour rationing, the family safeguards its prized stoneware levain crock, feeding it wild rye and spring water each dawn.',
            highlighted: false,
          },
          {
            year: '1968',
            title: 'Rue des Martyrs Opens in Paris',
            description: 'The Duval family brings Touraine stone-milled flours to Paris IX, installing a hand-laid refractory granite oven on Rue des Martyrs.',
            highlighted: false,
          },
          {
            year: '1998',
            title: 'The 72-Hour Cold Protocol',
            description: 'Laurent Duval pioneers extended cold-room maturation at 4°C, unlocking complex lactic sweetness and natural digestibility.',
            highlighted: false,
          },
          {
            year: '2025',
            title: 'The Atelier & Digital Guild',
            description: 'MAISON CRUMB opens its Parisian breadmaking school and direct-to-table bakehouse delivery while mentoring a new generation of apprentices.',
            highlighted: true,
          },
        ],
      },
    },
    {
      sectionId: 'terroir',
      title: 'The Sacred Trinity of Parisian Terroir',
      subtitle: 'INGREDIENTS & ORIGINS',
      description: 'Every loaf begins long before the mixing trough—in living soil, historic stone mills, and an unbroken microbial lineage.',
      images: [
        '/src/assets/images/terroir_ancestral_flour_1795207471972.jpg',
        '/src/assets/images/terroir_touraine_fields_1795207471777.jpg',
        '/src/assets/images/terroir_sourdough_mother_1795207472098.jpg',
      ],
      content: {
        cards: [
          {
            title: 'The Ancestral Flour',
            origin: 'Meule de Pierre · T80 & Khorasan',
            description:
              'Slowly milled between natural flint stones so the wheat germ oil remains intact, preserving nutty aromatics and vital minerals.',
            ingredients: ['Rouge de Bordeaux', 'Khorasan Heritage Grain', 'Dark Touraine Rye'],
            relatedProductSlug: 'la-grande-miche-1894',
            image: '/src/assets/images/terroir_ancestral_flour_1795207471972.jpg',
          },
          {
            title: 'Terroir de Touraine',
            origin: 'Loire Valley · Regenerative Farms',
            description:
              'Grown without synthetic fungicides by partner family estates in Touraine, rotated with clover and legumes to nourish chalky limestone soils.',
            ingredients: ['100% French Single-Estate Wheat', 'Chalk-Loam Mineral Profile', 'Zero Bleaching Agents'],
            relatedProductSlug: 'pain-ancestral-khorasan',
            image: '/src/assets/images/terroir_touraine_fields_1795207471777.jpg',
          },
          {
            title: 'The 110-Year Sourdough',
            origin: 'Levain Mère · Est. 1914',
            description:
              'Our living liquid and stiff mother cultures confer a honeyed lactic balance, extended natural keeping quality, and unmistakable golden blistered crust.',
            ingredients: ['Wild Lactobacilli Flora', 'Guérande Grey Sea Salt', 'Filtered Paris Spring Water'],
            relatedProductSlug: 'le-levain-mere-1914-starter',
            image: '/src/assets/images/terroir_sourdough_mother_1795207472098.jpg',
          },
        ],
      },
    },
    {
      sectionId: 'ritual',
      title: 'The 72-Hour Slow Craft Ritual',
      subtitle: 'METHODOLOGY OF FERMENTATION',
      description: 'Time is our primary ingredient. We never accelerate nature with industrial improvers or commercial dry yeast.',
      images: [],
      content: {
        steps: [
          {
            step: '01',
            title: 'Autolyse & Ferment',
            duration: 'Hours 0 – 4',
            detail: 'Flour and spring water rest undisturbed to hydrate gluten naturally before gently folding in our 110-year liquid levain and sea salt.',
          },
          {
            step: '02',
            title: 'Le Tournage Manuel',
            duration: 'Hours 4 – 8',
            detail: 'Four gentle coil folds by hand respect the fragile gas alveoli, building structure without overheating or oxidizing the dough.',
          },
          {
            step: '03',
            title: 'Fermentation au Froid',
            duration: 'Hours 8 – 68',
            detail: 'Shaped loaves slumber in linen-lined wicker bannetons at 4°C, developing complex caramel notes and natural enzymatic digestibility.',
          },
          {
            step: '04',
            title: 'Cuisson Sole de Granit',
            duration: 'Hours 68 – 72',
            detail: 'Scored with a curved lame and slid onto 250°C French granite hearths with steam injection for an audible crackle and glossy mahogany crust.',
          },
        ],
      },
    },
    {
      sectionId: 'artisans',
      title: 'Human Hands Behind Every Loaf',
      subtitle: 'THE MAISON CRUMB GUILD',
      description: 'Our bakehouse unites master bakers, pastry directors, and heritage grain millers working side by side before sunrise.',
      images: [],
      content: {
        profiles: [
          {
            name: 'Laurent Duval',
            role: 'Maître Boulanger & Custodian of the Levain',
            experience: '34 Years at the Hearth',
            bio: 'Fourth-generation baker who instituted our 72-hour cold-fermentation archive and oversees every morning bake at Rue des Martyrs.',
            image: '/src/assets/images/artisan_laurent_duval_1795207472143.jpg',
          },
          {
            name: 'Claire de Saint-Amand',
            role: 'Chef Viennoiserie & Pastry Director',
            experience: '18 Years in Parisian Patisserie',
            bio: 'Master of cultured-butter lamination, marrying wild levain fermentation with delicate 27-layer Charentes-Poitou AOP croissants.',
            image: '/src/assets/images/artisan_claire_saint_amand_1795207472288.jpg',
          },
          {
            name: 'Gaspard Moreau',
            role: 'Stone Miller & Grain Archivist',
            experience: '14 Years in Touraine Milling',
            bio: 'Liaises directly with twelve regenerative Touraine farms, calibrating our Astrié stone mill weekly to preserve peak flour aromatics.',
            image: '/src/assets/images/artisan_gaspard_moreau_1795207472568.jpg',
          },
        ],
      },
    },
    {
      sectionId: 'charter',
      title: 'Our Ethical Charter',
      subtitle: 'FOUR UNCOMPROMISING PILLARS',
      description: 'Every loaf leaving our ovens honors a transparent pact with the soil, our guests, and the craftspeople of Paris.',
      images: [],
      content: {
        principles: [
          {
            number: 'I',
            title: 'Zero Additives & Zero Dry Yeast',
            description: 'Strictly flour, spring water, living sourdough levain, and sea salt. Never ascorbic acid, enzymes, or artificial dough conditioners.',
          },
          {
            number: 'II',
            title: '100% Traceable French Origins',
            description: 'Every sack of grain is stamped with its Touraine harvest parcel, farmer name, and stone-milling date.',
          },
          {
            number: 'III',
            title: 'Fully Mature Mother Fermentation',
            description: 'Minimum 48 to 72 hours of fermentation breaks down phytic acid naturally, yielding light, nourishing, deeply flavorful bread.',
          },
          {
            number: 'IV',
            title: 'Artisanal Guild Apprenticeships',
            description: 'We fund paid daytime apprenticeships and pass traditional French stone-hearth mastery to the next generation of boulangers.',
          },
        ],
      },
    },
    {
      sectionId: 'quotation',
      title: '« Faire du pain, ce n’est pas mélanger de la farine et de l’eau ; c’est écouter le temps, respecter le grain et honorer la main qui le pétrit. »',
      subtitle: 'LAURENT DUVAL · RUE DES MARTYRS, PARIS',
      description: 'To make bread is not merely to mix flour and water; it is to listen to time, honor the grain, and respect the hand that shapes it.',
      images: [],
      content: {},
    },
    {
      sectionId: 'workshop_cta',
      title: 'Experience the Heritage with Your Own Hands',
      subtitle: 'PARISIAN BREADMAKING ATELIER',
      description:
        'Step behind our marble counter at dawn. Learn the tactile rhythm of autolyse, hand-shaping, and granite-deck baking in small groups of eight guests maximum.',
      images: ['/src/assets/images/workshop_atelier_hands_1795207472589.jpg'],
      content: {
        primaryCta: 'Reserve Your Artisan Bread Class',
        secondaryCta: 'Discover Our Heritage',
      },
    },
    {
      sectionId: 'footer',
      title: 'MAISON CRUMB',
      subtitle: 'Boulangerie Artisanale · Paris IX',
      description:
        'Rooted in Touraine grain heritage and sustained by our 1914 sourdough mother. Baked daily on granite stone hearths at 42 Rue des Martyrs.',
      images: [],
      content: {
        address: '42 Rue des Martyrs, 75009 Paris, France',
        hours: 'Tuesday – Sunday · 07:00 – 19:30',
        phone: '+33 1 42 85 19 04',
        email: 'bonjour@maisoncrumb.fr',
        instagram: 'https://instagram.com',
      },
    },
  ];

  const insertCms = db.prepare(
    `INSERT INTO website_content (section_id, title, subtitle, description, images_json, content_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of cmsSections) {
    insertCms.run(s.sectionId, s.title, s.subtitle, s.description, JSON.stringify(s.images), JSON.stringify(s.content), now);
  }

  // Seed Journal Articles
  const articles = [
    {
      id: 'art-1',
      title: 'Why 72 Hours of Cold Fermentation Transforms Wheat Digestibility',
      slug: '72-hours-cold-fermentation-digestibility',
      excerpt: 'Inside our 4°C maturation cellar where wild lactobacilli break down complex fructans and unlock honeyed caramel aromatics.',
      content:
        'Industrial baking relies on rapid two-hour fermentation driven by commercial baker’s yeast, leaving complex wheat proteins and phytic acid largely intact. At Maison Crumb, our 72-hour cold protocol pairs wild lactobacilli with stone-milled Touraine flour. Over three unhurried days at 4°C, organic acids pre-digest gluten strands gently, mineral bioavailability rises, and natural sugars caramelize deeply against our 250°C granite stone deck.',
      category: 'Fermentation Science',
      imageUrl: '/src/assets/images/terroir_sourdough_mother_1795207472098.jpg',
      authorName: 'Laurent Duval',
      publishedAt: '2026-10-18T08:00:00Z',
    },
    {
      id: 'art-2',
      title: 'Autumn Harvest Report from Our Partner Mills in Touraine',
      slug: 'autumn-harvest-report-touraine-mills',
      excerpt: 'Gaspard Moreau reflects on this year’s sun-drenched Khorasan and Rouge de Bordeaux yields along the Loire valley.',
      content:
        'Following a dry September across central France, our twelve regenerative farm partners in Touraine harvested remarkably aromatic Rouge de Bordeaux and Khorasan wheat. Milled slowly on our Astrié stone mill at low RPM so the flour temperature never exceeds 30°C, the fresh golden grist brings unmistakable notes of toasted brioche and wildflower hay to every morning boule.',
      category: 'Terroir & Grain',
      imageUrl: '/src/assets/images/terroir_touraine_fields_1795207471777.jpg',
      authorName: 'Gaspard Moreau',
      publishedAt: '2026-11-02T08:00:00Z',
    },
    {
      id: 'art-3',
      title: 'The Geometry of 27 Layers: Cultured Butter Lamination',
      slug: 'geometry-27-layers-cultured-butter',
      excerpt: 'How Charentes-Poitou AOP butter and natural levain create a croissant crisp enough to shatter yet tender inside.',
      content:
        'True Parisian viennoiserie is an exercise in thermal discipline. By keeping our cultured AOP butter slab and cold-fermented détrempe at an identical 14°C plasticity, three simple folds yield twenty-seven distinct paper-thin ribbons of dough and butter that puff effortlessly in morning deck ovens.',
      category: 'Viennoiserie Craft',
      imageUrl: '/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg',
      authorName: 'Claire de Saint-Amand',
      publishedAt: '2026-11-12T08:00:00Z',
    },
  ];

  const insertArt = db.prepare(
    `INSERT INTO journal_articles (id, title, slug, excerpt, content, category, image_url, author_name, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const a of articles) {
    insertArt.run(a.id, a.title, a.slug, a.excerpt, a.content, a.category, a.imageUrl, a.authorName, a.publishedAt);
  }

  // Seed historical orders and bookings in SQLite so analytics charts reflect real database records
  // (No hardcoded admin credentials!)
  const daysAgo = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt.toISOString();
  };

  const sampleOrders = [
    {
      id: 'ord-seed-1',
      orderNumber: 'MC-2026-1001',
      customerDetails: { fullName: 'Camille Laurent', email: 'camille.laurent@example.fr', phone: '+33 6 12 45 78 90' },
      deliveryAddress: { address: '18 Rue Condorcet', city: 'Paris', postalCode: '75009', instructions: 'Digicode 42B' },
      items: [
        { productId: 'prod-miche-1894', name: 'La Grande Miche 1894', slug: 'la-grande-miche-1894', priceCents: 1150, quantity: 2, imageUrl: '/src/assets/images/product_country_sourdough_1795207472437.jpg', weight: '1.2 kg' },
        { productId: 'prod-croissant-aop', name: 'Croissant au Beurre AOP', slug: 'croissant-au-beurre-aop', priceCents: 340, quantity: 4, imageUrl: '/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg', weight: '85 g' },
      ],
      subtotalCents: 3660,
      deliveryFeeCents: 0,
      discountCents: 0,
      totalCents: 3660,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      createdAt: daysAgo(5),
    },
    {
      id: 'ord-seed-2',
      orderNumber: 'MC-2026-1002',
      customerDetails: { fullName: 'Henri Beaumont', email: 'henri.beaumont@example.fr', phone: '+33 6 88 21 30 14' },
      deliveryAddress: { address: '7 Avenue Trudaine', city: 'Paris', postalCode: '75009', instructions: 'Leave with concierge' },
      items: [
        { productId: 'prod-pain-campagne', name: 'Pain de Campagne au Levain', slug: 'pain-de-campagne-au-levain', priceCents: 890, quantity: 2, imageUrl: '/src/assets/images/product_country_sourdough_1795207472437.jpg', weight: '850 g' },
        { productId: 'prod-baguette-tradition', name: 'Baguette de Tradition Française', slug: 'baguette-de-tradition-francaise', priceCents: 260, quantity: 3, imageUrl: '/src/assets/images/product_baguette_tradition_1795207473023.jpg', weight: '250 g' },
      ],
      subtotalCents: 2560,
      deliveryFeeCents: 450,
      discountCents: 0,
      totalCents: 3010,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      createdAt: daysAgo(2),
    },
    {
      id: 'ord-seed-3',
      orderNumber: 'MC-2026-1003',
      customerDetails: { fullName: 'Élodie Marchand', email: 'elodie.marchand@example.fr', phone: '+33 6 34 19 60 22' },
      deliveryAddress: { address: '54 Rue de Rochechouart', city: 'Paris', postalCode: '75009', instructions: 'Ring twice' },
      items: [
        { productId: 'prod-pain-chocolat', name: 'Pain au Chocolat Grand Cru', slug: 'pain-au-chocolat-grand-cru', priceCents: 380, quantity: 4, imageUrl: '/src/assets/images/product_croissant_viennoiserie_1795207471728.jpg', weight: '95 g' },
        { productId: 'prod-seigle-touraine', name: 'Tourte de Seigle & Graines', slug: 'tourte-de-seigle-graines', priceCents: 940, quantity: 1, imageUrl: '/src/assets/images/product_rye_specialty_1795207471602.jpg', weight: '750 g' },
      ],
      subtotalCents: 2460,
      deliveryFeeCents: 450,
      discountCents: 0,
      totalCents: 2910,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      createdAt: daysAgo(0),
    },
  ];

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, order_number, user_id, customer_details_json, delivery_address_json, items_json, subtotal_cents, delivery_fee_cents, discount_cents, discount_code, total_cents, payment_method, payment_status, order_status, payment_reference, idempotency_key, internal_notes, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, 'bakery_pickup', ?, ?, NULL, ?, '', ?, ?)`
  );
  for (const o of sampleOrders) {
    insertOrder.run(
      o.id,
      o.orderNumber,
      JSON.stringify(o.customerDetails),
      JSON.stringify(o.deliveryAddress),
      JSON.stringify(o.items),
      o.subtotalCents,
      o.deliveryFeeCents,
      o.discountCents,
      o.totalCents,
      o.paymentStatus,
      o.orderStatus,
      `seed-${o.id}`,
      o.createdAt,
      o.createdAt
    );
  }

  db.prepare(
    `INSERT INTO bookings (id, booking_number, user_id, workshop_id, slot_id, participant_count, customer_details_json, total_amount_cents, payment_method, payment_status, booking_status, payment_reference, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'bakery_pickup', 'paid', 'confirmed', NULL, ?)`
  ).run(
    'bk-seed-1',
    'MC-WS-401',
    'ws-levain-masterclass',
    'slot-1',
    2,
    JSON.stringify({ fullName: 'Sébastien Girard', email: 'sebastien.girard@example.fr', phone: '+33 6 77 11 22 33' }),
    29000,
    daysAgo(3)
  );

  // Seed admin_bootstrap row
  db.prepare(`INSERT OR IGNORE INTO admin_bootstrap (id, passcode_hash, claimed_by_email, claimed_at) VALUES (1, NULL, NULL, NULL)`).run();
}
