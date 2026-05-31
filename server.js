const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || "foci2026";
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const emptyData = {
  players: [],
  reviews: [],
  comments: [],
  opinions: [],
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) return emptyData;
  try {
    return { ...emptyData, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch {
    return emptyData;
  }
}

function writeData(data) {
  const clean = {
    players: Array.isArray(data.players) ? data.players : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    opinions: Array.isArray(data.opinions) ? data.opinions : [],
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(clean, null, 2), "utf8");
}

function send(response, status, body, type = "application/json; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new Error("Túl nagy kérés."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.url === "/api/state" && request.method === "GET") {
    send(response, 200, JSON.stringify(readData()));
    return;
  }

  if (request.url === "/api/state" && request.method === "POST") {
    if (request.headers["x-app-password"] !== APP_PASSWORD) {
      send(response, 403, JSON.stringify({ error: "Hibás jelszó." }));
      return;
    }

    try {
      const body = await readRequestBody(request);
      writeData(JSON.parse(body || "{}"));
      send(response, 200, JSON.stringify({ ok: true }));
    } catch {
      send(response, 400, JSON.stringify({ error: "Hibás adat." }));
    }
    return;
  }

  const requestPath = decodeURIComponent(request.url.split("?")[0]);
  const safePath = requestPath === "/" ? "/scoutline.html" : requestPath;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Tiltott útvonal.", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, 404, "Nem található.", "text/plain; charset=utf-8");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(response, 200, content, MIME_TYPES[ext] || "application/octet-stream");
  });
});

server.listen(PORT, () => {
  console.log(`ScoutLine fut: http://localhost:${PORT}`);
});
