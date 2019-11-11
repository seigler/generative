new p5(sketch => {
  sketch.disableFriendlyErrors = true;
  // reused dimensions and a seed
  let seed, width, height, maxD, goalInstances, intensityNoiseResolution, colorNoiseResolution, blurQuality, filenamePrefix;
  // images
  let palm1, palm2;
  // offscreen layers
  let buffer, pass1, pass2, noise;
  // shaders
  let blurH, blurV, whiteNoise;

  sketch.preload = () => {
    blurH = sketch.loadShader('../shaders/base.vert', '../shaders/blur-two-pass.frag');
    blurV = sketch.loadShader('../shaders/base.vert', '../shaders/blur-two-pass.frag');
    whiteNoise = sketch.loadShader('../shaders/base.vert', '../shaders/white-noise.frag');
    palm1 = sketch.loadImage('palm-leaf-1.jpg'); // 405x600
    palm2 = sketch.loadImage('palm-leaf-2.jpg'); // 405x600
  }

  sketch.setup = () => {
    intensityNoiseResolution = 2;
    colorNoiseResolution = 6;
    blurQuality = 2;
    goalInstances = 80;
    filenamePrefix = 'seigler-p5-2-gradient_jungle-';

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    seed = window.location.hash.substr(1);
    sketch.noStroke();
    sketch.colorMode(sketch.HSB, 100);

    width = sketch.windowWidth;
    height = sketch.windowHeight;

    sketch.createCanvas(width, height);

    maxD = (width + height) * 2 / Math.sqrt(goalInstances);

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

    sketch.noiseSeed(sketch.random());
    sketch.blendMode(sketch.BLEND);
    sketch.background('#000');
    sketch.blendMode(sketch.ADD);

    let sqpxEach = width * height / goalInstances; // square pixels per circle, helps with gridding
    let unit = Math.sqrt(sqpxEach);
    let rows = Math.max(1, Math.round(height / unit)) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = sketch.random(0, intensityNoiseResolution * 1000);
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
      buffer.blendMode(sketch.BLEND);
      buffer.background('#000');

      // perlin noise "intensity"
      let intensity = sketch.noise(
        noiseOffset + row / rows * intensityNoiseResolution,
        noiseOffset + col / cols * intensityNoiseResolution
      );
      let d = maxD * (0.2 + 0.7 * intensity); // diameter
      let c = sketch.color(
        100 * (2 * sketch.noise(
          2 * noiseOffset + row / rows * colorNoiseResolution,
          2 * noiseOffset + col / cols * colorNoiseResolution
        ) - 0.5),
        100, // saturation
        intensity * 80 + 10, // brightness
        intensity * 60 + 10 // alpha
      ); // color
      buffer.fill(c);
      buffer.circle(maxD / 2, maxD / 2, d); // always at the center of the buffer

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

      let blurSize = maxD / 100;
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

      do {
        let cutoutAngle = sketch.random(2 * Math.PI);
        let cutoutRotation = sketch.random(-Math.PI, Math.PI);
        buffer.blendMode(sketch.MULTIPLY);
        let cutoutHeight = sketch.random(1, 4) * d;
        let cutoutWidth = cutoutHeight / 600 * 405;
        let cutoutAdjustment = d * sketch.random(0.1, 0.8);
        buffer.translate(maxD / 2, maxD / 2);
        buffer.rotate(cutoutRotation);
        buffer.translate(0, cutoutAdjustment);
        buffer.rotate(cutoutAngle);
        buffer.image(sketch.random() > 0.3 ? palm1 : palm2, 0, 0, cutoutWidth, cutoutHeight);
        buffer.resetMatrix();
      } while (sketch.random() < 0.8);

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
