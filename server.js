const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const SUPABASE_URL = "https://paezlzjonablaseodpze.supabase.co";

// DEINEN ANON KEY HIER EINSETZEN
const SUPABASE_KEY = "DEIN_ANON_KEY_HIER";

const BUCKET = "files";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
    res.send("Supabase Upload Server läuft.");
});

app.post("/upload", upload.single("file"), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Keine Datei hochgeladen"
        });
    }

    const fileName = Date.now() + "_" + req.file.originalname;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true
        });

    if (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }

    const publicUrl =
        `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;

    res.json({
        success: true,
        url: publicUrl
    });

});

app.get("/files", async (req, res) => {

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list();

    if (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }

    const files = data.map(file => ({
        name: file.name,
        url:
        `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file.name}`
    }));

    res.json(files);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server läuft auf Port " + PORT);
});
app.get("/view/:filename", async (req, res) => {

    const filename = req.params.filename;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(filename);

    if (error) {
        return res.status(404).send("Datei nicht gefunden");
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader("Content-Type", "text/html");
    res.send(buffer);

});