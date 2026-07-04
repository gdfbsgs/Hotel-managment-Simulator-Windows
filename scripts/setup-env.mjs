import fs from "fs";

if (!fs.existsSync(".env.local")) {
  fs.copyFileSync(".env.example", ".env.local");
  console.log("Created .env.local from .env.example");
  console.log("Edit .env.local and add your GEMINI_API_KEY for AI hotel generation.");
} else {
  console.log(".env.local already exists.");
}
