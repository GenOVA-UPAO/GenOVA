// Minimal reverse proxy: localhost -> deployed Vercel frontend.
// No deps (uses Node core https/http) so it works from any checkout.
const http = require("http");
const https = require("https");

const TARGET_HOST = process.env.PROXY_TARGET_HOST || "gen-ova-frontend.vercel.app";
const PORT = Number(process.env.PORT || 4200);

const server = http.createServer((req, res) => {
  const headers = { ...req.headers, host: TARGET_HOST };
  delete headers["accept-encoding"]; // avoid brotli/gzip we can't decode transparently

  const proxyReq = https.request(
    {
      hostname: TARGET_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Proxying http://localhost:${PORT} -> https://${TARGET_HOST}`);
});
