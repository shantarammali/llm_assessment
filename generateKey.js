const bcrypt = require('bcrypt');

async function generateHash() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    console.log('Generated hash:', hash);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash(); 