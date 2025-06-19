const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const upload = multer();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve form.html, medform.html, etc.

// Google Sheets API Auth Setup
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'lofty-hall-427902-k4-230333cab27f.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Sheet IDs
const signupSheetId = '1edTcNkgZLANY48PbYv_cAeatflc6OXpfZpaCzGDGwLA';
const medSheetId = '15AZqj6Fs2MO8VaTcmxRsjJi5Tgs8OpR0qPoiFKSo4Gc';

// ROUTES

// Load Signup form
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));

// Load Medicine form
app.get('/medform', (req, res) => res.sendFile(path.join(__dirname, 'medform.html')));

// Load Login page
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Handle Signup form submission
app.post('/submit', upload.none(), async (req, res) => {
    const { name, email, password, imgUrl } = req.body;

    if (!name || !email || !password || !imgUrl) {
        return res.status(400).send('❌ সব তথ্য পূরণ করুন।');
    }

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: signupSheetId,
            range: 'Sheet1!A:E',
            valueInputOption: 'RAW',
            resource: {
                values: [[name, email, password, imgUrl, '0']], // Initial coin = 0
            },
        });

        res.send('✅ রেজিস্ট্রেশন সফল হয়েছে!');
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).send('❌ রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
    }
});

// Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('❌ ইমেইল ও পাসওয়ার্ড দিন।');
    }

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: signupSheetId,
            range: 'Sheet1!A:E',
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.send('❌ কোনো ইউজার পাওয়া যায়নি।');
        }

        const user = rows.find(row => row[1] === email && row[2] === password);

        if (user) {
            res.send(`
                <script>
                    localStorage.setItem("userEmail", "${user[1]}");
                    alert("✅ লগইন সফল! স্বাগতম, ${user[0]}। Coins: ${user[4] || 0}");
                    window.location.href = "/game.html";
                </script>
            `);
        } else {
            res.send('❌ ভুল ইমেইল বা পাসওয়ার্ড।');
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).send('❌ সার্ভার ত্রুটি। পরে চেষ্টা করুন।');
    }
});

// Update Coins (from game)
app.post('/update-coins', async (req, res) => {
    const { email, coins } = req.body;

    if (!email) return res.status(400).send("❌ Email is required");

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const getRes = await sheets.spreadsheets.values.get({
            spreadsheetId: signupSheetId,
            range: 'Sheet1!A:E',
        });

        const rows = getRes.data.values;
        const rowIndex = rows.findIndex(row => row[1] === email);

        if (rowIndex === -1) {
            return res.status(404).send("❌ User not found");
        }

        const updateRange = `Sheet1!E${rowIndex + 1}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: signupSheetId,
            range: updateRange,
            valueInputOption: 'RAW',
            resource: {
                values: [[coins.toString()]],
            },
        });

        res.send("✅ Coins updated");
    } catch (err) {
        console.error("Coin update error:", err);
        res.status(500).send("❌ Server error");
    }
});

// Handle Medicine Form
app.post('/submit-med', upload.none(), async (req, res) => {
    const { name, address, medicine, date, phone, imgUrl } = req.body;

    if (!name || !address || !medicine || !date || !imgUrl || !phone) {
        return res.status(400).send("❌ সব তথ্য পূরণ করুন।");
    }

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: medSheetId,
            range: 'Sheet1!A:F',
            valueInputOption: 'RAW',
            resource: {
                values: [[name, address, medicine, date, phone, imgUrl]],
            },
        });

        res.send("✅ ফর্ম সফলভাবে জমা হয়েছে!");
    } catch (error) {
        console.error('Submit Error:', error);
        res.status(500).send("❌ ডেটা জমা ব্যর্থ হয়েছে।");
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 সার্ভার চলছে: http://localhost:${port}`);
});
