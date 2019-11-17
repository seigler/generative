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
    shaders.blurH = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/blur-two-pass.frag'
    );
    shaders.blurV = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/blur-two-pass.frag'
    );
  }

  sketch.setup = () => {
    filenamePrefix = 'seigler-p5-5-glow_path-';
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

    layers.buffer = sketch.createGraphics(width, height);
    layers.buffer.colorMode(sketch.HSL, 1);

    layers.cells = sketch.createGraphics(width, height);
    layers.cells.colorMode(sketch.HSL, 1);
    layers.cells.noStroke();

    layers.noise = sketch.createGraphics(width, height, sketch.WEBGL);

    layers.blur1 = sketch.createGraphics(width, height, sketch.WEBGL);
    layers.blur2 = sketch.createGraphics(width, height, sketch.WEBGL);

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
    sketch.blendMode(sketch.BLEND);

    let unit = Math.min(width, height) / Math.round(sketch.random(4, 6));

    // doodle
    let glowPath = sketch.random(0, 1000000000);
    let glowHue = sketch.random();
    let pathCountMult = Math.round(unit / 15);

    layers.buffer.background(sketch.random(), 0.1, 0.25);
    layers.buffer.blendMode(sketch.BLEND);
    layers.buffer.strokeCap(sketch.ROUND);
    layers.buffer.noFill();
    const doodle = (layer, seed = sketch.random(0, 1000000000)) => {
      sketch.randomSeed(seed);
      let doodlePoint = {
        x: sketch.random(width * overdraw * 0.4, width * (1 - overdraw * 0.4)),
        y: sketch.random(height * overdraw * 0.4, height * (1 - overdraw * 0.4))
      };
      if (sketch.random() > 0.5) {
        doodlePoint.y = sketch.random() > 0.5 ? height * overdraw * 0.4 : height * (1 - overdraw * 0.4);
      } else {
        doodlePoint.x = sketch.random() > 0.5 ? width * overdraw * 0.4 : width * (1 - overdraw * 0.4);
      }
      let doodleMaxTurn = sketch.random(Math.PI / 8, Math.PI);
      let doodleHeading = Math.atan2(height/2 - doodlePoint.y, width/2 - doodlePoint.x);
      doodleHeading += sketch.random(-0.25, 0.25) * doodleMaxTurn;
      layer.beginShape();
      layer.vertex(doodlePoint.x, doodlePoint.y);
      let steps = 0;
      do {
        const { x: ax, y: ay } = doodlePoint;
        const bx = doodlePoint.x + unit/2 * Math.cos(doodleHeading),
          by = doodlePoint.y + unit/2 * Math.sin(doodleHeading);
        doodleHeading += sketch.random(-1, 1) * doodleMaxTurn;
        layer.quadraticVertex(ax, ay, sketch.lerp(ax, bx, 0.5), sketch.lerp(ay, by, 0.5));
        doodlePoint = { x: bx, y: by };
        steps++;
      } while(
        steps < 80 ||
        doodlePoint.x > -unit/2 && doodlePoint.x < width + unit/2 &&
        doodlePoint.y > -unit/2 && doodlePoint.y < height + unit/2
      );
      layer.endShape();
    }

    // dark fat doodles
    layers.buffer.blendMode(sketch.MULTIPLY);
    for (let i = 0; i < pathCountMult; i++) {
      layers.buffer.strokeWeight(sketch.random(0.5, 2) * pathCountMult);
      layers.buffer.stroke(sketch.random(0.2, 0.45));
      doodle(layers.buffer);
    }
    // glow path
    layers.buffer.blendMode(sketch.BLEND);
    layers.buffer.stroke(glowHue, 1, 0.5);
    layers.buffer.strokeWeight(25);
    doodle(layers.buffer, glowPath);

    // blur the paths
    let blurSize = pathCountMult / 6;
    for (let pass = 0; pass < blurQuality; pass++) {
      let radius = (blurQuality - pass) * blurSize / blurQuality;
      layers.blur1.shader(shaders.blurH);
      shaders.blurH.setUniform('tex0', pass == 0 ? layers.buffer : layers.blur2);
      shaders.blurH.setUniform('texelSize', [radius/width, radius/height]);
      shaders.blurH.setUniform('direction', [1.0, 0.0]);
      layers.blur1.rect(0, 0, width, height);
      layers.blur2.shader(shaders.blurV);
      shaders.blurV.setUniform('tex0', layers.blur1);
      shaders.blurV.setUniform('texelSize', [radius/width, radius/height]);
      shaders.blurV.setUniform('direction', [0.0, 1.0]);
      layers.blur2.rect(0, 0, width, height);
    }
    layers.buffer.image(layers.blur2, 0, 0, width, height);

    layers.buffer.strokeWeight(1);
    for (let i = 0; i < pathCountMult * 30; i++) {
      layers.buffer.stroke(sketch.random(0.05));
      doodle(layers.buffer);
    }
    layers.buffer.stroke(glowHue, 1, 0.9);
    layers.buffer.strokeWeight(5);
    doodle(layers.buffer, glowPath);
    sketch.image(layers.buffer, Math.round(-width * overdraw/2), Math.round(-height * overdraw/2));

    // square pixels per circle, helps with gridding
    sketch.blendMode(sketch.BLEND);
    let rows = Math.max(1, Math.round(height / unit / Math.sin(Math.PI / 3))) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = unit * 200 + Math.SQRT2;
    let gridPoints = [];
    for (let index = 0; index < rows * cols; index++) {
      let col = index % cols;
      let row = Math.floor(index / cols);
      let noise = noiseResolution.map(
        (resolution, noiseIndex) => {
          // let gridScale = resolution / Math.min(rows, cols);
          return sketch.noise(
            noiseOffset * (noiseIndex + 1) + (row - rows / 2) * resolution,
            noiseOffset * (noiseIndex + 1) + (col - cols / 2) * resolution
          )
        }
      );
      gridPoints.push({
        row,
        col,
        noise,
      });
    }
    gridPoints.forEach(point => {
      let { col, row, noise: [n0, n1, n2, n3] } = point;
      point.x = (
        width / (cols - 1) * col
        + (row % 2 - 0.5) * unit / 2
        + 1 * n0 * unit * Math.cos(sketch.TWO_PI * flattenPerlin(n1))
      );
      point.y = (
        height / (rows - 1) * row
        + 1 * n0 * unit * Math.sin(sketch.TWO_PI * flattenPerlin(n1))
      );
    });

    layers.noise.shader(shaders.whiteNoise);
    shaders.whiteNoise.setUniform('u_resolution', [width, height]);
    shaders.whiteNoise.setUniform('u_alpha', 0.05);
    layers.noise.rect(0, 0, width, height);
    sketch.blendMode(sketch.OVERLAY);
    sketch.image(layers.noise, 0, 0);
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
