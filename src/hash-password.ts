const bcrypt = require('bcrypt');

async function createSeedUser() {
  const password = 'adams';
  const saltRounds = 10;
  
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  console.log('--- Hashed Password for Seeder ---');
  console.log(hashedPassword);
  console.log('\nUse this hash to insert the user into your database.');
  
  // Example SQL insert statement
  console.log(`\nINSERT INTO users (email, password) VALUES ('admin@example.com', '${hashedPassword}');`);
}

createSeedUser();