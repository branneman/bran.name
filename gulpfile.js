const AWS = require('aws-sdk')
const contentful = require('contentful')
const dateFilter = require('nunjucks-date-filter')
const env = require('dotenv').load().parsed
const fs = require('fs')
const glob = require('glob').sync
const gulp = require('gulp')
const httpServer = require('http-server')
const mime = require('mime')
const nunjucks = require('nunjucks')
const path = require('path')
const postcss = require('postcss')
const postcssCssnext = require('postcss-cssnext')
const postcssImport = require('postcss-import')
const shell = require('shelljs')

const nunjucksEnv = new nunjucks.Environment([
  new nunjucks.FileSystemLoader(__dirname, { noCache: true })
]).addFilter('date', dateFilter)

/**
 * Define config
 */
const config = Object.freeze({
  env: {
    contentful: {
      space: env.CONTENTFUL_SPACE,
      accessToken: env.CONTENTFUL_ACCESSTOKEN
    },
    s3: {
      region: env.AWS_REGION,
      bucket: env.AWS_BUCKET,
      credentials: {
        key: env.AWS_ACCESS_KEY_ID,
        secret: env.AWS_SECRET_ACCESS_KEY
      }
    }
  },
  src: `${__dirname}/src`,
  dist: `${__dirname}/dist`,
  glob: {
    src: `${__dirname}/src/**/*`,
    dist: `${__dirname}/dist/**/*`,
    templates: `${__dirname}/src/templates/**/*`,
    pages: `${__dirname}/src/templates/pages/**/*`,
    css: `${__dirname}/src/static/css/!(_)*.css`
  },
  datafile: `${__dirname}/dist/data.json`
})

/**
 * Sub-task implementation: Empty `dist/` folder
 * @private
 */
gulp.task('_clean', cb => {
  shell.rm('-rf', config.dist)
  cb()
})

/**
 * Sub-task implementation: Create `dist/` folder
 * @private
 */
gulp.task('_create_dist', cb => {
  shell.mkdir('-p', config.dist)
  shell.mkdir('-p', `${config.dist}/static/css`)
  cb()
})

/**
 * Sub-task implementation: Download Contentful entries
 * @private
 */
gulp.task('_download-content', () => {
  const client = contentful.createClient(config.env.contentful)
  const json = data => JSON.stringify(data, null, 2)
  const arr2obj = arr =>
    arr.reduce((acc, curr) => {
      acc[curr.contentType] = curr.items
      return acc
    }, {})
  const getContentTypeId = item => item.sys.id
  const extractEntry = id => ({ items }) => ({ contentType: id, items })
  const getEntriesByType = id =>
    client.getEntries({ content_type: id }).then(extractEntry(id))
  const getAllContentTypes = items =>
    Promise.all(items.map(getContentTypeId).map(getEntriesByType))
  const writeJSONData = filename => data =>
    fs.writeFileSync(filename, json(data, { encoding: 'utf8' }))

  return client
    .getContentTypes()
    .then(({ items }) => getAllContentTypes(items))
    .then(arr2obj)
    .then(writeJSONData(config.datafile))
})

/**
 * Sub-task implementation: Remove temporary files
 * @private
 */
gulp.task('_remove-temporary-files', cb => {
  fs.unlinkSync(config.datafile)
  cb()
})

/**
 * Sub-task implementation: Upload `dist/` contents to S3 bucket
 * @private
 */
gulp.task('_upload', () => {
  const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
      region: config.env.s3.region,
      Bucket: config.env.s3.bucket,
      credentials: config.env.s3.credentials
    }
  })

  const uploadFile = file =>
    new Promise((resolve, reject) => {
      if (!fs.statSync(file).isFile()) return resolve()

      s3.putObject(
        {
          Body: fs.readFileSync(file, 'utf8'),
          Key: path.relative(config.dist, file),
          ContentType: mime.lookup(file)
        },
        (err, data) => (err ? reject(err) : resolve(data))
      )
    })

  return Promise.all(glob(config.glob.dist).map(uploadFile))
})

/**
 * Sub-task implementation: Render ContentTypes with matching templates
 * @private
 */
gulp.task('_render-templates', cb => {
  const contentTypes = require(config.datafile)
  const render = (file, data) => nunjucksEnv.render(file, data)

  for (const contentType in contentTypes) {
    if (!contentTypes.hasOwnProperty(contentType)) continue

    const srcFile = `${config.src}/templates/${contentType}.njk`
    const distDir = `${config.dist}`
    const distFile = data => `${distDir}/${data.fields.url}.html`

    shell.mkdir('-p', distDir)

    contentTypes[contentType].forEach(data =>
      fs.writeFileSync(distFile(data), render(srcFile, { data }), 'utf8')
    )
  }

  cb()
})

/**
 * Sub-task implementation: Render pages
 * @private
 */
gulp.task('_render-pages', cb => {
  const getVinyl = filename => ({
    filename,
    contents: fs.readFileSync(filename, 'utf8')
  })
  const render = data => vinyl => {
    vinyl.contents = nunjucksEnv.render(vinyl.filename, { data })
    return vinyl
  }
  const mapFilename = filename =>
    `${path.relative(`${config.src}/templates/pages/`, filename)}`.replace(
      /\.njk$/,
      '.html'
    )
  const mapToDist = vinyl => {
    vinyl.filename = mapFilename(vinyl.filename)
    return vinyl
  }
  const writeDist = vinyl =>
    fs.writeFileSync(`${config.dist}/${vinyl.filename}`, vinyl.contents)

  glob(config.glob.pages)
    .map(getVinyl)
    .map(render(require(config.datafile)))
    .map(mapToDist)
    .map(writeDist)

  cb()
})

/**
 * Sub-task implementation: Compile PostCSS into CSS
 * @private
 */
gulp.task('_compile-css', () => {
  const processor = postcss([postcssImport, postcssCssnext])

  const map = fn => list => list.map(fn)
  const getCssFiles = pattern => Promise.resolve(glob(pattern))
  const getVinyl = filename => ({
    filename,
    contents: fs.readFileSync(filename, 'utf8')
  })
  const renderCss = vinyl =>
    processor.process(vinyl.contents, { from: vinyl.filename })
  const render = vinyl =>
    renderCss(vinyl).then(result => {
      vinyl.contents = result.css
      return vinyl
    })
  const mapFilename = filename =>
    `${path.relative(`${config.src}/static/css/`, filename)}`
  const mapToDist = vinyl => {
    vinyl.filename = mapFilename(vinyl.filename)
    return vinyl
  }
  const writeDist = vinyl =>
    fs.writeFileSync(
      `${config.dist}/static/css/${vinyl.filename}`,
      vinyl.contents
    )

  return getCssFiles(config.glob.css)
    .then(map(getVinyl))
    .then(map(render))
    .then(l => Promise.all(l))
    .then(map(mapToDist))
    .then(map(writeDist))
    .catch(console.error)
})

/**
 * Sub-task implementation: Copy images
 * @private
 */
gulp.task('_copy-images', cb => {
  shell.cp('-R', `${config.src}/static/img`, `${config.dist}/static`)
  cb()
})

/**
 * Sub-task: HTTP Server for development
 * @private
 */
gulp.task('_server', () => {
  httpServer
    .createServer({ root: config.dist })
    .listen(8080, () => console.log('Server listening on port 8080'))
  return new Promise(() => 0)
})

/**
 * Sub-task: Run a build
 * @private
 */
gulp.task(
  '_build',
  gulp.series(
    '_clean',
    '_create_dist',
    '_download-content',
    '_render-templates',
    '_render-pages',
    '_compile-css',
    '_copy-images',
    '_remove-temporary-files'
  )
)

/**
 * Sub-task: Watch for changes, re-run _build
 * @private
 */
gulp.task('_watch', () => gulp.watch(config.glob.src, gulp.series('_build')))

/**
 * Public Batch task: Run a build, then start watching for changes
 */
gulp.task('dev', gulp.series('_build', gulp.parallel('_server', '_watch')))

/**
 * Public Batch task: Run a build and release to S3
 */
gulp.task('release', gulp.series('_build', '_upload'))

/**
 * Public Batch task: Run a build from `src` to `dist`
 */
gulp.task('default', gulp.series('_build'))
