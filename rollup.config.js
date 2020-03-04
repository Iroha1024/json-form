import typescript from 'rollup-plugin-typescript2'
import postcss from 'rollup-plugin-postcss'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import svelte from 'rollup-plugin-svelte'
import copy from 'rollup-plugin-copy'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const pkg = require('./package.json')

const isDevelopment = process.env.NODE_ENV === 'development'

const developmentPlugin = () => {
  if (!isDevelopment) return []
  const plugin = [
    copy({
      targets: [
        { src: 'example/index.html', dest: 'dist' },
      ]
    }),
    serve({
      open: true,
      contentBase: 'dist',
      port: '8080'
    }),
    livereload()
  ]
  return plugin
}

export default {
  input: 'src/index.ts',
  output: [
    {
      sourcemap: true,
      file: pkg.module,
      format: 'es'
    },
    {
      sourcemap: true,
      file: pkg.main,
      format: 'cjs'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    svelte(),
    typescript({
      clean: true
    }),
    postcss(),
    ...developmentPlugin()
  ]
}