'use strict';

const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

const labelConfig = {
  // Base principal
  pageWidthMM: 285.5,
  pageHeightMM: 197.3,
  marginTopMM: 10,
  marginLeftMM: 5,
  marginRightMM: 5,
  marginBottomMM: 5,
  startX: 10,
  startY: 5,
  lineStep: 18,
  normalFontSize: 25,
  compactFontSize: 30,
  fontName: 'Arial',
  pdfaPart: '2',
  pdfaConformance: 'B',

  // Adicionado do config de baixo
  pdfPageSize: 'A4',

  labelDimensionsMM: {
    width: 80,
    height: 125,
    paddingTop: 0,
    innerLeftMargin: 2,
    topMargin: 2,
    innerRightMargin: 25,
    bottomMargin: 2
  },

  renderOptions: {
    primaryFont: 'Courier-Bold',
    secondaryFont: 'Courier-Bold',
    primaryFontSize: 8,
    secondaryFontSize: 8,
    primaryLineGap: 10,
    secondaryLineGap: 10,
    rotateContentLeft: true,
    activeBorder: true,
    borderColor: '#111111',
    borderWidth: 0
  },

  urls: {
    enteral: 'http://www.probio.com.br/sisprobio/sistema/admin/enteral/relatorios/r_enteral.sisprobio',
    parenteral: 'http://www.probio.com.br/sisprobio/sistema/admin/parenteral/relatorios/r_parenteral.sisprobio'
  }
};

function mmToPt(valueMM) {
  return (valueMM / MM_PER_INCH) * POINTS_PER_INCH;
}

function labelLinePosition(lineIndex, config = labelConfig) {
  return config.startX + (lineIndex * config.lineStep);
}

function labelFontSize(compactMode, config = labelConfig) {
  return compactMode ? config.compactFontSize : config.normalFontSize;
}

module.exports = {
  POINTS_PER_INCH,
  MM_PER_INCH,
  labelConfig,
  mmToPt,
  labelLinePosition,
  labelFontSize
};