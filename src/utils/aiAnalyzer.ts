import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIAnalysisResult {
  isRelevant: boolean;
  rejectionReason: string | null;
  suggestedTitle: string | null;
  extractedCourseCode: string | null;
  extractedLecturerName: string | null;
  suggestedCategory:
    | "Past Question"
    | "Textbook"
    | "Handout"
    | "Project Report"
    | null;
  keywords: string[];
  summary: string;
  confidence: number;
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const analyzeStudyMaterial = async (
  buffer: Buffer,
  mimeType: string,
): Promise<AIAnalysisResult> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json", // Maintain this to prevent JSON parsing crashes
    },
  });

  const prompt = `You are an academic data extraction assistant for a university. 
  Analyze the attached document and extract metadata to help a student fill out an upload form.
  1. Determine if it is a relevant educational resource.
  2. Suggest a clear title based on the content.
  3. Look for any mentioned Course Codes (e.g., MTH 101, CHM101) and Lecturer names (e.g., Dr. Smith).
  4. Categorize it into one of: "Past Question", "Textbook", "Handout", or "Project Report".
  5. Extract 5-8 search keywords.
  6. Provide a 1-sentence summary.
  
  Respond ONLY using this exact JSON schema: 
  { 
    "isRelevant": boolean, 
    "rejectionReason": string | null, 
    "suggestedTitle": string | null,
    "extractedCourseCode": string | null,
    "extractedLecturerName": string | null,
    "suggestedCategory": string | null,
    "keywords": ["word1", "word2"], 
    "summary": "string", 
    "confidence": number 
  }`;

  const fileData = {
    inlineData: { data: buffer.toString("base64"), mimeType },
  };

  try {
    const result = await model.generateContent([prompt, fileData]);
    const responseText = result.response.text();
    // Strip markdown formatting if Gemini wrapped it in ```json ... ```
    const jsonString = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(jsonString) as AIAnalysisResult;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("Failed to analyze document format.");
  }
};
