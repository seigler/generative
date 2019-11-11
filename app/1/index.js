new p5(sketch => {
  sketch.disableFriendlyErrors = true;
  // reused dimensions and a seed
  let seed, width, height, maxD, goalInstances, noiseResolution, blurQuality;
  // canvas
  let canvas;
  // offscreen layers
  let buffer, pass1, pass2, noise;
  // shaders
  let blurH, blurV, whiteNoise;

  sketch.preload = () => {
    blurH = sketch.loadShader('../shaders/base.vert', '../shaders/blur-two-pass.frag');
    blurV = sketch.loadShader('../shaders/base.vert', '../shaders/blur-two-pass.frag');
    whiteNoise = sketch.loadShader('../shaders/base.vert', '../shaders/white-noise.frag');
  }

  sketch.setup = () => {
    noiseResolution = 2;
    blurQuality = 2;
    goalInstances = 70;

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    seed = window.location.hash.substr(1);
    sketch.noStroke();
    sketch.colorMode(sketch.HSB, 100);

    width = sketch.windowWidth;
    height = sketch.windowHeight;

    canvas = sketch.createCanvas(width, height);

    maxD = (width + height) * 1.75 / Math.sqrt(goalInstances);

    buffer = sketch.createGraphics(maxD, maxD);
    pass1 = sketch.createGraphics(maxD, maxD, sketch.WEBGL);
    pass2 = sketch.createGraphics(maxD, maxD, sketch.WEBGL);
    noise = sketch.createGraphics(width, height, sketch.WEBGL);

    buffer.noStroke();
    pass1.noStroke();
    pass2.noStroke();
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
      sketch.saveCanvas('seigler-p5-1-gradient_burst-' + seed + '.jpg', 'jpg');
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

    sketch.noiseSeed(sketch.random());
    sketch.blendMode(sketch.BLEND);
    sketch.background('#000');
    sketch.blendMode(sketch.ADD);

    let sqpxEach = width * height / goalInstances; // square pixels per circle, helps with gridding
    let unit = Math.sqrt(sqpxEach);
    let rows = Math.max(1, Math.round(height / unit)) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = sketch.random(0, noiseResolution * 1000);
    let indices = [];
    for (let i = 0; i < rows * cols; i++) {
      indices[i] = i;
    }
    shuffle(indices);
    for (let i = 0; i < rows * cols; i++) {
      // calculate row and col from i
      let col = indices[i] % cols;
      let row = Math.floor(indices[i] / cols);

      buffer.noStroke();
      buffer.background('#000');

      // perlin noise "intensity"
      let intensity = sketch.noise(
        noiseOffset + row / rows * noiseResolution,
        noiseOffset + col / cols * noiseResolution
      );
      let d = maxD * intensity; // diameter
      let c = sketch.color(100 * sketch.random(), 100, intensity * 90 + 10, intensity * 70 + 10); // color
      buffer.fill(c);
      buffer.circle(maxD / 2, maxD / 2, d); // always at the center of the buffer

      let blurSize = maxD / 80;
      // blurQuality is number of blur iterations
      for (let pass = 0; pass < blurQuality; pass++) {
        let radius = (blurQuality - pass) * blurSize / blurQuality;
        pass1.shader(blurH);
        blurH.setUniform('tex0', pass == 0 ? buffer : pass2);
        blurH.setUniform('texelSize', [radius/maxD, radius/maxD]);
        blurH.setUniform('direction', [1.0, 0.0]);
        pass1.rect(0, 0, maxD, maxD);
        pass2.shader(blurV);
        blurV.setUniform('tex0', pass1);
        blurV.setUniform('texelSize', [radius/maxD, radius/maxD]);
        blurV.setUniform('direction', [0.0, 1.0]);
        pass2.rect(0, 0, maxD, maxD);
      }

      buffer.image(pass2, 0, 0, maxD, maxD);

      if (sketch.random() > 0.5) {
        buffer.fill('#000');
        let cutoutAngle = sketch.random(2 * Math.PI);
        let cutoutDiameter = sketch.random(0.1, 1.5) * d / 2;
        let cutoutAdjustment = cutoutDiameter * sketch.random(-0.7, 0.3);
        buffer.circle(
          (maxD + (cutoutAdjustment + d) * Math.cos(cutoutAngle)) / 2,
          (maxD + (cutoutAdjustment + d) * Math.sin(cutoutAngle)) / 2,
          cutoutDiameter * 2
        );
      }

      do {
        let a1 = sketch.random(2 * Math.PI);
        let a2 = sketch.random(2 * Math.PI);
        buffer.stroke(0);
        buffer.strokeWeight(1 + d * Math.pow(sketch.random(0.7368), 3));// as much as 0.4*d
        buffer.line(
          maxD * (Math.sin(a1) + 0.5), maxD * (Math.cos(a1) + 0.5),
          maxD * (Math.sin(a2) + 0.5), maxD * (Math.cos(a2) + 0.5)
        );
      } while (sketch.random() < 0.5 + 0.45 * intensity);

      let displacementAngle = sketch.random(0, Math.PI * 2);
      let displacementAmount = sketch.random(unit);
      let w = width / (cols - 1) * col + displacementAmount * Math.cos(displacementAngle);
      let h = height / (rows - 1) * row + displacementAmount * Math.sin(displacementAngle);

      sketch.image(buffer, w - maxD / 2, h - maxD / 2);
    }
    noise.shader(whiteNoise);
    whiteNoise.setUniform('u_resolution', [width, height]);
    whiteNoise.setUniform('u_alpha', 0.05);
    noise.rect(0, 0, width, height);

    sketch.blendMode(sketch.OVERLAY);
    sketch.image(noise, 0, 0);
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
