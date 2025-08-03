#!/usr/bin/env node

import * as readline from 'readline';
import { OAuthHandler } from './oauth-handler';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupOAuth() {
  console.log('🚗 Volvo EX30 Homebridge Plugin OAuth Setup\n');
  
  try {
    const clientId = await question('Enter your Volvo API Client ID: ');
    const clientSecret = await question('Enter your Volvo API Client Secret: ');
    const region = await question('Enter your region (eu/na) [eu]: ') || 'eu';
    
    if (!clientId || !clientSecret) {
      console.error('❌ Client ID and Client Secret are required');
      process.exit(1);
    }

    if (!['eu', 'na'].includes(region)) {
      console.error('❌ Region must be either "eu" or "na"');
      process.exit(1);
    }

    const redirectUri = 'http://localhost:3000/callback';
    
    const oauthHandler = new OAuthHandler(
      {
        baseUrl: 'https://api.volvocars.com',
        clientId,
        clientSecret,
        region: region as 'eu' | 'na',
      },
      {
        debug: console.log,
        info: console.log,
        warn: console.warn,
        error: console.error,
      } as any,
    );

    const authUrl = oauthHandler.getAuthorizationUrl(redirectUri);
    
    console.log('\n📱 Authorization Required');
    console.log('Please open this URL in your browser and authorize the application:');
    console.log(`\n${authUrl}\n`);
    console.log('After authorization, you will be redirected to a localhost URL.');
    console.log('Copy the "code" parameter from the redirected URL.');
    console.log('Example: http://localhost:3000/callback?code=ABC123&state=xyz');
    console.log('Copy "ABC123" from the code parameter.\n');
    
    const authCode = await question('Enter the authorization code from the redirect URL: ');
    
    if (!authCode) {
      console.error('❌ Authorization code is required');
      process.exit(1);
    }

    console.log('\n🔄 Exchanging code for tokens...');
    
    const tokens = await oauthHandler.exchangeCodeForTokens(authCode, redirectUri);
    
    console.log('\n✅ OAuth setup complete!');
    console.log('\nAdd this to your Homebridge config:');
    console.log('\n```json');
    console.log(JSON.stringify({
      refreshToken: tokens.refreshToken,
    }, null, 2));
    console.log('```\n');
    
    console.log('Your refresh token will be valid until you revoke access in your Volvo ID account.');
    console.log('Keep this token secure and do not share it.');
    
  } catch (error) {
    console.error('\n❌ OAuth setup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  setupOAuth().catch(console.error);
}

export { setupOAuth };