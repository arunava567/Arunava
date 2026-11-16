const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const upload = multer();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve public folder (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Serve views folder HTML
app.use(express.static(path.join(__dirname, "views")));

// GOOGLE SHEETS AUTH
const auth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/lofty-hall-427902-k4-8f40616ef13b.json",
  scopes: "https://www.googleapis.com/auth/spreadsheets"
});


// Sheet IDs
const signupSheetId = '1edTcNkgZLANY48PbYv_cAeatflc6OXpfZpaCzGDGwLA';
const medSheetId = '1FEq38P8yoq-Y4DUHk_yWGLKj4iiRxQow5PvmclwOjm4';

// ================= ROUTES =================

// HOME PAGE (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// LOGIN
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// MEDICAL FORM
app.get('/medform', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'medform.html'));
});

// GAME PAGE
app.get('/game.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'game.html'));
});

// ================= SIGNUP FORM =================
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
                values: [[name, email, password, imgUrl, '0']],
            },
        });

        res.send('✅ রেজিস্ট্রেশন সফল হয়েছে!');
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).send('❌ রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
    }
});

// ================= LOGIN =================
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

        const rows = response.data.values || [];

        // SAFE USER FINDER
        const user = rows.find(r => r[1] && r[2] && r[1] === email && r[2] === password);

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
        res.status(500).send('❌ সার্ভার ত্রুটি।');
    }
});
// ================= COINS UPDATE =================
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

        const rows = getRes.data.values || [];

        const rowIndex = rows.findIndex(r => r[1] === email);

        if (rowIndex === -1) {
            return res.status(404).send("❌ User not found");
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId: signupSheetId,
            range: `Sheet1!E${rowIndex + 1}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[String(coins || 0)]],
            },
        });

        res.send("✅ Coins updated");
    } catch (err) {
        console.error("Coin update error:", err);
        res.status(500).send("❌ Server error");
    }
});
// ================= MEDICINE FORM =================
app.post('/submit-med', upload.none(), async (req, res) => {
    const { name, phone, medicine, address, date, imgUrl } = req.body;

    if (!name || !phone || !medicine || !address || !date || !imgUrl) {
        return res.status(400).send("❌ সব তথ্য এবং প্রেসক্রিপশনের ছবি দিন।");
    }

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: medSheetId,
            range: 'Sheet1!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: {
                // শিটের কলাম অনুযায়ী সঠিক সিরিয়াল: Name, Phone, Medicine, Address, Date, Prescription Url
                values: [[name, phone, medicine, address, date, imgUrl]],
            },
        });

        res.send("✅ ফর্ম সফলভাবে জমা হয়েছে!");
    } catch (error) {
        console.error('Submit Error:', error);
        res.status(500).send("❌ ডেটা জমা ব্যর্থ হয়েছে।");
    }
});
// ================= GET USER DATA (IMG + COINS) =================
app.post("/get-user", async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).send("❌ Email required");

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: signupSheetId,
            range: "Sheet1!A:E",
        });

        const rows = response.data.values || [];
        const user = rows.find(r => r[1] === email);

        if (!user) return res.status(404).send("❌ User not found");

        res.json({
            name: user[0],
            email: user[1],
            imgUrl: user[3],
            coins: user[4] || 0
        });

    } catch (err) {
        console.error("User fetch error:", err);
        res.status(500).send("❌ Server error");
    }
});


// ============= START SERVER =============
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
