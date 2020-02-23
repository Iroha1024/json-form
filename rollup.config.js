import typescript from 'rollup-plugin-typescript2'
import postcss from 'rollup-plugin-postcss'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const pkg = require('./package.json')

const isDevelopment = process.env.NODE_ENV === 'development'

const developmentPlugin = () => {
  if (!isDevelopment) return []
  const plugin = [
    serve({
      open: true,
      openPage: '/example/',
      contentBase: '',
      port: '8080'
    }),
    livereload()
  ]
  return plugin
}

export default {
  input: 'src/index.ts',
  output: {
    file: pkg.module,
    format: 'es'
  },
  plugins: [
    typescript(),
    postcss(),
    ...developmentPlugin()
  ]
}