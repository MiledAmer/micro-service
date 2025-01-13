import express from 'express';
const chromium = require('chrome-aws-lambda');
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';

require('dotenv').config();

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
  });
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
      const { html } = req.body;

      if (!html) {
          return res.status(400).json({ error: 'HTML content is required.' });
      }

      // Launch Puppeteer with a custom Chromium binary
      const browser = await chromium.puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate the PDF
      const pdfBuffer = await page.pdf({ format: 'A4' });

      await browser.close();

      // Set the response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');

      // Send the PDF buffer
      res.send(pdfBuffer);
  } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error1: 'Failed to generate PDF.', error });
  }
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
