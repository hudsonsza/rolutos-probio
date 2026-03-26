const config = {
  POINTS_PER_INCH: 72,
  MM_PER_INCH: 25.4,
  PDF_PAGE_SIZE: 'A4',
  labelDimensionsMm: {
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
    borderWidth: 0.8
  },
  enteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/enteral/relatorios/r_enteral.sisprobio',
  parenteral_url: 'http://www.probio.com.br/sisprobio/sistema/admin/parenteral/relatorios/r_parenteral.sisprobio'
};

module.exports = config;
