const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const path = require("path");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "public")));

/* ================= GOOGLE AUTH ================= */
/*
⚠️ IMPORTANT (Render)
Service account json file path MUST exist in Render Secrets
Key name: GOOGLE_CREDENTIALS
*/
const auth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/lofty-hall-427902-k4-8f40616ef13b.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
/* ================= SHEET IDS ================= */
const SIGNUP_SHEET_ID = "1edTcNkgZLANY48PbYv_cAeatflc6OXpfZpaCzGDGwLA";
const MED_SHEET_ID = "15AZqj6Fs2MO8VaTcmxRsjJi5Tgs8OpR0qPoiFKSo4Gc";

/* ================= PAGES ================= */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "index.html"))
);

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "login.html"))
);

app.get("/game.html", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "game.html"))
);

app.get("/medform", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "medform.html"))
);

/* ================= SIGNUP ================= */
app.post("/submit", upload.none(), async (req, res) => {
  const { name, email, password, imgUrl } = req.body;

  if (!name || !email || !password || !imgUrl) {
    return res.status(400).send("❌ সব তথ্য পূরণ করুন");
  }

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SIGNUP_SHEET_ID,
      range: "Sheet1!A:E",
      valueInputOption: "RAW",
      resource: {
        values: [[name.trim(), email.trim(), password.trim(), imgUrl, "0"]],
      },
    });

    res.send("✅ Signup successful");
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).send("❌ Signup failed");
  }
});

/* ================= LOGIN (FIXED) ================= */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("❌ Email ও Password দিন");
  }

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SIGNUP_SHEET_ID,
      range: "Sheet1!A:E",
    });

    const rows = data.data.values || [];

    console.log("ROWS FOUND:", rows.length);

    // ⚠️ HEADER বাদ দেওয়া খুব জরুরি
    const users = rows.slice(1);

    const user = users.find(
      (r) =>
        r[1]?.trim() === email.trim() &&
        r[2]?.trim() === password.trim()
    );

    if (!user) {
      return res.send("❌ Email বা Password ভুল");
    }

    res.send(`
      <script>
        localStorage.setItem("userEmail","${user[1]}");
        localStorage.setItem("coins","${user[4] || 0}");
        alert("✅ Login Success");
        window.location.href="/game.html";
      </script>
    `);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).send("❌ Server error");
  }
});

/* ================= COIN UPDATE ================= */
app.post("/update-coins", async (req, res) => {
  const { email, coins } = req.body;

  if (!email) return res.status(400).send("❌ Email required");

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SIGNUP_SHEET_ID,
      range: "Sheet1!A:E",
    });

    const rows = data.data.values || [];
    const users = rows.slice(1);

    const index = users.findIndex(
      (r) => r[1]?.trim() === email.trim()
    );

    if (index === -1) return res.status(404).send("❌ User not found");

    await sheets.spreadsheets.values.update({
      spreadsheetId: SIGNUP_SHEET_ID,
      range: `Sheet1!E${index + 2}`,
      valueInputOption: "RAW",
      resource: { values: [[String(coins)]] },
    });

    res.send("✅ Coins updated");
  } catch (err) {
    console.error("COIN ERROR:", err);
    res.status(500).send("❌ Coin update failed");
  }
});

/* ================= MED FORM ================= */
app.post("/submit-med", upload.none(), async (req, res) => {
  const { name, address, medicine, date, phone, imgUrl } = req.body;

  if (!name || !address || !medicine || !date || !phone || !imgUrl) {
    return res.status(400).send("❌ সব তথ্য দিন");
  }

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: MED_SHEET_ID,
      range: "Sheet1!A:F",
      valueInputOption: "RAW",
      resource: {
        values: [[name, address, medicine, date, phone, imgUrl]],
      },
    });

    res.send("✅ Med form submitted");
  } catch (err) {
    console.error("MED ERROR:", err);
    res.status(500).send("❌ Med submit failed");
  }
});

/* ================= START ================= */
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
