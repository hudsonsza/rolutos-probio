'use strict';

const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const config = require('./config');

const port = Number(process.env.PORT || 3000);
const {
  PDF_PAGE_SIZE,
  labelDimensionsMm,
  renderOptions,
  mmToPoints
} = config;

function getPageLayout(page, options) {
  const pageWidth = page.width;
  const pageHeight = page.height;
  const paddingTop = mmToPoints(labelDimensionsMm.paddingTop);
  const leftMargin = mmToPoints(labelDimensionsMm.innerLeftMargin);
  const topMargin = mmToPoints(labelDimensionsMm.topMargin);
  const rightMargin = mmToPoints(labelDimensionsMm.innerRightMargin);
  const bottomMargin = mmToPoints(labelDimensionsMm.bottomMargin);
  const contentCenterX = pageWidth / 2;
  const contentCenterY = pageHeight / 2;
  const isRotatedLeft = options.rotateContentLeft;
  const logicalAreaWidth = isRotatedLeft ? pageHeight : pageWidth;
  const logicalAreaHeight = isRotatedLeft ? pageWidth : pageHeight;
  const logicalAreaX = contentCenterX - (logicalAreaWidth / 2);
  const logicalAreaY = contentCenterY - (logicalAreaHeight / 2);

  return {
    contentCenterX,
    contentCenterY,
    contentHeight: logicalAreaHeight - paddingTop - topMargin - bottomMargin,
    contentWidth: logicalAreaWidth - leftMargin - rightMargin,
    isRotatedLeft,
    logicalAreaHeight,
    logicalAreaWidth,
    logicalAreaX,
    logicalAreaY,
    contentX: logicalAreaX + leftMargin,
    contentY: logicalAreaY + paddingTop + topMargin
  };
}

function getClient(url) {
  return url.startsWith('https:') ? https : http;
}

function decodeSisprobio(buffer) {
  return buffer.toString('latin1');
}

async function fetchUrlBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = getClient(url).get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        fetchUrlBuffer(redirectUrl).then(resolve, reject);
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
        resolve(Buffer.concat(chunks));
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

  return pages;
}

function renderPage(doc, pageLines, options) {
  const {
    contentCenterX,
    contentCenterY,
    contentHeight,
    contentWidth,
    contentX,
    contentY,
    isRotatedLeft,
    logicalAreaHeight,
    logicalAreaWidth,
    logicalAreaX,
    logicalAreaY
  } = getPageLayout(doc.page, options);
  const pageScale = calculatePageScale(pageLines, options, contentHeight);
  const contentBottomY = contentY + contentHeight;
  let y = contentY;

  if (isRotatedLeft) {
    doc.save();
    doc.rotate(-90, { origin: [contentCenterX, contentCenterY] });
  }

  if (options.activeBorder) {
    doc.save();
    doc.lineWidth(options.borderWidth);
    doc.strokeColor(options.borderColor);
    doc.rect(logicalAreaX, logicalAreaY, logicalAreaWidth, logicalAreaHeight);
    doc.stroke();
    doc.restore();
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

    if (y > contentBottomY) {
      break;
    }
  }

  if (isRotatedLeft) {
    doc.restore();
  }
}

function calculatePageScale(pageLines, options, contentHeight) {
  let totalHeight = 0;

  for (const line of pageLines) {
    const lineGap = line.alternateFont ? options.secondaryLineGap : options.primaryLineGap;
    totalHeight += lineGap;
  }

  const heightScale = totalHeight > 0 ? Math.min(1, contentHeight / totalHeight) : 1;

  return heightScale;
}

function streamPdf(pages, res, fileName) {
  if (!pages.length) {
    throw new Error('The .sisprobio file does not contain any labels to generate.');
  }

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: PDF_PAGE_SIZE,
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
    console.error(err.message || err);
    res.destroy(err);
  });

  doc.pipe(res);

  for (const pageLines of pages) {
    doc.addPage({
      size: PDF_PAGE_SIZE,
      margin: 0
    });
    renderPage(doc, pageLines, renderOptions);
  }

  doc.end();
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function handlePdfRequest(res, sourceUrl, fileName) {
  if (!sourceUrl) {
    sendText(res, 500, 'Missing URL in config.js.\n');
    return;
  }

  try {
    const buffer = await fetchUrlBuffer(sourceUrl);
    const text = decodeSisprobio(buffer);
    const pages = parseSisprobio(text);
    streamPdf(pages, res, fileName);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const statusCode = message.includes('HTTP 404') ? 404 : 500;

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

  if (req.method !== 'GET') {
    sendText(res, 405, 'Method Not Allowed\n');
    return;
  }

  if (route === '/enteral.pdf') {
    handlePdfRequest(res, String(config.enteral_url ?? ''), 'enteral.pdf');
    return;
  }

  if (route === '/parenteral.pdf') {
    handlePdfRequest(res, String(config.parenteral_url ?? ''), 'parenteral.pdf');
    return;
  }

  if (route === '/' || route === '') {
    sendText(res, 200, `ok\n`);
    return;
  }

  sendText(res, 404, 'Not Found\n');
}

const server = http.createServer(requestHandler);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
