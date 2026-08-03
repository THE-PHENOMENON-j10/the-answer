// 1. Load environment variables FIRST (Only need to do this once)
require('dotenv').config();

// 2. Import all your required libraries
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth'); // <-- NEW: Word Document reader
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');      // <-- NEW: Allows server to read internal files
const path = require('path');  // <-- NEW: Helps find the exact file location

const app = express();

// 3. CORS Configuration - UPDATED FOR LIVE DEPLOYMENT
app.use(cors({
    origin: '*', // Allows requests from your GitHub Pages live site
    methods: ['POST', 'GET']
}));
app.use(express.json());

// 4. Set up file storage in memory (1-15 files supported)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Safely supports up to 15 combined heavy files
});

// 5. Initialize Gemini cleanly
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-quiz', upload.array('files'), async (req, res) => {
    console.log(`>>> Received a request from seeker: ${req.body.username}`);

    try {
        // --- NEW: We extract 'mode' alongside the other variables ---
        const { username, numQuestions, type, mode } = req.body;

        let combinedText = "";
        const imageParts = []; 

        // ==========================================
        // THE FORK IN THE ROAD: GST212 vs CUSTOM
        // ==========================================
        if (mode === 'GST212') {
            console.log(`>>> VIP Route Activated: Accessing GST212 Vault for ${username}`);
            try {
                // Read the hardcoded gst212.txt file from the backend folder
                const filePath = path.join(__dirname, 'gst212.txt');
                combinedText = fs.readFileSync(filePath, 'utf8');
                
                // Extra safety check in case the file is accidentally emptied
                if (combinedText.length < 50) {
                    return res.status(500).json({ error: "The GST212 vault appears to be empty on the server." });
                }
            } catch (err) {
                console.error("Error reading GST212 file:", err);
                return res.status(500).json({ error: "The GST212 vault is currently sealed. Contact the administrator." });
            }
            
        } else {
            // --- ORIGINAL CUSTOM QUEST LOGIC ---
            console.log(`>>> Standard Route: Processing uploaded scrolls for ${username}`);
            
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No scrolls provided." });
            }
            if (req.files.length > 15) {
                return res.status(400).json({ error: "THE ANSWER refuses to process more than 15 scrolls at once." });
            }

            // Extract text from uploaded files (Smart Sorter)
            for (const file of req.files) {
                const mimeType = file.mimetype; 

                if (mimeType === 'application/pdf') {
                    try {
                        const parsePDF = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
                        const data = await parsePDF(file.buffer);
                        const extractedText = data.text ? data.text.trim() : "";

                        if (extractedText.length >= 50) {
                            combinedText += extractedText + "\n";
                        } else {
                            imageParts.push({
                                inlineData: {
                                    data: file.buffer.toString("base64"),
                                    mimeType: 'application/pdf'
                                }
                            });
                        }
                    } catch (err) {
                        imageParts.push({
                            inlineData: {
                                data: file.buffer.toString("base64"),
                                mimeType: 'application/pdf'
                            }
                        });
                    }
                } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try {
                        const data = await mammoth.extractRawText({ buffer: file.buffer });
                        combinedText += data.value + "\n";
                    } catch (err) {}
                } else if (mimeType.startsWith('image/')) {
                    imageParts.push({
                        inlineData: {
                            data: file.buffer.toString("base64"),
                            mimeType: mimeType
                        }
                    });
                } else {
                    combinedText += file.buffer.toString('utf-8') + "\n";
                }
            }

            // --- THE ULTIMATE PURIFICATION (Only needed for messy custom uploads) ---
            combinedText = combinedText
                .replace(/"/g, "'")
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
                .replace(/\s+/g, ' ')
                .trim();

            // Guardrail check for empty custom uploads
            if (combinedText.length < 50 && imageParts.length === 0) {
                return res.status(400).json({ error: "The scrolls were empty or unreadable. Please try a different document." });
            }
        }
        
        // --- REALITY CHECK LOG ---
        console.log("\n--- EXTRACTED KNOWLEDGE PREVIEW ---");
        console.log(`[Mode: ${mode || 'Custom'}]`);
        console.log(combinedText.substring(0, 300) + "..."); 
        console.log(`[And ${imageParts.length} files/images sent to Vision Engine]`);
        console.log("-------------------------------------\n");

        // 4. DYNAMIC JSON Schema Enforcement based on Quiz Type

        // 4. DYNAMIC JSON Schema Enforcement based on Quiz Type
        const itemProperties = {
            id: { type: "number" },
            question: { type: "string" },
            answer: { type: "string" }
        };

        const requiredFields = ["id", "question", "answer"];

        // Only enforce options if the user specifically asked for an MCQ quiz
        if (type === 'MCQ') {
            itemProperties.options = { 
                type: "array", 
                items: { type: "string" },
                description: "Exactly 4 multiple choice options."
            };
            requiredFields.push("options");
        }

        const quizSchema = {
            type: "object",
            properties: {
                quiz: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: itemProperties,
                        required: requiredFields
                    }
                },
                phenomenon_welcome: { type: "string" }
            },
            required: ["quiz", "phenomenon_welcome"]
        };

        // 5. Initialize Model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.5-flash", 
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                temperature: 0.1 // Dropped further to force ultimate structural compliance
            }
        });

        // 6. Refined Instructions with Strict Syntax Rules
        const formatInstruction = type === 'MCQ' 
            ? `For each item in the quiz array, provide exactly 4 unique 'options' strings, and the 'answer' must match one of those options perfectly.`
            : `Do not include an 'options' field at all in the quiz objects. Provide only 'id', 'question', and 'answer'.`;

        const prompt = `
        System: You are "THE ANSWER", mystical source of infinite knowledge. 
        User: ${username} has provided scrolls of knowledge.
        
        Task: Generate exactly ${numQuestions} ${type} questions based STRICTLY AND ONLY on the Text Data provided below. 
        
        CRITICAL RULES:
        1. ZERO OUTSIDE KNOWLEDGE: Every single question and answer MUST be directly extracted from the provided text. If the text is empty or you cannot find enough facts, do not make things up.
        2. ${formatInstruction}
        3. Do not use unescaped internal double quotes inside the text properties. Use single quotes (') instead. Do not generate literal line breaks.
        
        Include a short, mystic welcome for ${username} from THE ANSWER in the 'phenomenon_welcome' field.
        `;

        console.log(">>> Communing with the Source (Gemini)...");
        // NEW: We pass the prompt, the text, AND the array of images all at once!
        const payload = [
            prompt, 
            `Text Data:\n${combinedText.substring(0, 100000)}`, 
            ...imageParts
        ];

        const result = await model.generateContent(payload);
        let responseText = result.response.text(); 
        
        // --- THE PURIFICATION STEP ---
        // Strip backticks/markdown formatting if the model left them over
        responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

        try {
            const parsedData = JSON.parse(responseText);
            console.log(">>> The Answer has spoken.");
            res.json(parsedData);
        } catch (parseError) {
            console.error("--- JSON PARSE FAILED ---");
            console.error("The model generated invalid JSON. Here is the raw output that caused the crash:");
            console.error(responseText); 
            
            return res.status(500).json({ error: "THE ANSWER's response was too chaotic to be read. Please try again." });
        }

    } catch (error) {
        console.error("--- MYSTICAL ERROR DETECTED ---");
        console.error("Message:", error.message);
        res.status(500).json({ error: "The connection to THE ANSWER was interrupted." });
    }
});

// UPDATED FOR LIVE DEPLOYMENT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("\n==========================================");
    console.log(`   THE ANSWER IS LISTENING ON PORT ${PORT}   `);
    console.log("==========================================\n");
});