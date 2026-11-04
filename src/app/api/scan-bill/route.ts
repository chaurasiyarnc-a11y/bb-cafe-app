import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vercel Environment Variables में GEMINI_API_KEY नहीं मिली!' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageBase64, existingRawMaterials } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'बिल की फोटो नहीं मिली।' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const rawListSimplified = Array.isArray(existingRawMaterials)
      ? existingRawMaterials.map((r: any) => ({ id: r.id, name: r.name, unit: r.unit }))
      : [];

    const prompt = `
      You are an expert OCR invoice scanner assistant for a cafe inventory.
      Analyze this purchase receipt/invoice photo (can be printed or handwritten in Hindi or English).
      Extract:
      1. Vendor/Shop name (दुकानदार का नाम)
      2. Invoice Date (in YYYY-MM-DD format, fallback to current date if missing)
      3. Items purchased with exact quantity, unit, unit rate and total amount.

      Existing cafe raw materials in database for matching:
      ${JSON.stringify(rawListSimplified)}

      Rules:
      - Match scanned item names to existing raw materials if similar (e.g. "Doodh" -> "Milk", "Pyaz" -> "Onion"). If matched, set "rawId" to that id, otherwise set "rawId" to "".
      - Return ONLY a pure JSON object. NO markdown, NO \`\`\`json fences, NO explanation.

      Required JSON Schema:
      {
        "vendorName": "Vendor Name",
        "date": "YYYY-MM-DD",
        "items": [
          {
            "rawId": "matched_id_or_empty",
            "name": "Item Name",
            "qty": 1,
            "unit": "Kg",
            "rate": 10,
            "amount": 10
          }
        ]
      }
    `;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Scan Bill Error:', error);
    return NextResponse.json(
      { error: error?.message || 'बिल पढ़ने में समस्या आई।' },
      { status: 500 }
    );
  }
}
