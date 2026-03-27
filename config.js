const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

function mmToPoints(mm) {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

function pixelsToPoints(pixels, pixelsPerInch) {
  return (pixels / pixelsPerInch) * POINTS_PER_INCH;
}

const legacyFormConfig = {
  caption: 'SISPROBIO - Configuracao Rotulo',
  pixelsPerInch: 96,
  textHeightPx: 13,
  font: {
    name: 'Tahoma',
    height: -11
  }
};

const labelDimensionsMm = {
  width: 80,
  height: 100,
  paddingTop: 0,
  innerLeftMargin: 2,
  topMargin: 0,
  innerRightMargin: 0,
  bottomMargin: 0
};

const config = {
  POINTS_PER_INCH,
  MM_PER_INCH,
  mmToPoints,
  pixelsToPoints,
  PDF_PAGE_SIZE: [
    mmToPoints(labelDimensionsMm.width),
    mmToPoints(labelDimensionsMm.height)
  ],
  legacyFormConfig,
  labelDimensionsMm,
  renderOptions: {
    sourceFontName: legacyFormConfig.font.name,
    primaryFont: 'Helvetica',
    secondaryFont: 'Helvetica',
    primaryFontSize: pixelsToPoints(
      Math.abs(legacyFormConfig.font.height),
      legacyFormConfig.pixelsPerInch
    ),
    secondaryFontSize: pixelsToPoints(
      Math.abs(legacyFormConfig.font.height),
      legacyFormConfig.pixelsPerInch
    ),
    primaryLineGap: pixelsToPoints(
      legacyFormConfig.textHeightPx,
      legacyFormConfig.pixelsPerInch
    ),
    secondaryLineGap: pixelsToPoints(
      legacyFormConfig.textHeightPx,
      legacyFormConfig.pixelsPerInch
    ),
    rotateContentLeft: true,
    activeBorder: false,
    borderColor: '#111111',
    borderWidth: 0
  },
  enteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/enteral/relatorios/r_enteral.sisprobio',
  parenteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/parenteral/relatorios/r_parenteral.sisprobio'
};

module.exports = config;
