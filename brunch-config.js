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
  babel: {
    presets: ['env'],
    ignore: /^node_modules/
  },
  uglify: {
    ignored: /^node_modules/
  },
  copycat:{
    modules: ['node_modules/p5/lib/p5.min.js', 'node_modules/p5/lib/addons/p5.sound.min.js'],
    verbose : true,
    onlyChanged: true
  }
};
