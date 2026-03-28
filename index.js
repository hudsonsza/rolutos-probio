'use strict';

const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const config = require('./config');

const port = Number(process.env.PORT || 3000);
const debugEnabled = ['1', 'true', 'yes', 'on'].includes(String(process.env.DEBUG || '').toLowerCase());
const labelDimensions = config.labelDimensionsMm || {};
const renderOptions = {
  primaryFont: 'Courier-Bold',
  secondaryFont: 'Courier-Bold',
  primaryFontSize: 8,
  secondaryFontSize: 8,
  primaryLineGap: 10,
  secondaryLineGap: 10,
  rotateContentLeft: false,
  activeBorder: false,
  borderColor: '#111111',
  borderWidth: 0,
  ...config.renderOptions
};

const labelPageSize = [
  mmToPt(labelDimensions.width || 0),
  mmToPt(labelDimensions.height || 0)
];

function unixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function formatLogValue(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(String(value));
}

function log(level, message, meta = {}) {
  if (level === 'debug' && !debugEnabled) {
    return;
  }

  const parts = [
    String(unixTimestamp()),
    `level=${level}`,
    `msg=${formatLogValue(message)}`
  ];

  for (const [key, value] of Object.entries(meta)) {
    parts.push(`${key}=${formatLogValue(value)}`);
  }

  process.stderr.write(`${parts.join(' ')}\n`);
}

function mmToPt(mm) {
  return (mm / config.MM_PER_INCH) * config.POINTS_PER_INCH;
}

function getClient(url) {
  return url.startsWith('https:') ? https : http;
}

function decodeSisprobio(buffer) {
  return buffer.toString('latin1');
}

async function fetchUrlBuffer(url, redirectCount = 0) {
  log('debug', 'fetch.start', { url, redirectCount });

  return new Promise((resolve, reject) => {
    const req = getClient(url).get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();

        log('debug', 'fetch.redirect', {
          url,
          redirectUrl,
          statusCode: res.statusCode
        });

        res.resume();
        fetchUrlBuffer(redirectUrl, redirectCount + 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);

        log('debug', 'fetch.success', {
          url,
          bytes: buffer.length
        });

        resolve(buffer);
      });

      res.on('error', reject);
      res.on('aborted', () => reject(new Error(`Connection aborted for ${url}`)));
    });

    req.on('error', reject);
  });
}

function parseSisprobio(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const pages = [];
  let alternateFont = false;
  let currentPage = [];

  const pushPage = () => {
    if (currentPage.some((line) => line.text.trim() !== '')) {
      pages.push(currentPage);
    }

    currentPage = [];
    alternateFont = false;
  };

  for (const rawLine of lines) {
    const marker = rawLine.trim();

    if (marker === '@3') {
      pushPage();
      continue;
    }

    if (marker === '@1') {
      alternateFont = !alternateFont;
      continue;
    }

    currentPage.push({
      text: rawLine,
      alternateFont
    });
  }

  pushPage();
  log('debug', 'parse.complete', { pages: pages.length, lines: lines.length });

  return pages;
}

function renderPage(doc, pageLines, options) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const rotateContentLeft = Boolean(options.rotateContentLeft);
  const contentX = mmToPt(labelDimensions.innerLeftMargin || 0);
  const topMargin = mmToPt((labelDimensions.topMargin || 0) + (labelDimensions.paddingTop || 0));
  const rightMargin = mmToPt(labelDimensions.innerRightMargin || 0);
  const bottomMargin = mmToPt(labelDimensions.bottomMargin || 0);
  const layoutWidth = rotateContentLeft ? pageHeight : pageWidth;
  const layoutHeight = rotateContentLeft ? pageWidth : pageHeight;
  const contentWidth = layoutWidth - contentX - rightMargin;
  const contentHeight = layoutHeight - topMargin - bottomMargin;
  const pageScale = calculatePageScale(pageLines, options, contentHeight);
  let y = topMargin;

  if (options.activeBorder && options.borderWidth >= 0) {
    doc.save();
    doc.lineWidth(options.borderWidth);
    doc.strokeColor(options.borderColor);
    doc.rect(0, 0, pageWidth, pageHeight).stroke();
    doc.restore();
  }

  if (rotateContentLeft) {
    doc.save();
    doc.translate(0, pageHeight);
    doc.rotate(-90);
  }

  for (const line of pageLines) {
    const fontName = line.alternateFont ? options.secondaryFont : options.primaryFont;
    const fontSize = (line.alternateFont ? options.secondaryFontSize : options.primaryFontSize) * pageScale;
    const lineGap = (line.alternateFont ? options.secondaryLineGap : options.primaryLineGap) * pageScale;

    doc.font(fontName);
    doc.fontSize(fontSize);
    doc.fillColor('#111111');

    const lineWidth = doc.widthOfString(line.text);
    const horizontalScale = lineWidth > contentWidth ? contentWidth / lineWidth : 1;

    doc.save();
    doc.translate(contentX, y);
    if (horizontalScale < 1) {
      doc.scale(horizontalScale, 1);
    }
    doc.text(line.text, 0, 0, {
      lineBreak: false
    });
    doc.restore();

    y += lineGap;

    if (y > layoutHeight - bottomMargin) {
      break;
    }
  }

  if (rotateContentLeft) {
    doc.restore();
  }
}

function calculatePageScale(pageLines, options, contentHeight) {
  let totalHeight = 0;

  for (const line of pageLines) {
    totalHeight += line.alternateFont ? options.secondaryLineGap : options.primaryLineGap;
  }

  return totalHeight > 0 ? Math.min(1, contentHeight / totalHeight) : 1;
}

function streamPdf(pages, res, fileName) {
  if (!pages.length) {
    throw new Error('The .sisprobio file does not contain any labels to generate.');
  }

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: labelPageSize,
    margin: 0,
    info: {
      Title: fileName,
      Author: 'Probio',
      Subject: 'SISProbio Labels'
    }
  });

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Cache-Control': 'no-store'
  });

  doc.on('error', (err) => {
    log('error', 'pdf.stream_error', {
      fileName,
      error: err.message || String(err)
    });
    res.destroy(err);
  });

  doc.pipe(res);

  for (const pageLines of pages) {
    doc.addPage({
      size: labelPageSize,
      margin: 0
    });
    renderPage(doc, pageLines, renderOptions);
  }

  log('debug', 'pdf.ready', { fileName, pages: pages.length });
  doc.end();
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function handlePdfRequest(req, res, sourceUrl, fileName) {
  if (!sourceUrl) {
    log('error', 'request.config_missing', {
      path: req.url,
      fileName
    });
    sendText(res, 500, 'Missing URL in config.js.\n');
    return;
  }

  try {
    const buffer = await fetchUrlBuffer(sourceUrl);
    const text = decodeSisprobio(buffer);
    const pages = parseSisprobio(text);

    log('info', 'request.render', {
      method: req.method,
      path: req.url,
      fileName,
      pages: pages.length
    });

    streamPdf(pages, res, fileName);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const statusCode = message.includes('HTTP 404') ? 404 : 500;

    log('error', 'request.failed', {
      method: req.method,
      path: req.url,
      fileName,
      statusCode,
      error: message
    });

    if (!res.headersSent) {
      sendText(res, statusCode, `${message}\n`);
    } else {
      res.destroy(err);
    }
  }
}

function requestHandler(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = requestUrl.pathname;

  log('debug', 'request.start', {
    method: req.method,
    path: route
  });

  if (req.method !== 'GET') {
    log('info', 'request.method_not_allowed', {
      method: req.method,
      path: route
    });
    sendText(res, 405, 'Method Not Allowed\n');
    return;
  }

  if (route === '/enteral.pdf') {
    handlePdfRequest(req, res, String(config.enteral_url ?? ''), 'enteral.pdf');
    return;
  }

  if (route === '/parenteral.pdf') {
    handlePdfRequest(req, res, String(config.parenteral_url ?? ''), 'parenteral.pdf');
    return;
  }

  if (route === '/' || route === '') {
    log('info', 'request.healthcheck', { path: route || '/' });
    sendText(res, 200, 'ok\n');
    return;
  }

  log('info', 'request.not_found', { path: route });
  sendText(res, 404, 'Not Found\n');
}

const server = http.createServer(requestHandler);

server.on('error', (err) => {
  log('error', 'server.error', {
    port,
    error: err.message || String(err)
  });
});

server.listen(port, () => {
  log('info', 'server.listen', {
    port,
    labelWidthMm: labelDimensions.width || 0,
    labelHeightMm: labelDimensions.height || 0,
    debug: debugEnabled
  });
});
