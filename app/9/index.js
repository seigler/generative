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
    assets.planet = sketch.loadImage("./dwarf_planet.png");
  };

  sketch.setup = () => {
    filenamePrefix = "seigler-p5-9-hot-space-trails-";
    overdraw = 0.1;
    width = Math.floor(sketch.windowWidth * (1 + overdraw));
    height = Math.floor(sketch.windowHeight * (1 + overdraw));
    noiseResolution = [0.2, 0.1, 0.05, 2];
    blurQuality = 2;

    window.onhashchange = () => {
      seed = window.location.hash.substr(1);
      generate();
    };

    sketch.colorMode(sketch.HSL, 1);

    sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);

    layers.base = sketch.createGraphics(width, height);
    layers.base.colorMode(sketch.HSL, 1);

    // layers.noise = sketch.createGraphics(width, height, sketch.WEBGL);

    // layers.blur1 = sketch.createGraphics(width, height, sketch.WEBGL);
    // layers.blur2 = sketch.createGraphics(width, height, sketch.WEBGL);

    generate();
  };

  sketch.draw = () => {};

  sketch.keyReleased = () => {
    if (sketch.key == " ") {
      sketch.doubleClicked();
    } else if (sketch.key == "s") {
      sketch.saveCanvas(filenamePrefix + seed + ".jpg", "jpg");
    }
  };

  sketch.doubleClicked = () => {
    window.location.hash = '';
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
      seed = Math.floor(sketch.random(1000000000000));
      if (window.location.replace) {
        window.location.replace(`#${seed}`);
      } else {
        window.location.hash = seed;
      }
      return;
    }

    sketch.noiseSeed(sketch.random(0, 1000000000));
    lib.simplex = new SimplexNoise(sketch.random(0, 1000000000));

    makeMainDrawing(layers.base);

    sketch.blendMode(sketch.BLEND);
    sketch.background(0);
    // layers.noise.shader(shaders.whiteNoise);
    // shaders.whiteNoise.setUniform("u_resolution", [width, height]);
    // shaders.whiteNoise.setUniform("u_alpha", 0.05);
    // layers.noise.rect(0, 0, width, height);
    sketch.image(
      layers.base,
      Math.round((-width * overdraw) / 2),
      Math.round((-height * overdraw) / 2)
    );
    // sketch.blendMode(sketch.OVERLAY);
    // sketch.image(layers.noise, 0, 0);
  }

  function makeMainDrawing(layer) {
    layer.clear();
    const noiseScale = 1.5 / (width + height);
    const quant = Math.round(width * height / 1920 / 1080 * 100);
    layers.base.imageMode(sketch.CENTER);
    const directAngle = sketch.random() * Math.PI * 2;

    const drawStar = ({x, y}) => {
      layer.noStroke();
      layer.fill(1);
      layer.circle(
        x + sketch.random(-10, 10),
        y + sketch.random(-10, 10),
        0.5 + Math.pow(sketch.random(), 10) * 3
      );
    };

    const drawPlanet = ({x, y}) => {
      layer.noStroke();
      if (sketch.random() > 0.5) {
        const { noise } = noisePlus(x, y, noiseScale);
        const size = Math.pow(sketch.random(), 5) * 200;
        layer.tint(0.8 * noise);
        layer.image(assets.planet, x, y, size, size);
      }
    };

    const drawTrail = (point) => {
      layer.noTint();
      const x = point.x + sketch.random(-50, 50);
      const y = point.y + sketch.random(-50, 50);
      const noise = fractalNoise(x, y, noiseScale);
      const wild = sketch.random() > 0.8;
      const fatness = sketch.random(2, 10);
      const directMod = !wild && sketch.random() > 0.5 ? Math.PI : 0;
      layer.strokeCap(wild ? sketch.ROUND : sketch.SQUARE);
      layer.stroke(wild ? sketch.color(sketch.random(0.05), 1, 0.5) : '#BBF7');
      for (let i = 0, max = 200, aX = x, aY = y; i < max; i++) {
        let {angle, noise} = noisePlus(aX, aY, noiseScale);
        if (!wild) {
          angle = directAngle;
        }
        const dX = Math.cos(angle + directMod + sketch.HALF_PI) * 4;
        const dY = Math.sin(angle + directMod + sketch.HALF_PI) * 4;
        layer.strokeWeight(
          (wild ? fatness : 1) * Math.pow(Math.sin(i/max*Math.PI), 2)
        );
        layer.line(aX, aY, aX + dX, aY + dY);
        aX += dX;
        aY += dY;
      }
    };

    const stars = buildGrid(0, 0, width, height, 100 * quant);
    stars.forEach(drawStar);
    const planets = buildGrid(0, 0, width, height, 3 * quant, drawPlanet);
    const trails = buildGrid(0, 0, width, height, quant, drawTrail);

    const mix = [...planets, ...trails];
    shuffle(mix);
    mix.forEach(({x, y, drawFunction}) => drawFunction({x, y}));
  }

  function buildGrid(minX, minY, maxX, maxY, approxPoints, drawFunction) {
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
        y: minY + (height / (rows - 1)) * row,
        drawFunction,
      });
    }
    return grid;
  }

  function noisePlus(
    x,
    y,
    noiseScale = 2 / (width + height),
    noiseOffset = 0
  ) {
    const noise = fractalNoise(x, y, noiseScale, noiseOffset);
    const dX = fractalNoise(x + 1, y, noiseScale, noiseOffset) - noise;
    const dY = fractalNoise(x, y + 1, noiseScale, noiseOffset) - noise;
    const angle = Math.atan2(dY, dX);
    const length = sketch.dist(0, 0, dX, dY);
    return ({noise, angle, length});
  }

  function fractalNoise(
    x,
    y,
    noiseScale = 2 / (width + height),
    noiseOffset = 0
  ) {
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

  /**
   * Shuffles array in place.
   * @param {Array} a items An array containing the items.
   */
  function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(sketch.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
  }
});
