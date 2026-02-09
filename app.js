const express = require("express");
const path = require("path");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===================== GOOGLE AUTH ===================== */
const auth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/lofty-hall-427902-k4-8f40616ef13b.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

console.log(
  "🔐 Using Google key file:",
  "/etc/secrets/lofty-hall-427902-k4-8f40616ef13b.json"
);

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "YOUR_SHEET_ID_HERE"; // 🔴 CHANGE THIS
const SHEET_NAME = "Sheet1";

/* ===================== SIGNUP ===================== */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, imgUrl } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing fields" });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          name.trim(),
          email.trim(),
          password.trim(),
          imgUrl || "",
          "0" // Coins default
        ]]
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false });
  }
});

/* ===================== LOGIN ===================== */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
    });

    const rows = result.data.values || [];
    const users = rows.slice(1); // skip header

    const user = users.find(
      r => r[1]?.trim() === email && r[2]?.trim() === password
    );

    if (!user) {
      return res.json({ success: false });
    }

    res.json({
      success: true,
      email: user[1],
      coins: user[4] || "0",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false });
  }
});

/* ===================== UPDATE COINS ===================== */
app.post("/update-coins", async (req, res) => {
  try {
    const { email, coins } = req.body;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
    });

    const rows = result.data.values || [];
    const users = rows.slice(1);

    const index = users.findIndex(r => r[1] === email);
    if (index === -1) {
      return res.json({ success: false });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!E${index + 2}`, // Coins column
      valueInputOption: "RAW",
      requestBody: {
        values: [[coins]],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Coin update error:", err);
    res.status(500).json({ success: false });
  }
});

/* ===================== MED FORM (OPTIONAL) ===================== */
app.post("/medform", async (req, res) => {
  try {
    const { name, medicine, location, date } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "MedForm!A:D",
      valueInputOption: "RAW",
      requestBody: {
        values: [[name, medicine, location, date]],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("MedForm error:", err);
    res.status(500).json({ success: false });
  }
});

/* ===================== SERVER ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
