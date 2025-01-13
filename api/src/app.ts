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
  let browser = null;
  try {
      const { html } = req.body;

      if (!html || typeof html !== 'string') {
          return res.status(400).json({ 
              error: 'Valid HTML content is required as a string.' 
          });
      }

      // Launch Puppeteer with a custom Chromium binary
      browser = await chromium.puppeteer.launch({
          args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
      });

      const page = await browser.newPage();
      
      // Set a reasonable timeout
      await page.setDefaultNavigationTimeout(30000);
      
      // Configure viewport for consistent rendering
      await page.setViewport({
          width: 1200,
          height: 800,
          deviceScaleFactor: 1,
      });

      await page.setContent(html, { 
          waitUntil: ['networkidle0', 'domcontentloaded']
      });

      // Generate PDF with more specific options
      const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
          }
      });

      // Set security headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      res.setHeader('X-Content-Type-Options', 'nosniff');

      res.send(pdfBuffer);

  } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ 
          error: 'Failed to generate PDF',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
  } finally {
      // Ensure browser is always closed, even if there's an error
      if (browser) {
          try {
              await browser.close();
          } catch (closeError) {
              console.error('Error closing browser:', closeError);
          }
      }
  }
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
