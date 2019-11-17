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
    filenamePrefix = 'seigler-p5-6-grow-';
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

    layers.branches = sketch.createGraphics(width, height);
    layers.branches.colorMode(sketch.HSL, 1);

    layers.leaves = sketch.createGraphics(width, height);
    layers.leaves.colorMode(sketch.HSL, 1);

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
    sketch.blendMode(sketch.BLEND);

    // tree
    const tree = (branches, leaves, {x: aX, y: aY}, heading, speed, leafSize, thickness, maxTurn, maxLength, splitAngle, wind, forks = 0, length = 0) => {
      const bX = aX + speed * Math.cos(heading),
      bY = aY + speed * Math.sin(heading);
      const newHeading = sketch.lerp(
        heading + sketch.random(-1, 1) * maxTurn,
        -Math.PI/2,
        0.2
      );
      const cX = bX + speed * Math.cos(heading),
      cY = bY + speed * Math.sin(heading);
      branches.strokeWeight(thickness + 2);
      branches.beginShape();
      branches.vertex(aX, aY);
      branches.quadraticVertex(bX, bY, cX, cY);
      branches.endShape();
      if (
        forks < 20 &&
        thickness > 1
      ) {
        for (let i = 0, max = forks === 0 ? 1 : Math.ceil(0.8 + sketch.random(1.2)); i < max; i++) {
          const newBranchHeading = newHeading + (max > 1 ? splitAngle * sketch.map(i, 0, max - 1, -0.5, 0.5) : 0);
          tree(
            branches, leaves, {x: cX, y: cY}, newBranchHeading, speed * 0.9, leafSize,
            sketch.map(
              Math.cos(newBranchHeading - heading),
              0, 1,
              0, thickness * (1 - (length + speed) / maxLength)
            ), maxTurn, maxLength, splitAngle, wind, forks + 1, length + speed
          );
        }
      } else {
        const leafWidth = leafSize * sketch.random(0.7, 1.8);
        leaves.circle(cX, cY, leafWidth);
        for (let i = 1; i < leafWidth; i+=2) {
          const length = Math.pow(sketch.random(), 2) * leafWidth * 2;
          const angle = wind * sketch.random(0.6, 1.4) + Math.PI/2;
          leaves.line(cX - leafWidth/2 + i, cY, cX - leafWidth/2 + i + length * Math.cos(angle), cY + length * Math.sin(angle));
        }
      }
    }

    const hue = sketch.random();
    layers.branches.clear();
    layers.branches.blendMode(sketch.BLEND);
    layers.branches.strokeCap(sketch.ROUND);
    layers.branches.noFill();
    layers.branches.stroke(0);
    layers.leaves.clear();
    layers.leaves.fill((hue + 0.5) % 1, 0.3, 0.9);
    layers.leaves.stroke((hue + 0.5) % 1, 0.3, 0.9);
    layers.leaves.strokeWeight(2);
    let unit = height / 4.5;
    tree(layers.branches, layers.leaves, {x: width/2, y: height}, sketch.random(-0.45 * Math.PI, -0.55 * Math.PI), unit/4, unit/6, sketch.random(unit/6,unit/3), Math.PI / 4, 0.8 * height, Math.PI/3, Math.PI*0);

    sketch.blendMode(sketch.BLEND);
    sketch.background(hue, 0.1, 0.25);
    sketch.strokeWeight(unit/4);
    sketch.stroke(hue, 1, 0.3);
    sketch.noFill();
    sketch.circle(width*(1 - overdraw)/2, height * (1 - overdraw)/2, height * 0.8);
    layers.noise.shader(shaders.whiteNoise);
    shaders.whiteNoise.setUniform('u_resolution', [width, height]);
    shaders.whiteNoise.setUniform('u_alpha', 0.05);
    layers.noise.rect(0, 0, width, height);
    sketch.image(layers.branches, Math.round(-width * overdraw/2), Math.round(-height * overdraw/2));
    sketch.image(layers.leaves, Math.round(-width * overdraw/2), Math.round(-height * overdraw/2));
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
