new p5(sketch => {
  sketch.disableFriendlyErrors = true;
  // reused dimensions and a seed
  let seed, width, height, noiseResolution, overdraw, blurQuality;
  const layers = {}; // offscreen layers
  const shaders = {}; // shaders
  const lib = {}; // libraries
  const assets = {}; // fonts, images, sound files

  sketch.preload = () => {
    // shaders.whiteNoise = sketch.loadShader(
    //   "../shaders/base.vert",
    //   "../shaders/white-noise.frag"
    // );
    assets.stroke = sketch.loadImage("./brush-100x30.png");
  };

  sketch.setup = () => {
    filenamePrefix = "seigler-p5-8-terra-firma-";
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

    layers.contours = sketch.createGraphics(width, height);
    layers.contours.colorMode(sketch.HSL, 1);

    // layers.noise = sketch.createGraphics(width, height, sketch.WEBGL);

    // layers.blur1 = sketch.createGraphics(width, height, sketch.WEBGL);
    // layers.blur2 = sketch.createGraphics(width, height, sketch.WEBGL);

    generate();
  };

  sketch.draw = () => {};

  sketch.keyReleased = () => {
    if (sketch.key == " ") {
      seed = null;
      generate();
    } else if (sketch.key == "s") {
      sketch.saveCanvas(filenamePrefix + seed + ".jpg", "jpg");
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
      const seed = Math.floor(sketch.random(1000000000000));
      window.location.hash = seed;
      sketch.randomSeed(seed);
    }

    sketch.noiseSeed(sketch.random(0, 1000000000));
    lib.simplex = new SimplexNoise(sketch.random(0, 1000000000));

    layers.contours.clear();
    drawContours(layers.contours);

    sketch.blendMode(sketch.BLEND);
    sketch.background(0);
    // layers.noise.shader(shaders.whiteNoise);
    // shaders.whiteNoise.setUniform("u_resolution", [width, height]);
    // shaders.whiteNoise.setUniform("u_alpha", 0.05);
    // layers.noise.rect(0, 0, width, height);
    sketch.image(
      layers.contours,
      Math.round((-width * overdraw) / 2),
      Math.round((-height * overdraw) / 2)
    );
    // sketch.blendMode(sketch.OVERLAY);
    // sketch.image(layers.noise, 0, 0);
  }

  function drawContours(layer) {
    const noiseScale = 3 / (width + height);
    const quant = Math.round(Math.sqrt(width * height) / 1440 * 100); // 100 at 1920*1080
    layers.contours.imageMode(sketch.CENTER);

    const dots = buildGrid(0, 0, width, height, 15 * quant);
    layer.noStroke();
    dots.forEach(({x, y}) => {
      const {noise, angle} = noisePlus(x, y, noiseScale);
      if (noise < 0.5) { // water
        layer.tint(218/360, 0.8, 0.1 + sketch.random(0.05) + noise * 2 * 0.2);
      } else { // land
        layer.tint(119/360, 0.8, 0.1 + sketch.random(0.05) + (noise - 0.5) * 2 * 0.2);
      }
      const size = 200;
      layer.translate(x, y);
      layer.rotate(angle + (noise < 0.5 ? sketch.HALF_PI : 0));
      layer.image(assets.stroke, 0, 0, size, size / 3);
      layer.resetMatrix();
    });

    const trails = buildGrid(0, 0, width, height, 5 * quant);
    layer.noTint();
    layer.strokeCap(sketch.SQUARE);
    trails.forEach((point) => {
      const x = point.x + sketch.random(-50, 50);
      const y = point.y + sketch.random(-50, 50);
      const noise = fractalNoise(x, y, noiseScale);
      for (let i = 0, max = quant/2, aX = x, aY = y; i < max; i++) {
        const {angle} = noisePlus(aX, aY, noiseScale);
        const dX = Math.cos(angle + sketch.HALF_PI) * 4;
        const dY = Math.sin(angle + sketch.HALF_PI) * 4;
        if (noise > 0.5) {
          layer.stroke(0, 0.8);
        } else {
          layer.stroke(1, 0.5);
        }
        layer.strokeWeight(Math.sin(i/max*Math.PI)); // smooth 0 to 1 to 0
        layer.line(aX, aY, aX + dX, aY + dY);
        aX += dX;
        aY += dY;
      }
    });
  }

  function buildGrid(minX, minY, maxX, maxY, approxPoints) {
    const width = maxX - minX;
    const height = maxY - minY;
    const unit = Math.sqrt(width * height / Math.sin(Math.PI / 3) / approxPoints);
    const rows =
      Math.max(1, Math.round(height / unit / Math.sin(Math.PI / 3))) + 1;
    const cols = Math.max(1, Math.round(width / unit)) + 1;
    const grid = [];
    for (let index = 0; index < rows * cols; index++) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      grid.push({
        x: minX + (width / (cols - 1)) * col + (((row % 2) - 0.5) * unit) / 2,
        y: minY + (height / (rows - 1)) * row
      });
    }
    return grid;
  }

  function noisePlus(x, y, noiseScale = 2 / (width + height), noiseOffset = 0) {
    const noise = fractalNoise(x, y, noiseScale, noiseOffset);
    const dX = fractalNoise(x + 1, y, noiseScale, noiseOffset) - noise;
    const dY = fractalNoise(x, y + 1, noiseScale, noiseOffset) - noise;
    const angle = Math.atan2(dY, dX);
    const length = sketch.dist(0, 0, dX, dY);
    return ({noise, angle, length});
  }

  function fractalNoise(x, y, noiseScale = 2 / (width + height), noiseOffset = 0) {
    return 0.5 + 0.5 * (
      lib.simplex.noise2D(
        noiseOffset + noiseScale * x,
        noiseOffset + noiseScale * y
      ) + 
      0.5 * lib.simplex.noise2D(
        noiseOffset + 2 * noiseScale * x,
        noiseOffset + 2 * noiseScale * y
      ) +
      0.25 * lib.simplex.noise2D(
        noiseOffset + 4 * noiseScale * x,
        noiseOffset + 4 * noiseScale * y
      )
    ) / 1.75;
  }

  // give normally distributed values from 0-1 a uniform distribution
  function flattenDistribution(x) {
    return (
      23.8615 * Math.pow(x, 5) -
      59.6041 * Math.pow(x, 4) +
      47.2472 * Math.pow(x, 3) -
      11.3053 * Math.pow(x, 2) +
      0.806219 * x -
      0.00259101
    );
  }

  // returns abs angle from a to b to c
  function three_point_angle(A, B, C) {
    const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    const BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
    const AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
    return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
  }
});
