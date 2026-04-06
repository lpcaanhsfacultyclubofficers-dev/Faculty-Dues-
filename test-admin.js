import admin from 'firebase-admin';

async function test() {
  try {
    admin.initializeApp();
    const token = await admin.auth().createCustomToken('test-uid');
    console.log('SUCCESS_TOKEN:', token);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test();
