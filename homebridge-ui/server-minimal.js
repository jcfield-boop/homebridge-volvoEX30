// Minimal server.js test to isolate loading issues
console.log('🧪 MINIMAL: Starting minimal server.js execution...');

const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
console.log('🧪 MINIMAL: Successfully loaded @homebridge/plugin-ui-utils');

class MinimalVolvoServer extends HomebridgePluginUiServer {
    constructor() {
        console.log('🧪 MINIMAL: Initializing MinimalVolvoServer...');
        super();

        // Simple test endpoint
        this.onRequest('/test-minimal', async (request, response) => {
            console.log('🧪 MINIMAL: Test endpoint called!');
            return { status: 'Minimal server working', timestamp: new Date().toISOString() };
        });

        this.ready();
        console.log('🧪 MINIMAL: MinimalVolvoServer initialized and ready!');
    }
}

// Simple instantiation
console.log('🧪 MINIMAL: Creating server instance...');
new MinimalVolvoServer();
console.log('🧪 MINIMAL: Server instance created!');