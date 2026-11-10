import { detectSsl } from '@/lib/db-ssl'

// ── منطق تعبئة قاعدة البيانات بالبيانات الافتراضية ───────────────────────
// يشمل: الباقات + التعليقات + الكوبونات + المدير + الإعدادات
export async function seedDatabase(url: string): Promise<void> {
  const postgres = (await import('postgres')).default
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    ssl: detectSsl(url),
  })

  try {
    const encoder = new TextEncoder()
    async function hashPassword(password: string): Promise<string> {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const km = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256)
      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
      return `${toHex(salt.buffer as ArrayBuffer)}:${toHex(bits)}`
    }

    // ── الباقات ─────────────────────────────────────────────────────────
    await sql`DELETE FROM packages`
    await sql`INSERT INTO packages (diamonds, bonus_diamonds, price_usd, price_usdt, discount_pct, popular, flash_sale, delivery_eta, sort_order) VALUES
      (310, 50, 1.00, 1.00, 0, false, false, '1-5 minutes', 1),
      (520, 100, 2.00, 2.00, 0, false, false, '1-5 minutes', 2),
      (1060, 150, 3.00, 3.00, 0, true, false, '1-5 minutes', 3),
      (2180, 200, 5.00, 5.00, 0, true, false, '1-5 minutes', 4),
      (5600, 250, 7.00, 7.00, 0, true, false, '1-5 minutes', 5),
      (6600, 300, 8.00, 8.00, 0, false, false, '1-5 minutes', 6),
      (7700, 350, 9.00, 9.00, 0, false, false, '1-5 minutes', 7),
      (8800, 400, 10.00, 10.00, 0, false, false, '1-5 minutes', 8),
      (9900, 450, 11.00, 11.00, 0, false, false, '1-5 minutes', 9),
      (10500, 500, 12.00, 12.00, 0, true, false, '1-5 minutes', 10),
      (11500, 550, 13.00, 13.00, 0, false, false, '1-5 minutes', 11)`

    // ── التعليقات (reviews) ─────────────────────────────────────────────
    await sql`DELETE FROM reviews`
    await sql`INSERT INTO reviews (name, rating, title, comment, country, country_code, package_label, verified, created_at) VALUES
      ('Yasmin Bilal', 5, 'Amazing experience from the start!', 'First time dealing with this site and it was a great experience. Payment was secure and delivery instant. I recommended it to all my friends.', 'Morocco', 'MA', '520', true, now() - interval '2 days'),
      ('Ahmed Reza', 5, 'Excellent service & instant delivery!', 'Topped up 1060 diamonds and they arrived in just 2 minutes. Prices are competitive and the site is easy to use. Will always deal with them.', 'Algeria', 'DZ', '1060', true, now() - interval '7 days'),
      ('Lina Hassan', 5, 'Easy, safe — I recommend it to everyone!', 'Ease of purchase, payment safety, and delivery speed. This is everything a gamer needs!', 'UAE', 'AE', '100', true, now() - interval '12 days'),
      ('Miguel Santos', 5, 'Best top-up site out there', 'Paid with USDT, super smooth process. Customer support answered instantly on Telegram. 100% trusted.', 'Brazil', 'BR', '2180', true, now() - interval '15 days'),
      ('Priya Nair', 4, 'Great prices and fast delivery', 'The flash sale packages are amazing value. Delivery was quick and my diamonds arrived without any issues.', 'India', 'IN', '5600', true, now() - interval '20 days'),
      ('Carlos Mendez', 5, 'The QR payment made it so easy', 'I was a bit scared to try but everything worked perfectly. Scanned the QR, paid and got my diamonds fast.', 'Mexico', 'MX', '310', true, now() - interval '25 days'),
      ('Tomas Rivera', 5, 'Legit and reliable every time', 'Ordered multiple times now. Always fast, always safe, never any problems. My go-to top-up site.', 'Philippines', 'PH', '1060', true, now() - interval '30 days'),
      ('Sara Khalil', 5, 'Instant and trustworthy', 'Diamonds delivered before I even finished my coffee. Support is friendly and quick. Highly recommend.', 'Egypt', 'EG', '520', true, now() - interval '35 days'),
      ('Diego Alvarez', 5, 'Cheapest prices I found', 'Compared many sites and this had the best prices plus bonus diamonds. Delivery was instant. Very happy.', 'Colombia', 'CO', '2180', true, now() - interval '40 days'),
      ('Omar Bennis', 5, 'Super fast and friendly support', 'Had a small question and support replied on Telegram within seconds. Diamonds arrived instantly. Five stars!', 'Tunisia', 'TN', '1060', true, now() - interval '3 days'),
      ('Fatima Zohra', 5, 'My trusty place for diamonds', 'Fifth order and never disappointed. Fast delivery every single time and great prices. Definitely recommend.', 'Saudi Arabia', 'SA', '3100', true, now() - interval '9 days'),
      ('James Carter', 5, 'Smooth from start to finish', 'Easy checkout, quick QR payment and diamonds landed in a couple of minutes. Support was super responsive too.', 'United States', 'US', '5600', true, now() - interval '18 days'),
      ('Minh Nguyen', 5, 'Best prices I could find', 'I compared a bunch of stores and this one won on price with the bonus diamonds. Delivery was really fast. Love it.', 'Vietnam', 'VN', '2180', true, now() - interval '22 days'),
      ('Aisha Karim', 5, 'Great experience all round', 'Secure payment, instant delivery and friendly support. Everything worked flawlessly. My new go-to store.', 'Iraq', 'IQ', '1060', true, now() - interval '28 days'),
      ('Kenji Sato', 5, 'Reliable and worth every yen', 'Third order and it never fails. The diamonds always arrive fast and the discount codes actually work.', 'Japan', 'JP', '600', true, now() - interval '33 days'),
      ('Salma Hussein', 5, 'Always impresses me', 'I have bought several times and every order arrives quickly and safely. Support is always available.', 'Egypt', 'EG', '1060', true, now() - interval '4 days'),
      ('Youssef Amrani', 5, 'Fastest delivery I have seen', 'Ordered, paid and my diamonds came in under three minutes. Amazing service, highly recommended.', 'Morocco', 'MA', '310', true, now() - interval '8 days'),
      ('Hikmat Ali', 4, 'Good and reliable store', 'Everything went well and the diamonds arrived promptly. Minor delay at payment but support fixed it fast.', 'Jordan', 'JO', '100', true, now() - interval '11 days'),
      ('Nour Karim', 5, 'Best prices around', 'I searched everywhere and this store gave me the most diamonds for less. Delivery was instant too.', 'Egypt', 'EG', '3100', true, now() - interval '14 days'),
      ('Omar Diallo', 5, 'Superb, will order again', 'The whole process was smooth from start to finish. Secure payment and instant delivery. Totally trusted.', 'Senegal', 'SN', '2180', true, now() - interval '16 days'),
      ('Zara Mansour', 5, 'Loyal customer for months', 'I have ordered maybe ten times now and never had a single issue. Fast, cheap and dependable.', 'Jordan', 'JO', '2100', true, now() - interval '19 days'),
      ('Rania Fares', 5, 'Smooth and trustworthy', 'Payment was easy and my diamonds landed right after. The support team answered quickly on Telegram.', 'Kuwait', 'KW', '2100', true, now() - interval '23 days'),
      ('Hala Nasser', 4, 'Good experience overall', 'Delivery was quick and everything worked as promised. Would love even more discount events, but very happy.', 'Lebanon', 'LB', '1000', true, now() - interval '26 days'),
      ('Karim Haddad', 5, 'Zero regrets', 'I was cautious at first but the top-up was perfect. Fast, safe and the bonus diamonds were a nice surprise.', 'Algeria', 'DZ', '3100', true, now() - interval '27 days'),
      ('Mohammed Alhazmi', 5, 'My favorite store', 'The prices, the speed, everything is top notch. I keep coming back every time I need diamonds.', 'Saudi Arabia', 'SA', '1060', true, now() - interval '29 days'),
      ('Yara Osman', 5, 'Reliable since day one', 'First order months ago and they have never let me down. Instant delivery and friendly support.', 'Sudan', 'SD', '5200', true, now() - interval '32 days'),
      ('Bilal Ahmed', 5, 'Just perfect', 'Easy to use, fast and secure. My diamonds were added within minutes. This is my go-to store now.', 'Egypt', 'EG', '2180', true, now() - interval '34 days'),
      ('Layla Benali', 5, 'Excellent, as always', 'A smooth buy every single time. Great prices, quick delivery and real human support when I had questions.', 'Tunisia', 'TN', '5600', true, now() - interval '36 days'),
      ('Adam Williams', 5, 'Top quality service', 'Very smooth process, unbeatable prices and the diamonds landed instantly. Could not ask for more.', 'United Kingdom', 'GB', '3100', true, now() - interval '38 days'),
      ('Chloe Martin', 5, 'A pleasure to recommend', 'The site is easy to navigate, paying was quick and diamonds came through in just a few minutes. Loved it.', 'France', 'FR', '1000', true, now() - interval '41 days')`

    // ── الكوبونات ───────────────────────────────────────────────────────
    await sql`DELETE FROM coupons`
    await sql`INSERT INTO coupons (code, discount_pct, active, max_uses) VALUES
      ('WELCOME10', 10, true, 1000),
      ('FLASH15', 15, true, 500)`

    // ── المدير ──────────────────────────────────────────────────────────
    await sql`DELETE FROM admins`
    const hash = await hashPassword('admin123')
    await sql`INSERT INTO admins (username, password_hash) VALUES ('admin', ${hash})`

    // ── الإعدادات ───────────────────────────────────────────────────────
    await sql`DELETE FROM settings`
    const settingsData = {
      siteName: 'FF Diamond',
      walletTrc20: 'TXk8rQSAENoUmYY6fNXhZQ3xW6y1kY5abc',
      walletBep20: '0x8fD3a9b0C21e4A5c6F7d8E9a0B1c2D3e4F5a6B7c',
      binancePayId: '123456789',
      walletBtc: 'bc1qxyzabc123def456ghi789jkl012mno345pqr678',
      walletEth: '0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B',
      walletBnb: '0x9f8e7d6c5b4a3928171605040302010098a7b6c5',
      walletUsdc: '0x4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3F',
      walletSol: '4t5k6Z6Vn1QaP8kZz2jHw3fQ7xR9yU9sA8bC1dE2fG',
      paymentWise: 'payments@diamondboost.gg',
      paymentPayoneer: 'payoneer@diamondboost.gg',
      paymentSkrill: 'skrill@diamondboost.gg',
      paymentNeteller: 'neteller@diamondboost.gg',
      paymentRedotpay: 'redotpay@diamondboost.gg',
      paymentBybit: 'bybit@diamondboost.gg',
      paymentRevolut: 'revolut@diamondboost.gg',
      whatsapp: '+8801700000000',
      telegram: 'diamondboost',
      discord: 'https://discord.gg/diamondboost',
      maintenance: false,
      announcement: 'Flash Sale is LIVE! Up to 15% OFF on premium diamond packages.',
      supportEmail: 'support@diamondboost.gg',
      phone: '+1 339 746 3729',
      address: '3215 Tenmile, Norfolk, VA 23513, United States',
      hours: 'Sun – Fri: 9:00 AM – 10:00 PM',
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
    }
    await sql`INSERT INTO settings (id, data) VALUES (1, ${sql.json(settingsData)})`
  } finally {
    await sql.end()
  }
}
