import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, existingRawMaterials } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'कृपया बिल की फ़ोटो प्रदान करें' }, { status: 400 });
    }

    // gemini-1.5-flash मॉडल फास्ट और विज़न के लिए बेस्ट है
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const rawListSimplified = Array.isArray(existingRawMaterials) 
      ? existingRawMaterials.map((r: any) => ({ id: r.id, name: r.name, unit: r.unit })) 
      : [];

    const prompt = `
      You are an expert OCR & invoice parsing assistant for a restaurant/cafe inventory system.
      Read this receipt/invoice photo carefully (it can be printed or handwritten in Hindi/English).
      Extract the store/vendor name, invoice date, and all line items with quantity and price/rate.

      Current Raw Materials in our database for matching:
      ${JSON.stringify(rawListSimplified)}

      Instructions:
      1. If an extracted item matches closely with any item in the database list, set "rawId" to that matched ID. If it is new, set "rawId" to "".
      2. If date is not found or unclear, use today's date in YYYY-MM-DD format.
      3. Quantity and rate must be valid numbers (no currency symbols).
      4. Return ONLY a single raw JSON object without markdown fences, without backticks, without comments.

      Exact JSON format required:
      {
        "vendorName": "Vendor Name here or blank",
        "date": "YYYY-MM-DD",
        "items": [
          {
            "rawId": "matched_id_or_empty",
            "name": "Item name in English",
            "qty": 1,
            "unit": "Kg/Ltr/Pcs/Gram/Box",
            "rate": 0,
            "amount": 0
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

    const rawText = result.response.text().trim();
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Bill Scan Error:', error);
    return NextResponse.json(
      { error: error?.message || 'बिल स्कैन करने में समस्या आई' },
      { status: 500 }
    );
  }
}
