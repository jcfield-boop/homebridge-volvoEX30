#!/usr/bin/env node

// Use the existing working oauth-setup.js but with new credentials
const { setupOAuth } = require('./oauth-setup.js');

console.log('🚗 Testing with existing OAuth setup using new credentials');
console.log('');
console.log('This will use the proven working oauth-setup.js method');
console.log('with your new extended application credentials.');
console.log('');
console.log('When prompted, enter:');
console.log('Client ID: dc-towqtsl3ngkotpzdc6qlqhnxl');
console.log('Client Secret: 989jHbeioeEPJrusrlPtWn');
console.log('Region: eu');
console.log('');

// Run the working setup
setupOAuth().catch(console.error);