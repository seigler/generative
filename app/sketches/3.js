new p5(sketch => {
  sketch.disableFriendlyErrors = false;
  // reused dimensions and a seed
  let seed, width, height, goalInstances, noiseResolution;
  // offscreen layers
  let buffer, pass1, noise;
  // shaders
  let whiteNoise;

  sketch.preload = () => {
    whiteNoise = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/white-noise.frag'
    );
  }

  sketch.setup = () => {
    filenamePrefix = 'seigler-p5-3-untitled';
    goalInstances = 40000;
    noiseResolution = [2, 2, 2, 2];

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    seed = window.location.hash.substr(1);
    sketch.noStroke();
    sketch.colorMode(sketch.HSL, 1);

    width = sketch.windowWidth;
    height = sketch.windowHeight;

    sketch.createCanvas(width, height);

    // buffer = sketch.createGraphics(maxD, maxD);
    // pass1 = sketch.createGraphics(maxD, maxD, sketch.WEBGL);
    noise = sketch.createGraphics(width, height, sketch.WEBGL);

    // buffer.noStroke();
    // pass1.noStroke();
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
    sketch.background('#777');

    // square pixels per circle, helps with gridding
    let sqpxEach = width * height / goalInstances;
    let unit = Math.sqrt(sqpxEach);
    let rows = Math.max(1, Math.round(height / unit)) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = 1000.37;
    let gridPoints = [];
    for (let index = 0; index < rows * cols; index++) {
      let col = index % cols;
      let row = Math.floor(index / cols);
      let noise = noiseResolution.map(
        (resolution, noiseIndex) => (
          sketch.noise(
            noiseOffset * noiseIndex + row / rows * resolution,
            noiseOffset * noiseIndex + col / cols * resolution
          )
        )
      );
      gridPoints.push({
        row,
        col,
        noise
      });
    }
    shuffle(gridPoints);
    gridPoints.forEach(({row, col, noise: [n0, n1, n2, n3]}) => {
      if (sketch.random() > 1.25 * n0 - 0.25) { return; }
      let x = width / (cols - 1) * col - unit / 2;
      let y = height / (rows - 1) * row - unit / 2;
      let angle = 2 * Math.PI * n2;
      let length = (4 * n3* n3 + 1) * unit;
      sketch.stroke(
        27/360, // hue
        0.27, // saturation
        0.9 * n1 + 0.1 * Math.pow(sketch.random(), 2) - 0.05 // lightness
      );
      sketch.strokeWeight(unit * (1 + 1 * n3 * n3));
      sketch.line(
        x - length * Math.cos(angle),
        y - length * Math.sin(angle),
        x + length * Math.cos(angle),
        y + length * Math.sin(angle)
      );
    });
    // noise.shader(whiteNoise);
    // whiteNoise.setUniform('u_resolution', [width, height]);
    // whiteNoise.setUniform('u_alpha', 0.05);
    // noise.rect(0, 0, width, height);

    // sketch.blendMode(sketch.OVERLAY);
    // sketch.image(noise, 0, 0);
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

});
