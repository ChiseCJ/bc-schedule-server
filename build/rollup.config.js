const path = require('path');

import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript2';
// import { babel } from '@rollup/plugin-babel';
// import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// import terser from '@rollup/plugin-terser';
import clear from 'rollup-plugin-delete';

import pkg from '../package.json';

const moduleDir = path.dirname(pkg.module);
const isDev = process.env.NODE_ENV === 'development';
const pluginsWithServe = isDev
  ? [
    serve({
      port: 3000,
      contentBase: ['dist', 'example']
    }),
    livereload('dist')
  ]
  : [];

export default {
  input: 'lib/index.ts',
  output: [
    // {
    //   name: 'abc',
    //   file: pkg.main,
    //   format: 'umd',
    //   globals: {}
    // },
    // isDev
    //   ? null
    //   : {
    //       dir: moduleDir,
    //       format: 'esm',
    //       preserveModules: true
    //     }
    {
      dir: moduleDir,
      format: 'esm',
      preserveModules: true
    }
  ],
  plugins: [
    clear({ targets: 'dist/*' }),
    // nodeResolve({
    //   preferBuiltins: false
    // }),
    json(),
    commonjs(),
    // babel({
    //   babelHelpers: 'bundled',
    //   presets: ['@babel/preset-env'],
    //   exclude: 'node_modules/**'
    // }),
    typescript(),
    // terser(),
    ...pluginsWithServe
  ],
  external: ['os', 'fs', 'readline', 'path', 'koa', 'koa-router', 'koa-body', 'urllib', 'winston', 'winston-daily-rotate-file']
};
