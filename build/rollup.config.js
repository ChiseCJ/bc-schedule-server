const path = require('path');

import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import clear from 'rollup-plugin-delete';

import pkg from '../package.json';

const moduleDir = path.dirname(pkg.module);

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
    typescript(),
  ],
  external: ['os', 'fs', 'readline', 'path', 'koa', 'koa-router', 'koa-body', 'urllib', 'winston', 'winston-daily-rotate-file']
};
