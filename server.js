require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

const publicDir = path.join(__dirname, "public");
const indexFile = path.join(publicDir, "index.html");
const uploadDir = path.join(__dirname, "uploads");

// Ensure required directories exist.
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

// Configure uploads.
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

// Dashboard homepage.
app.get("/", (_req, res) => {
  if (!fs.existsSync(indexFile)) {
    return res.status(500).send(
      "Dashboard HTML is missing. Please add public/index.html to your project."
    );
  }

  res.sendFile(indexFile);
});

// Server status.
app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    mode: "demo",
    owner: "MR SURAJ",
    message:
      "Server is running. Start/Stop controls the local demo timer only."
  });
});

// Validate a Facebook access token.
app.post("/api/facebook/me", async (req, res) => {
  const token =
    typeof req.body?.token === "string"
      ? req.body.token.trim()
      : "";

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: "Paste an authorized access token first."
    });
  }

  if (token.length > 5000) {
    return res.status(400).json({
      ok: false,
      error: "Token format is too long."
    });
  }

  try {
    const url = new URL("https://graph.facebook.com/v23.0/me");

    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({
        ok: false,
        error:
          data?.error?.message ||
          "Facebook could not validate this token."
      });
    }

    return res.json({
      ok: true,
      account: {
        id: data.id,
        name: data.name || "Authorized account"
      },
      message:
        "Token validated. No posting or other Facebook action was performed."
    });
  } catch (_err) {
    return res.status(502).json({
      ok: false,
      error:
        "Could not reach Facebook. Check the server's internet connection."
    });
  }
});

// Receive and discard demo uploads.
app.post("/api/import", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

        return res.status(status).json({
          ok: false,
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "File exceeds the 5 MB limit."
              : "Upload failed. Check the file and try again."
        });
      }

      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Choose a file first."
      });
    }

    const originalName = path.basename(
      req.file.originalname || "imported-file"
    );

    const size = req.file.size;

    fs.unlink(req.file.path, () => {});

    return res.json({
      ok: true,
      fileName: originalName,
      size,
      message:
        "File received for demo; it was not executed and has been discarded."
    });
  });
});

// Return the dashboard for other browser routes.
app.get("*", (_req, res) => {
  if (!fs.existsSync(indexFile)) {
    return res.status(404).send(
      "Dashboard HTML not found. Add public/index.html to your repository."
    );
  }

  res.sendFile(indexFile);
});

// Start the server.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MR SURAJ Dashboard running on port ${PORT}`);
});