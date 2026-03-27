const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

function mmToPoints(mm) {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

const labelDimensionsMm = {
  width: 80,
  height: 90,
  paddingTop: 0,
  innerLeftMargin: 2,
  topMargin: 2,
  innerRightMargin: 2,
  bottomMargin: 2
};

const config = {
  POINTS_PER_INCH,
  MM_PER_INCH,
  PDF_PAGE_SIZE: [
    mmToPoints(labelDimensionsMm.width),
    mmToPoints(labelDimensionsMm.height)
  ],
  labelDimensionsMm,
  renderOptions: {
    primaryFont: 'Courier-Bold',
    secondaryFont: 'Courier-Bold',
    primaryFontSize: 8,
    secondaryFontSize: 8,
    primaryLineGap: 10,
    secondaryLineGap: 10,
    rotateContentLeft: true,
    activeBorder: false,
    borderColor: '#111111',
    borderWidth: 0
  },
  enteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/enteral/relatorios/r_enteral.sisprobio',
  parenteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/parenteral/relatorios/r_parenteral.sisprobio'
};

module.exports = config;