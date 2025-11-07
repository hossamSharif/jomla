const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedData() {
  console.log('🌱 Starting to seed Firebase database...\n');

  try {
    // Get admin user ID
    const adminUser = await admin.auth().getUserByEmail('admin@jomla.test');
    const adminId = adminUser.uid;
    console.log('✓ Found admin user:', adminId);

    // Sample Products
    const products = [
      {
        name: 'Fresh Milk 1L',
        description: 'Organic whole milk, locally sourced',
        basePrice: 349, // $3.49
        imageUrl: 'https://via.placeholder.com/400x400.png?text=Milk',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=Milk',
        minQuantity: 1,
        maxQuantity: 10,
        inStock: true,
        category: 'Dairy',
        tags: ['organic', 'dairy', 'milk'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      },
      {
        name: 'Whole Wheat Bread',
        description: 'Freshly baked whole wheat bread',
        basePrice: 299, // $2.99
        imageUrl: 'https://via.placeholder.com/400x400.png?text=Bread',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=Bread',
        minQuantity: 1,
        maxQuantity: 5,
        inStock: true,
        category: 'Bakery',
        tags: ['bread', 'whole-wheat', 'bakery'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      },
      {
        name: 'Free Range Eggs (12 pack)',
        description: 'Farm fresh free range eggs',
        basePrice: 599, // $5.99
        imageUrl: 'https://via.placeholder.com/400x400.png?text=Eggs',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=Eggs',
        minQuantity: 1,
        maxQuantity: 3,
        inStock: true,
        category: 'Dairy',
        tags: ['eggs', 'free-range', 'organic'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      },
      {
        name: 'Organic Bananas (bunch)',
        description: 'Fresh organic bananas, approximately 5-6 bananas',
        basePrice: 199, // $1.99
        imageUrl: 'https://via.placeholder.com/400x400.png?text=Bananas',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=Bananas',
        minQuantity: 1,
        maxQuantity: 10,
        inStock: true,
        category: 'Produce',
        tags: ['organic', 'fruit', 'bananas'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      },
      {
        name: 'Greek Yogurt 500g',
        description: 'Creamy Greek yogurt, plain',
        basePrice: 449, // $4.49
        imageUrl: 'https://via.placeholder.com/400x400.png?text=Yogurt',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=Yogurt',
        minQuantity: 1,
        maxQuantity: 5,
        inStock: true,
        category: 'Dairy',
        tags: ['yogurt', 'greek', 'dairy'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      },
      {
        name: 'Orange Juice 1L',
        description: 'Freshly squeezed orange juice, no added sugar',
        basePrice: 549, // $5.49
        imageUrl: 'https://via.placeholder.com/400x400.png?text=OJ',
        thumbnailUrl: 'https://via.placeholder.com/150x150.png?text=OJ',
        minQuantity: 1,
        maxQuantity: 5,
        inStock: true,
        category: 'Beverages',
        tags: ['juice', 'orange', 'fresh'],
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: adminId
      }
    ];

    // Add products to Firestore
    console.log('\n📦 Adding products...');
    const productRefs = [];
    for (const product of products) {
      const ref = await db.collection('products').add(product);
      productRefs.push({ id: ref.id, ...product });
      console.log(`  ✓ Added: ${product.name} (${ref.id})`);
    }

    // Create sample offers
    console.log('\n🎁 Creating offers...');

    // Breakfast Bundle
    const breakfastProducts = [
      productRefs.find(p => p.name === 'Fresh Milk 1L'),
      productRefs.find(p => p.name === 'Whole Wheat Bread'),
      productRefs.find(p => p.name === 'Free Range Eggs (12 pack)')
    ];

    const breakfastOffer = {
      name: 'Breakfast Bundle',
      description: 'Start your day right with fresh milk, bread, and eggs',
      products: breakfastProducts.map(p => ({
        productId: p.id,
        productName: p.name,
        basePrice: p.basePrice,
        discountedPrice: Math.round(p.basePrice * 0.85), // 15% off
        discountAmount: Math.round(p.basePrice * 0.15),
        discountPercentage: 15
      })),
      originalTotal: breakfastProducts.reduce((sum, p) => sum + p.basePrice, 0),
      discountedTotal: breakfastProducts.reduce((sum, p) => sum + Math.round(p.basePrice * 0.85), 0),
      totalSavings: breakfastProducts.reduce((sum, p) => sum + Math.round(p.basePrice * 0.15), 0),
      savingsPercentage: 15,
      minQuantity: 1,
      maxQuantity: 5,
      validFrom: admin.firestore.Timestamp.now(),
      validUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      publishedAt: admin.firestore.Timestamp.now(),
      createdBy: adminId
    };

    const breakfastRef = await db.collection('offers').add(breakfastOffer);
    console.log(`  ✓ Added: ${breakfastOffer.name} (${breakfastRef.id})`);

    // Healthy Start Bundle
    const healthyProducts = [
      productRefs.find(p => p.name === 'Greek Yogurt 500g'),
      productRefs.find(p => p.name === 'Organic Bananas (bunch)'),
      productRefs.find(p => p.name === 'Orange Juice 1L')
    ];

    const healthyOffer = {
      name: 'Healthy Start Bundle',
      description: 'Perfect combination for a healthy morning',
      products: healthyProducts.map(p => ({
        productId: p.id,
        productName: p.name,
        basePrice: p.basePrice,
        discountedPrice: Math.round(p.basePrice * 0.80), // 20% off
        discountAmount: Math.round(p.basePrice * 0.20),
        discountPercentage: 20
      })),
      originalTotal: healthyProducts.reduce((sum, p) => sum + p.basePrice, 0),
      discountedTotal: healthyProducts.reduce((sum, p) => sum + Math.round(p.basePrice * 0.80), 0),
      totalSavings: healthyProducts.reduce((sum, p) => sum + Math.round(p.basePrice * 0.20), 0),
      savingsPercentage: 20,
      minQuantity: 1,
      maxQuantity: 5,
      validFrom: admin.firestore.Timestamp.now(),
      validUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      publishedAt: admin.firestore.Timestamp.now(),
      createdBy: adminId
    };

    const healthyRef = await db.collection('offers').add(healthyOffer);
    console.log(`  ✓ Added: ${healthyOffer.name} (${healthyRef.id})`);

    // Draft offer example
    const draftOffer = {
      name: 'Weekend Special (Draft)',
      description: 'This is a draft offer, not yet published',
      products: [
        {
          productId: productRefs[0].id,
          productName: productRefs[0].name,
          basePrice: productRefs[0].basePrice,
          discountedPrice: Math.round(productRefs[0].basePrice * 0.75),
          discountAmount: Math.round(productRefs[0].basePrice * 0.25),
          discountPercentage: 25
        }
      ],
      originalTotal: productRefs[0].basePrice,
      discountedTotal: Math.round(productRefs[0].basePrice * 0.75),
      totalSavings: Math.round(productRefs[0].basePrice * 0.25),
      savingsPercentage: 25,
      minQuantity: 1,
      maxQuantity: 10,
      status: 'draft',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      createdBy: adminId
    };

    const draftRef = await db.collection('offers').add(draftOffer);
    console.log(`  ✓ Added: ${draftOffer.name} (${draftRef.id})`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Active Offers: 2`);
    console.log(`   - Draft Offers: 1`);
    console.log(`\n🌐 You can now view the data at: http://localhost:3000/offers`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }

  process.exit(0);
}

seedData();
