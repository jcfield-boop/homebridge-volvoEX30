# Homebridge Volvo EX30

A Homebridge plugin that integrates your Volvo EX30 with Apple HomeKit using the official Volvo APIs.

## Features

- **Battery Monitoring**: View battery level, charging status, and low battery alerts in HomeKit
- **Real-time Updates**: Automatically polls your vehicle for status updates
- **Rate Limiting**: Respects Volvo API rate limits (100 requests/minute)
- **Secure Authentication**: Uses OAuth2 with Volvo ID for secure API access

## Requirements

- Homebridge v1.6.0 or higher
- Node.js 18.0.0 or higher
- Volvo EX30 with connected services
- Volvo Developer Portal account

## Installation

1. Install the plugin through Homebridge Config UI X or manually:
```bash
npm install -g homebridge-volvo-ex30
```

2. Add the plugin to your Homebridge configuration (see Configuration section below)

## Setup

### 1. Volvo Developer Portal Setup

1. Go to [Volvo Developer Portal](https://developer.volvocars.com)
2. Create an account and sign in
3. Create a new application:
   - **Name**: Choose any name (e.g., "Homebridge EX30")
   - **Description**: "Homebridge integration for EX30"
   - **Redirect URIs**: Add `http://localhost:3000/callback`
4. Note down your:
   - **Client ID**
   - **Client Secret** 
   - **VCC API Key** (Primary or Secondary)

### 2. OAuth Authentication

**For Raspberry Pi Users (Most Common Setup):**

1. **SSH into your Raspberry Pi**:
   ```bash
   ssh pi@your-raspberry-pi-ip
   ```

2. **Navigate to the plugin directory**:
   ```bash
   cd /usr/local/lib/node_modules/homebridge-volvo-ex30
   ```

3. **Run the OAuth setup**:
   ```bash
   npm run oauth-setup
   ```

4. **Follow the interactive prompts**:
   - Enter your **Client ID** from Volvo Developer Portal
   - Enter your **Client Secret** from Volvo Developer Portal  
   - Enter your **region** (`eu` for Europe/Middle East/Africa, `na` for North America/Latin America)

5. **Complete browser authorization**:
   - The setup will display an authorization URL
   - **Copy this URL** and open it in your browser (on your computer/phone)
   - **Sign in** with your Volvo ID account
   - **Authorize** the application
   - You'll be redirected to `http://localhost:3000/callback?code=ABC123&state=xyz`
   - **Copy the `code` parameter** from the URL (e.g., `ABC123`)

6. **Enter the authorization code**:
   - Return to your SSH session
   - **Paste the authorization code** when prompted
   - The setup will exchange it for a refresh token

7. **Save the refresh token**:
   - The setup will display your refresh token
   - **Copy this token** - you'll need it for your Homebridge configuration

**For Other Installations:**

```bash
# Navigate to your plugin installation directory
cd /path/to/homebridge-volvo-ex30
npm run oauth-setup
```

⚠️ **Important**: Keep your refresh token secure and do not share it. It provides access to your vehicle data.

### 3. Configuration

Add the plugin to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "VolvoEX30",
      "name": "My EX30",
      "vin": "YV1A2345678901234",
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret",
      "vccApiKey": "your-vcc-api-key",
      "refreshToken": "your-refresh-token",
      "region": "eu",
      "pollingInterval": 5,
      "enableBattery": true,
      "enableClimate": false,
      "enableLocks": false,
      "enableDoors": false
    }
  ]
}
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `name` | Yes | - | Display name for your vehicle |
| `vin` | Yes | - | 17-character VIN of your EX30 |
| `clientId` | Yes | - | Client ID from Volvo Developer Portal |
| `clientSecret` | Yes | - | Client Secret from Volvo Developer Portal |
| `vccApiKey` | Yes | - | VCC API Key from Volvo Developer Portal |
| `refreshToken` | No | - | OAuth refresh token (obtained via oauth-setup) |
| `region` | No | `eu` | Your vehicle's region (`eu` or `na`) |
| `pollingInterval` | No | `5` | Update interval in minutes (1-60) |
| `enableBattery` | No | `true` | Show battery service |
| `enableClimate` | No | `true` | Show climate service (requires Connected Vehicle API) |
| `enableLocks` | No | `true` | Show lock service (requires Connected Vehicle API) |
| `enableDoors` | No | `true` | Show door sensors (requires Extended Vehicle API) |

## HomeKit Services

### Battery Service
- **Battery Level**: Current state of charge (0-100%)
- **Charging State**: Whether the vehicle is currently charging
- **Low Battery**: Alert when battery level is ≤20%

## API Usage and Rate Limits

This plugin respects Volvo's API rate limits:
- **100 requests per minute** per user per application
- **10 requests per minute** for invocation methods (future lock/unlock, climate control)

The plugin includes:
- Intelligent caching to minimize API calls
- Rate limiting protection  
- Automatic token refresh
- Error handling and retry logic

## Troubleshooting

### OAuth Setup Issues

**Error: "Missing refreshToken in configuration"**
- This is expected on first setup
- Follow the step-by-step OAuth setup instructions above
- Make sure to add the refresh token to your Homebridge config after getting it

**Error: "No tokens available. Please complete OAuth flow first."**
- You're missing the `refreshToken` field in your configuration
- Run `npm run oauth-setup` in the plugin directory
- Copy the refresh token to your Homebridge config

**OAuth setup command not found:**
```bash
# Make sure you're in the right directory
cd /usr/local/lib/node_modules/homebridge-volvo-ex30
# Or find your global npm modules
npm list -g --depth=0 | grep homebridge-volvo-ex30
```

**Browser authorization not working:**
- Make sure you copy the **entire URL** from the terminal
- Open it in any browser (computer, phone, tablet)
- The redirect URL will show an error page - that's normal
- Just copy the `code=` parameter from the URL bar

### Authentication Issues

1. **Invalid credentials**: Verify your Client ID, Client Secret, and VCC API Key
2. **Expired refresh token**: Run the OAuth setup again to get a new refresh token
3. **Region mismatch**: Ensure your region setting matches your vehicle's region

### API Errors

1. **Rate limit exceeded**: Increase polling interval or reduce API calls
2. **Vehicle not supported**: Ensure your EX30 has connected services enabled
3. **Network issues**: Check your internet connection and Homebridge logs

### Debug Logging

Enable debug logging in Homebridge to see detailed API calls:

```json
{
  "platforms": [
    {
      "platform": "VolvoEX30",
      "name": "My EX30",
      "_bridge": {
        "debugMode": true
      }
    }
  ]
}
```

## Development

### Building from Source

```bash
git clone https://github.com/yourusername/homebridge-volvo-ex30
cd homebridge-volvo-ex30
npm install
npm run build
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run oauth-setup` - Run OAuth setup helper

## Supported Regions

- **Europe/Middle East/Africa**: `eu`
- **North America/Latin America**: `na`

## Privacy and Security

- All API communication uses HTTPS
- OAuth2 tokens are stored securely in Homebridge
- No vehicle data is transmitted to third parties
- API keys and tokens are only used for Volvo API communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This plugin is not affiliated with, endorsed by, or sponsored by Volvo Car Corporation. Volvo and EX30 are trademarks of Volvo Car Corporation.

Use at your own risk. The authors are not responsible for any damage or issues that may arise from using this plugin.