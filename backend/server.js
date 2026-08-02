// 1. Load environment variables FIRST (Only need to do this once)
require('dotenv').config();

// 2. Import all your required libraries
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
        const { username, numQuestions, type } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No scrolls provided." });
        }
        if (req.files.length > 15) {
            return res.status(400).json({ error: "THE ANSWER refuses to process more than 15 scrolls at once." });
        }

        let combinedText = "";

        // 3. Extract text from uploaded files
        for (const file of req.files) {
            if (file.mimetype === 'application/pdf') {
                try {
                    const data = await pdfParse(file.buffer);
                    combinedText += data.text + "\n";
                } catch (pdfErr) {
                    console.error("Error reading PDF:", pdfErr);
                }
            } else {
                combinedText += file.buffer.toString('utf-8') + "\n";
            }
        }

        // --- THE ULTIMATE PURIFICATION ---
        // 1. Convert all double quotes to single quotes to protect JSON boundaries.
        // 2. Erase hidden control characters (\u0000-\u001F) that cause JSON breaks.
        // 3. Flatten out messy whitespace left over from PDF parsing.
        combinedText = combinedText
            .replace(/"/g, "'")
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
            .replace(/\s+/g, ' ')
            .trim();

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
            model: "gemini-1.5-flash", 
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
        System: You are "THE ANSWER", an ancient, mystical source of infinite knowledge. 
        User: ${username} has provided scrolls of knowledge.
        Task: Generate exactly ${numQuestions} ${type} questions based strictly on the text provided below. 
        
        Formatting Constraint: ${formatInstruction}
        CRITICAL JSON RULE: Do not use unescaped internal double quotes inside the text properties. If you need to include quotes or use titles, use single quotes (') instead. Do not generate literal line breaks inside the string fields.
        
        Include a short, mystic welcome for ${username} from THE ANSWER in the 'phenomenon_welcome' field.
        `;

        console.log(">>> Communing with the Source (Gemini)...");

        const result = await model.generateContent([prompt, `Text Data:\n${combinedText.substring(0, 100000)}`]);
        
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