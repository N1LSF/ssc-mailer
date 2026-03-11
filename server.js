const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }
});

app.use(cors());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ssc-mailer' });
});

app.post('/api/send', upload.array('files', 10), async (req, res) => {
  try {
    const { team_name, university, email, team_size, idea, ref_info } = req.body;
    const files = req.files || [];

    function esc(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c5cfc;border-bottom:2px solid #7c5cfc;padding-bottom:12px">
          New Application - Student Startup Challenge
        </h2>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr style="background:#f8f8fc">
            <td style="padding:10px 14px;font-weight:600;width:160px;border:1px solid #e0e0e0">Team</td>
            <td style="padding:10px 14px;border:1px solid #e0e0e0">${esc(team_name)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;border:1px solid #e0e0e0">University</td>
            <td style="padding:10px 14px;border:1px solid #e0e0e0">${esc(university)}</td>
          </tr>
          <tr style="background:#f8f8fc">
            <td style="padding:10px 14px;font-weight:600;border:1px solid #e0e0e0">Email</td>
            <td style="padding:10px 14px;border:1px solid #e0e0e0"><a href="mailto:${esc(email)}">${esc(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;border:1px solid #e0e0e0">Team Size</td>
            <td style="padding:10px 14px;border:1px solid #e0e0e0">${esc(team_size)}</td>
          </tr>
          <tr style="background:#f8f8fc">
            <td style="padding:10px 14px;font-weight:600;border:1px solid #e0e0e0">Reference</td>
            <td style="padding:10px 14px;border:1px solid #e0e0e0">${esc(ref_info)}</td>
          </tr>
        </table>
        <h3 style="color:#333">Idea Description</h3>
        <div style="background:#f8f8fc;padding:16px;border-radius:8px;border-left:4px solid #7c5cfc;white-space:pre-wrap;line-height:1.6">
          ${esc(idea)}
        </div>
        <p style="margin-top:20px;color:#888;font-size:13px">
          Files: ${files.length}${files.length ? ' - ' + files.map(f => f.originalname).join(', ') : ''}
        </p>
      </div>`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: '"SSC Applications" <' + process.env.SMTP_USER + '>',
      to: process.env.MAIL_TO,
      replyTo: email,
      subject: 'New Application: ' + (team_name || 'No name'),
      html: html,
      attachments: files.map(f => ({
        filename: f.originalname,
        content: f.buffer,
        contentType: f.mimetype
      }))
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));