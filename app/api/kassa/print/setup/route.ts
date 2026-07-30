import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mode: "local-agent",
    description:
      "Har bir kassir kompyuterida print-agent/start.bat ishga tushiriladi. Brauzer mahalliy agentga ulanadi.",
    agentUrl: process.env.NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL?.trim() || "http://127.0.0.1:17888",
    agentPort: parseInt(process.env.RECEIPT_PRINT_AGENT_PORT || "17888", 10),
    setupFolder: "print-agent",
    startFile: "print-agent/start.bat",
    configFile: "print-agent/config.txt",
    steps: [
      "print-agent papkasini printer ulangan kompyuterga nusxalang",
      "Node.js o'rnating (nodejs.org)",
      "start.bat ni ishga tushiring — oyna ochiq qolsin",
      "Brauzerdan saytga kirib Chop etish bosing",
    ],
  });
}
