const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const TG_TOKEN  = process.env.TG_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ── EMAIL с файлами ──
app.post('/api/send', upload.array('files', 10), async (req, res) => {
    try {
        const { team_name, university, email, team_size, idea, ref_info } = req.body;

        const attachments = (req.files || []).map(f => ({
            filename: f.originalname,
            content: f.buffer
        }));

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.MAIL_TO,
            subject: `Новая заявка SSC: ${team_name}`,
            html: `
                <h2>Новая заявка</h2>
                <p><b>Команда:</b> ${team_name}</p>
                <p><b>ВУЗ:</b> ${university}</p>
                <p><b>Email:</b> ${email}</p>
                <p><b>Размер:</b> ${team_size}</p>
                <p><b>Идея:</b><br>${(idea || '').replace(/\n/g, '<br>')}</p>
                <p><b>Ссылка:</b> ${ref_info || '—'}</p>
            `,
            attachments
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ── TELEGRAM: отправка файла (прокси) ──
app.post('/api/send-file', upload.single('file'), async (req, res) => {
    try {
        const chatId = req.body.chat_id || TG_CHAT_ID;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ ok: false, description: 'No file' });
        }

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        const tgResp = await fetch(
            `https://api.telegram.org/bot${TG_TOKEN}/sendDocument`,
            { method: 'POST', body: form, headers: form.getHeaders() }
        );

        res.json(await tgResp.json());
    } catch (err) {
        console.error('TG file error:', err);
        res.status(500).json({ ok: false, description: err.message });
    }
});

// ── TELEGRAM: отправка текста (прокси) ──
app.post('/api/send-text', async (req, res) => {
    try {
        const { chat_id, text, parse_mode } = req.body;

        const tgResp = await fetch(
            `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chat_id || TG_CHAT_ID,
                    text,
                    parse_mode: parse_mode || 'Markdown',
                    disable_web_page_preview: true
                })
            }
        );

        res.json(await tgResp.json());
    } catch (err) {
        console.error('TG text error:', err);
        res.status(500).json({ ok: false, description: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));