const path = require('path');

// webpack.config.js
module.exports = [
    {
      mode:    'development',
      entry:   './src/ts/csmsApp.ts',
      target:  'electron-renderer',
      //devtool: "eval-source-map",
      resolve: {
        extensions: ["", ".ts", ".js"]
      },
      module: {
        rules: [{
          test: /\.ts$/,
          //include: /src/,
          use: [{ loader: 'ts-loader' }]
        }]
      },
      externals: {
      //  'http': 'commonjs2 http'
      //  'asn1':         'asn1.js',
      //  'base32decode': 'base32-decode'
      },
      output: {
        filename: 'csmsApp-bundle.js',
        path: path.resolve(__dirname, 'src', 'build')
      }
    }
  ];
