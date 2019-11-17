const Delaunay = require('./delaunay.js');

new p5(sketch => {
  sketch.disableFriendlyErrors = true;
  // reused dimensions and a seed
  let seed, width, height, noiseResolution, overdraw, blurQuality;
  const layers = {}; // offscreen layers
  const shaders = {}; // shaders
  const lib = {}; // libraries
  const assets = {}; // fonts, images, sound files

  sketch.preload = () => {
    shaders.whiteNoise = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/white-noise.frag'
    );
    // shaders.blurH = sketch.loadShader(
    //   '../shaders/base.vert',
    //   '../shaders/blur-two-pass.frag'
    // );
    // shaders.blurV = sketch.loadShader(
    //   '../shaders/base.vert',
    //   '../shaders/blur-two-pass.frag'
    // );
  }

  sketch.setup = () => {
    filenamePrefix = 'seigler-p5-7-estrellas-';
    overdraw = 0.1;
    width = Math.floor(sketch.windowWidth * (1 + overdraw));
    height = Math.floor(sketch.windowHeight * (1 + overdraw));
    noiseResolution = [0.2, 0.1, 0.05, 2];
    blurQuality = 2;

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    seed = window.location.hash.substr(1);
    sketch.colorMode(sketch.HSL, 1);

    sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);

    layers.stars = sketch.createGraphics(width, height);
    layers.stars.colorMode(sketch.HSL, 1);

    layers.noise = sketch.createGraphics(width, height, sketch.WEBGL);

    // layers.blur1 = sketch.createGraphics(width, height, sketch.WEBGL);
    // layers.blur2 = sketch.createGraphics(width, height, sketch.WEBGL);

    generate();
  };

  sketch.draw = () => {
  };

  sketch.keyReleased = () => {
    if (sketch.key == ' ') {
      seed = null;
      generate();
    } else if (sketch.key == 's') {
      sketch.saveCanvas(filenamePrefix + seed + '.jpg', 'jpg');
    }
  };

  sketch.doubleClicked = () => {
    seed = null;
    generate();
  };

  let resizeTimer;
  sketch.windowResized = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  function generate() {
    if (seed) {
      sketch.randomSeed(seed);
    } else {
      let seed = Math.floor(sketch.random(1000000000000));
      window.location.hash = seed;
      sketch.randomSeed(seed);
    }

    sketch.noiseSeed(sketch.random(0, 1000000000));

    layers.stars.clear();
    layers.stars.fill(1);
    layers.stars.noStroke();
    addStars(layers.stars);

    sketch.blendMode(sketch.BLEND);
    sketch.background(0);
    layers.noise.shader(shaders.whiteNoise);
    shaders.whiteNoise.setUniform('u_resolution', [width, height]);
    shaders.whiteNoise.setUniform('u_alpha', 0.05);
    layers.noise.rect(0, 0, width, height);
    sketch.image(layers.stars, Math.round(-width * overdraw/2), Math.round(-height * overdraw/2));
    sketch.blendMode(sketch.OVERLAY);
    sketch.image(layers.noise, 0, 0);
  }

  function addStars(layer) {
    const bigStars = new Array(Math.round(width * height / 2000));
    const littleStars = new Array(Math.round(width * height / 200));
    for (let i = 0; i < bigStars.length; i++) {
      bigStars[i] = [sketch.random(width), sketch.random(height)];
    }
    for (let i = 0; i < littleStars.length; i++) {
      littleStars[i] = [sketch.random(width), sketch.random(height)];
    }
    layer.noStroke();
    layer.fill(1);
    littleStars.forEach(star => {
      layer.circle(star[0], star[1], sketch.random(0.25, 0.5));
    });
    const triangles = Delaunay.triangulate(bigStars);
    layer.stroke(235/360, 0.82, 0.42, 0.28);
    layer.strokeWeight(2);
    layer.strokeCap(sketch.SQUARE);
    layer.noFill();
    for (let i = 0; i < triangles.length; i += 3) {
      if (sketch.random() > 0.85) {
        layer.triangle(
          bigStars[triangles[i    ]][0], bigStars[triangles[i    ]][1],
          bigStars[triangles[i + 1]][0], bigStars[triangles[i + 1]][1],
          bigStars[triangles[i + 2]][0], bigStars[triangles[i + 2]][1]
        );
      }
    }
    layer.noStroke();
    layer.fill(1);
    bigStars.forEach(star => {
      layer.circle(star[0], star[1], sketch.random(0.75, 2));
    });
  }

  // give Perlin noise 0-1 a uniform distribution
  function flattenPerlin(x) {
    return 23.8615 * Math.pow(x, 5)
      - 59.6041 * Math.pow(x, 4)
      + 47.2472 * Math.pow(x, 3)
      - 11.3053 * Math.pow(x, 2)
      + 0.806219 * x - 0.00259101;
  }

  // returns abs angle from a to b to c
  function three_point_angle(A,B,C) {
    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
    var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
    var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
    return Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
  }
});
