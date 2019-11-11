exports.files = {
  javascripts: {
    joinTo: {
      'app.js': /^app/
    }
  },
  stylesheets: {joinTo: 'app.css'}
};

exports.modules = {
  autoRequire: {
    'app.js': ['initialize']
  }
};

exports.plugins = {
  uglify: {
    ignored: /^node_modules/
  },
  copycat:{
    modules: [
      'node_modules/p5/lib/p5.min.js',
      'node_modules/p5/lib/addons/p5.sound.min.js',
      'node_modules/voronoi/rhill-voronoi-core.min.js'
    ],
    verbose : true,
    onlyChanged: true
  },
  static: {
    processors: [
      require('html-brunch-static')({
        processors: [ ],
        defaultContext: {
          baseURL: 'https://seigler.github.io/generative'
        },
        handlebars: {
          enableProcessor: true,
          helpers: {},
        },
        minify: true
      })
    ]
  }
};
