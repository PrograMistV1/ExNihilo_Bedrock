import fs from "fs";
import path from "path";

const SOURCE_DIR = "./ExNihilo_RP/texts/source";
const OUTPUT_DIR = "./ExNihilo_RP/texts";

const watchMode = !process.argv.includes("--once");

function convertToLang(jsonPath) {
    const filename = path.basename(jsonPath, ".json");
    const outputPath = path.join(OUTPUT_DIR, `${filename}.lang`);

    try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const data = JSON.parse(raw);

        const lines = Object.entries(data)
            .map(([key, value]) => `${key}=${value.replace(/\n/g, "\\n")}`)
            .join("\n");

        fs.writeFileSync(outputPath, lines, "utf-8");
        console.log(`[lang] ${filename}.json -> ${filename}.lang`);
    } catch (err) {
        console.error(`[lang] Failed to convert ${filename}.json:`, err.message);
    }
}

function convertAll() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`[lang] Source folder not found: ${SOURCE_DIR}`);
        process.exit(1);
    }

    fs.mkdirSync(OUTPUT_DIR, {recursive: true});

    const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".json"));

    if (files.length === 0) {
        console.log(`[lang] No JSON files found in ${SOURCE_DIR}`);
    } else {
        console.log(`[lang] Converting all files...`);
        for (const file of files) {
            convertToLang(path.join(SOURCE_DIR, file));
        }
    }
}

convertAll();

if (watchMode) {
    console.log(`[lang] Watching for changes in ${SOURCE_DIR} ...`);

    const cooldowns = new Set();

    fs.watch(SOURCE_DIR, {persistent: true}, (eventType, filename) => {
        if (!filename || !filename.endsWith(".json")) return;
        if (cooldowns.has(filename)) return;

        cooldowns.add(filename);
        setTimeout(() => cooldowns.delete(filename), 300);

        setTimeout(() => {
            const fullPath = path.join(SOURCE_DIR, filename);
            if (!fs.existsSync(fullPath)) {
                console.log(`[lang] File removed: ${filename}`);
                return;
            }
            convertToLang(fullPath);
        }, 100);
    });
}
