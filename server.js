require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const uploadDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    mode: "demo",
    owner: "MR SURAJ",
    message: "Server is running. Start/Stop controls the local demo timer only."
  });
});

// Checks the supplied token against Facebook's /me endpoint.
// The token is used only for this request and is never written to logs or disk.
app.post("/api/facebook/me", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";

  if (!token) {
    return res.status(400).json({ ok: false, error: "Paste an authorized access token first." });
  }
  if (token.length > 5000) {
    return res.status(400).json({ ok: false, error: "Token format is too long." });
  }

  try {
    const url = new URL("https://graph.facebook.com/v23.0/me");
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const response = await fetch(url, { method: "GET" });
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({
        ok: false,
        error: data?.error?.message || "Facebook could not validate this token."
      });
    }

    return res.json({
      ok: true,
      account: { id: data.id, name: data.name || "Authorized account" },
      message: "Token validated. No posting or other Facebook action was performed."
    });
  } catch (_err) {
    return res.status(502).json({
      ok: false,
      error: "Could not reach Facebook. Check the server's internet connection."
    });
  }
});

// Uploads a file for the local demo only. Files are not executed.
app.post("/api/import", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "Choose a file first." });
  }

  const originalName = path.basename(req.file.originalname || "imported-file");
  const storedPath = req.file.path;

  // Remove the uploaded file after acknowledging it; this demo does not process it.
  fs.unlink(storedPath, () => {});
  return res.json({
    ok: true,
    fileName: originalName,
    size: req.file.size,
    message: "File received for demo; it was not executed and has been discarded."
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`MR SURAJ Dashboard running at http://localhost:${PORT}`);
});
