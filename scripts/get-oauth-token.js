/**
 * OAuth Token Helper Script
 * 
 * This script helps obtain a refresh token for Google Drive OAuth2 authentication.
 * Run this locally to get a refresh token for your Google Cloud OAuth credentials.
 * 
 * Usage:
 * 1. Create OAuth2 credentials in Google Cloud Console
 * 2. Set environment variables: GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET
 * 3. Run: node scripts/get-oauth-token.js
 * 4. Follow the browser prompt to authorize
 * 5. Copy the refresh token to your .env.local file
 */

const http = require('http');
const { URL } = require('url');

// Configuration
const CLIENT_ID = process.env.GDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET;
const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: Missing environment variables');
    console.error('Please set GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET');
    process.exit(1);
}

// Generate authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== Google Drive OAuth Token Helper ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n2. Sign in and authorize the application');
console.log('3. You will be redirected back here\n');

// Start local server to receive callback
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);

    if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');

        if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Error: No authorization code received</h1>');
            return;
        }

        // Exchange code for tokens
        try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                }),
            });

            const tokens = await tokenResponse.json();

            if (tokens.error) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<h1>Error: ${tokens.error_description || tokens.error}</h1>`);
                console.error('Token exchange error:', tokens);
                return;
            }

            // Success!
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
        <html>
          <head><title>Success</title></head>
          <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Success!</h1>
            <p>Your refresh token has been generated. Check your terminal for the token.</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);

            console.log('\n=== SUCCESS ===\n');
            console.log('Refresh Token (add this to your .env.local):');
            console.log('----------------------------------------');
            console.log(`GDRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('----------------------------------------\n');

            if (tokens.access_token) {
                console.log('Access Token (for testing, expires soon):');
                console.log(tokens.access_token.substring(0, 50) + '...\n');
            }

            // Close server after a short delay
            setTimeout(() => {
                server.close();
                process.exit(0);
            }, 1000);

        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error: ${error.message}</h1>`);
            console.error('Error exchanging code:', error);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

server.listen(REDIRECT_PORT, () => {
    console.log(`Waiting for OAuth callback on http://localhost:${REDIRECT_PORT}...\n`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error.message);
    process.exit(1);
});
