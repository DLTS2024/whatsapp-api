const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// API Key for security (set in Render env variables)
const API_KEY = process.env.API_KEY || 'your-secret-api-key-change-this';

// WhatsApp Client
let whatsappClient = null;
let isClientReady = false;
let qrCodeData = null;
let lastQRCode = null;

// Authentication middleware
function authenticate(req, res, next) {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
}

// Initialize WhatsApp Client
function initializeWhatsAppClient() {
    console.log('🔄 Initializing WhatsApp client...');

    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: './wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--single-process'
            ]
        }
    });

    whatsappClient.on('qr', async (qr) => {
        console.log('📱 QR Code received');
        lastQRCode = qr;
        qrCodeData = await qrcode.toDataURL(qr);
    });

    whatsappClient.on('authenticated', () => {
        console.log('🔐 WhatsApp authenticated');
        qrCodeData = null;
        lastQRCode = null;
    });

    whatsappClient.on('ready', () => {
        console.log('✅ WhatsApp Client is ready!');
        isClientReady = true;
        qrCodeData = null;
    });

    whatsappClient.on('disconnected', (reason) => {
        console.log('❌ WhatsApp disconnected:', reason);
        isClientReady = false;
        qrCodeData = null;
        // Reinitialize after disconnect
        setTimeout(() => {
            initializeWhatsAppClient();
        }, 5000);
    });

    whatsappClient.initialize();
}

// ============ API ROUTES ============

// Health check (for UptimeRobot)
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'WhatsApp API',
        connected: isClientReady,
        timestamp: new Date().toISOString()
    });
});

// Get status
app.get('/api/status', authenticate, (req, res) => {
    res.json({
        connected: isClientReady,
        hasQR: !!qrCodeData
    });
});

// Get QR Code
app.get('/api/qr', authenticate, (req, res) => {
    if (isClientReady) {
        return res.json({ connected: true, qr: null });
    }
    res.json({ connected: false, qr: qrCodeData });
});

// Send message
app.post('/api/send', authenticate, async (req, res) => {
    try {
        const { phone, message, mediaUrl, mediaType, filename } = req.body;

        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not connected' });
        }

        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message required' });
        }

        // Format phone number
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (!formattedPhone.includes('@c.us')) {
            formattedPhone = formattedPhone + '@c.us';
        }

        // Check if number is registered
        const isRegistered = await whatsappClient.isRegisteredUser(formattedPhone);
        if (!isRegistered) {
            return res.json({
                success: false,
                error: 'Number not registered on WhatsApp',
                phone: phone
            });
        }

        // Send with media if provided
        if (mediaUrl) {
            const media = await MessageMedia.fromUrl(mediaUrl);
            await whatsappClient.sendMessage(formattedPhone, media, { caption: message });
        } else {
            await whatsappClient.sendMessage(formattedPhone, message);
        }

        res.json({ success: true, phone: phone });

    } catch (error) {
        console.error('Send error:', error);
        res.json({ success: false, error: error.message, phone: req.body.phone });
    }
});

// Logout WhatsApp
app.post('/api/logout', authenticate, async (req, res) => {
    try {
        if (whatsappClient) {
            await whatsappClient.logout();
            isClientReady = false;
            qrCodeData = null;
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 WhatsApp API running on port ${PORT}`);
    initializeWhatsAppClient();
});
