const path = require('path');

import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import clear from 'rollup-plugin-delete';

import pkg from '../package.json';

const moduleDir = path.dirname(pkg.module);

// console.log(path.resolve(__dirname, '../tsconfig.build.json'));

export default {
  input: 'lib/index.ts',
  output: [
    {
      dir: moduleDir,
      format: "cjs",
      preserveModules: true
    }
  ],
  plugins: [
    clear({ targets: 'dist/*' }),
    json(),
    commonjs(),
    typescript({ tsconfig: path.resolve(__dirname, '../tsconfig.build.json') }),
  ],
  external: ['os', 'fs', 'readline', 'path', 'koa', 'koa-router', 'koa-body', 'urllib', 'winston', 'winston-daily-rotate-file', 'safe-stable-stringify']
};
