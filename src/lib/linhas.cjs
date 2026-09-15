function linhasValidas(linhas) {
  return (linhas ?? []).filter((linha) => linha && typeof linha === 'object' && Object.keys(linha).length > 0 && !linha.error);
}

module.exports = { linhasValidas }; // @node-only
