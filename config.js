const config = {
  POINTS_PER_INCH: 72,
  MM_PER_INCH: 25.4,
  PDF_PAGE_SIZE: 'A4',
  labelDimensionsMm: {
    width: 125,
    height: 100,
    paddingTop: 0,
    innerLeftMargin: 2,
    topMargin: 2,
    innerRightMargin: 40,
    bottomMargin: 2
  },
  renderOptions: {
    primaryFont: 'Courier-Bold',
    secondaryFont: 'Courier-Bold',
    primaryFontSize: 8,
    secondaryFontSize: 8,
    primaryLineGap: 10,
    secondaryLineGap: 10,
    rotateContentLeft: false,
    activeBorder: false,
    borderColor: '#111111',
    borderWidth: 0
  },
  enteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/enteral/relatorios/r_enteral.sisprobio',
  parenteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/parenteral/relatorios/r_parenteral.sisprobio'
};

module.exports = config;
