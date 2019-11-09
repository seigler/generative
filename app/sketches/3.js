new p5(sketch => {
  sketch.disableFriendlyErrors = false;
  // reused dimensions and a seed
  let seed, width, height, noiseResolution;
  // offscreen layers
  let noise;
  // shaders
  let whiteNoise;

  sketch.preload = () => {
    whiteNoise = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/white-noise.frag'
    );
  }

  sketch.setup = () => {
    filenamePrefix = 'seigler-p5-3-peanut_butter_and_jelly';
    width = sketch.windowWidth;
    height = sketch.windowHeight;
    noiseResolution = [2, 2, 2, 2];

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    seed = window.location.hash.substr(1);
    sketch.noStroke();
    sketch.colorMode(sketch.HSL, 1);

    sketch.createCanvas(width, height);

    noise = sketch.createGraphics(width, height, sketch.WEBGL);
    noise.noStroke();

    generate();
  };

  sketch.draw = () => {
  };

  sketch.keyPressed = () => {
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
    sketch.background(291/360, 0.3, 0.25);

    let stripeAngle = sketch.random(0, Math.PI);
    let stripeWidth = Math.min(width, height) / sketch.random(10, 80);
    let stripeLength = Math.max(width, height) * Math.SQRT2;
    let numStripes = Math.ceil(Math.SQRT2 * stripeLength / stripeWidth);
    let ox = width/2, oy = height/2;
    let dx = Math.cos(stripeAngle) * stripeLength / 2;
    let dy = Math.sin(stripeAngle) * stripeLength / 2;
    sketch.strokeCap(sketch.SQUARE);
    for (let i = Math.ceil(numStripes / 2); i > 0; i--) {
      sketch.stroke(291/360, 0.3, 0.2 + 0.1 * (i % 2));
      sketch.strokeWeight((i * 2 - 1) * stripeWidth);
      sketch.line(ox - dx, oy - dy, ox + dx, oy + dy);
    }

    noise.shader(whiteNoise);
    whiteNoise.setUniform('u_resolution', [width, height]);
    whiteNoise.setUniform('u_alpha', 0.05);
    noise.rect(0, 0, width, height);

    sketch.blendMode(sketch.OVERLAY);
    sketch.image(noise, 0, 0);

    // square pixels per circle, helps with gridding
    sketch.blendMode(sketch.BLEND);
    sketch.strokeCap(sketch.ROUND);
    let unit = 5;
    let rows = Math.max(1, Math.round(height / unit)) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = 1000.37;
    let gridPoints = [];
    for (let index = 0; index < rows * cols; index++) {
      let col = index % cols;
      let row = Math.floor(index / cols);
      let noise = noiseResolution.map(
        (resolution, noiseIndex) => {
          let gridScale = resolution / Math.min(rows, cols);
          return sketch.noise(
            noiseOffset * noiseIndex + row * gridScale,
            noiseOffset * noiseIndex + col * gridScale
          )
        }
      );
      gridPoints.push({
        row,
        col,
        noise
      });
    }
    shuffle(gridPoints);
    let angleOffset = sketch.random(0, 2*Math.PI);
    gridPoints.forEach(({row, col, noise: [n0, n1, n2, n3]}, index) => {
      if (sketch.random() > n0 * 1.75 - 0.5) { return; }
      let x = width / (cols - 1) * col - unit / 2;
      let y = height / (rows - 1) * row - unit / 2;
      let angle = 2 * Math.PI * flattenPerlin(n2) + angleOffset;
      let length = (8 * n3* n3 + 1) * unit;
      sketch.stroke(
        27 / 360, // hue
        0.5, // saturation
        n1 - 0.2 * (index / gridPoints.length) + 0.1 // lightness
      );
      sketch.strokeWeight(unit * (1 + 2 * n3 * n3 * n3));
      sketch.line(
        x - length * Math.cos(angle),
        y - length * Math.sin(angle),
        x + length * Math.cos(angle),
        y + length * Math.sin(angle)
      );
    });
  }

  function shuffle(array) { // Fisher-Yates shuffle
    var i = 0, j = 0, temp = null;

    for (i = array.length - 1; i > 0; i -= 1) {
      j = Math.floor(sketch.random() * (i + 1));
      temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  function flattenPerlin(x) {
    return 23.8615 * Math.pow(x, 5)
      - 59.6041 * Math.pow(x, 4)
      + 47.2472 * Math.pow(x, 3)
      - 11.3053 * Math.pow(x, 2)
      + 0.806219 * x - 0.00259101;
  }

});
