const path = require('path');

module.exports = {
  resolve: {
    modules: [path.resolve(__dirname, './src'), 'node_modules']
  },
  externals: [
    'react',
    'react-dom',
  ],
};
