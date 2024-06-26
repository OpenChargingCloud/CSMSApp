#!/bin/bash

#tsc -p tsconfig.json
sass src/css/csms.scss src/css/csms.css
webpack -c webpack.config.cjs

npm start --silent -- --inspect "$@"
