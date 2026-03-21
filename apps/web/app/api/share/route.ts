import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, playerLabel, position, rating, confidence, strengths, weaknesses } = await request.json();

  if (!to || !playerLabel) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  function ratingLabel(r) {
    if (r < 2.5) return "Beginner";
    if (r < 3.5) return "Recreational";
    if (r < 4.5) return "Intermediate";
    if (r < 5.5) return "Advanced";
    return "Pro";
  }

  const label = ratingLabel(rating);
  const strengthsList = strengths.slice(0, 3).map(s => `<li>${s}</li>`).join("");
  const weaknessesList = weaknesses.slice(0, 2).map(w => `<li>${w}</li>`).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎾 PickleballVideoIQ</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">${playerLabel} — ${position}</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; font-weight: bold; color: #16a34a;">${Number(rating).toFixed(2)}</div>
          <div style="font-size: 20px; font-weight: 600; color: #16a34a;">${label}</div>
          <div style="font-size: 12px; color: #9ca3af;">Confidence: ${confidence}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #f0fdf4; padding: 16px; border-radius: 12px;">
            <h3 style="color: #166534; font-size: 14px; margin: 0 0 8px;">✅ Strengths</h3>
            <ul style="color: #15803d; font-size: 12px; margin: 0; padding-left: 16px;">${strengthsList}</ul>
          </div>
          <div style="background: #fef2f2; padding: 16px; border-radius: 12px;">
            <h3 style="color: #991b1b; font-size: 14px; margin: 0 0 8px;">⚠️ Needs Work</h3>
            <ul style="color: #dc2626; font-size: 12px; margin: 0; padding-left: 16px;">${weaknessesList}</ul>
          </div>
        </div>
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Analyzed by PickleballVideoIQ 🤖</p>
          <a href="https://pickleballvideoiq.com" style="color: #16a34a; font-size: 12px;">pickleballvideoiq.com</a>
        </div>
      </div>
    </div>
  `;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: "PickleballVideoIQ" },
      subject: `Your PickleballVideoIQ Results - ${playerLabel}`,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("SendGrid error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
