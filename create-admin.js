const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser() {
  const email = 'admin@jomla.test';
  const password = 'Admin123456';

  try {
    // Create user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: 'Admin User'
    });

    console.log('✅ Successfully created admin user:', userRecord.uid);
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    // Set custom claims to make user admin
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin'
    });

    console.log('✅ Admin custom claims set successfully');
    console.log('\nYou can now login to the admin dashboard with:');
    console.log('Email:', email);
    console.log('Password:', password);

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists, setting admin claims...');
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true,
        role: 'admin'
      });
      console.log('✅ Admin custom claims set successfully');
      console.log('\nYou can login with:');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.error('❌ Error creating admin user:', error);
    }
  }

  process.exit(0);
}

createAdminUser();
