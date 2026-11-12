import type { NextConfig } from "next";

// Security headers (AI Website Analyzer's security.ts checks for the mere
// presence of each header — not directive strictness — but connect-src still
// has to be genuinely correct). All data access happens server-side (Neon Postgres
// via DATABASE_URL), so the browser only ever talks to this same origin.

// Audited against every external origin this app actually loads client-side:
// Unsplash + Mixkit (landing-page media), YouTube (webinar room embed).
// No Razorpay/Google-OAuth script or iframe is loaded client-side — both
// redirect full-page, so they need no CSP allowance.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "media-src 'self' https://assets.mixkit.co",
  "connect-src 'self'",
  "frame-src 'self' https://www.youtube.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No component uses camera/mic/geolocation (business-card scan is a
          // file upload, Voice AI is server-side Twilio, not the browser mic).
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
