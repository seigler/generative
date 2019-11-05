new p5(sketch => {
  // reused dimensions and a seed
  let seed, width, height, maxD, goalInstances;

  // offscreen layers
  let buffer, pass1, pass2;

  // shaders
  let blurH, blurV;

  sketch.preload = () => {
    // shaders, we will use the same vertex shader and frag shaders for both passes
    blurH = sketch.loadShader('shaders/blur-two-pass/base.vert', 'shaders/blur-two-pass/blur.frag');
    blurV = sketch.loadShader('shaders/blur-two-pass/base.vert', 'shaders/blur-two-pass/blur.frag');
  }

  sketch.setup = () => {
    goalInstances = 100;

    seed = window.location.hash.substr(1);
    sketch.noStroke();
    sketch.colorMode(sketch.HSB, 100);

    width = document.documentElement.scrollWidth;
    height = document.documentElement.scrollHeight;
    maxD = (width + height) * 1.75 / Math.sqrt(goalInstances);

    sketch.createCanvas(width, height);

    buffer = sketch.createGraphics(maxD, maxD);
    pass1 = sketch.createGraphics(maxD, maxD, sketch.WEBGL);
    pass2 = sketch.createGraphics(maxD, maxD, sketch.WEBGL);

    buffer.noStroke();
    pass1.noStroke();
    pass2.noStroke();

    generate();
  }

  sketch.draw = () => {
  }

  sketch.keyPressed = () => {
    if (sketch.key == ' ') {
      seed = null;
      generate();
    }
  }

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
    let resolution = 2;

    let sqpxEach = width * height / goalInstances; // square pixels per circle, helps with gridding
    let unit = Math.sqrt(sqpxEach);
    let rows = Math.max(1, Math.round(height / unit)) + 1;
    let cols = Math.max(1, Math.round(width / unit)) + 1;
    let noiseOffset = sketch.random(0, 1000);
    for (let i = 0; i < rows * cols; i++) {
      // calculate row and col from i
      let col = i % cols;
      let row = Math.floor(i / cols);

      buffer.noStroke();
      buffer.background('#000');

      // perlin noise "intensity"
      let intensity = sketch.noise(
        noiseOffset + row / rows * resolution,
        noiseOffset + col / cols * resolution
      );
      let d = maxD * intensity; // diameter
      let c = sketch.color(100 * sketch.random(), 100, intensity * 90 + 10, intensity * 70 + 10); // color
      buffer.fill(c);
      buffer.circle(maxD / 2, maxD / 2, d); // always at the center of the buffer

      // giant, lo-fi blur
      pass1.shader(blurH);
      blurH.setUniform('tex0', buffer);
      blurH.setUniform('texelSize', [8.0/maxD, 8.0/maxD]);
      blurH.setUniform('direction', [1.0, 0.0]);
      pass1.rect(0,0,maxD, maxD);
      pass2.shader(blurV);
      blurV.setUniform('tex0', pass1);
      blurV.setUniform('texelSize', [8.0/maxD, 8.0/maxD]);
      blurV.setUniform('direction', [0.0, 1.0]);
      pass2.rect(0,0,maxD, maxD);

      // regular blur to hide artifacts
      pass1.shader(blurH);
      blurH.setUniform('tex0', pass2);
      blurH.setUniform('texelSize', [1.0/maxD, 1.0/maxD]);
      blurH.setUniform('direction', [1.0, 0.0]);
      pass1.rect(0,0,maxD, maxD);
      pass2.shader(blurV);
      blurV.setUniform('tex0', pass1);
      blurV.setUniform('texelSize', [1.0/maxD, 1.0/maxD]);
      blurV.setUniform('direction', [0.0, 1.0]);
      pass2.rect(0,0,maxD, maxD);

      buffer.image(pass2, 0, 0, maxD, maxD);

      buffer.fill('#000');
      let cutoutAngle = sketch.random(2 * Math.PI);
      buffer.circle(d * Math.cos(cutoutAngle), d * Math.sin(cutoutAngle), sketch.random(0.3, 0.5) * d);
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
  }
});
