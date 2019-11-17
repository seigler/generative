new p5(sketch => {
  sketch.disableFriendlyErrors = true;
  // reused dimensions and a seed
  let seed, width, height, noiseResolution, overdraw, blurQuality;
  const layers = {}; // offscreen layers
  const shaders = {}; // shaders
  const lib = {}; // libraries

  sketch.preload = () => {
    shaders.whiteNoise = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/white-noise.frag'
    );
    shaders.displacement = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/displacement.frag'
    );
    shaders.blurH = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/blur-two-pass.frag'
    );
    shaders.blurV = sketch.loadShader(
      '../shaders/base.vert',
      '../shaders/blur-two-pass.frag'
    );
    lib.voronoi = new Voronoi()
  }

  sketch.setup = () => {
    filenamePrefix = 'seigler-p5-4-lenses-';
    overdraw = 0.1;
    width = Math.floor(sketch.windowWidth * (1 + overdraw));
    height = Math.floor(sketch.windowHeight * (1 + overdraw));
    noiseResolution = [0.2, 0.1, 0.05, 2];
    blurQuality = 1;

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

    layers.displacement = sketch.createGraphics(width, height, sketch.WEBGL);

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
    // sketch.background(0.5);

    let stripeAngle = sketch.random(0, Math.PI);
    let stripeWidth = Math.min(width, height) / sketch.random(10, 80);
    let stripeLength = Math.max(width, height) * Math.SQRT2;
    let numStripes = Math.ceil(Math.SQRT2 * stripeLength / stripeWidth);
    let stripeHue = sketch.random();
    let ox = width/2, oy = height/2;
    let dx = Math.cos(stripeAngle) * stripeLength / 2;
    let dy = Math.sin(stripeAngle) * stripeLength / 2;
    layers.buffer.strokeCap(sketch.SQUARE);
    for (let i = Math.ceil(numStripes / 2); i > 0; i--) {
      layers.buffer.stroke(stripeHue, 0.5, 0.2 + 0.1 * (i % 2));
      layers.buffer.strokeWeight((i * 2 - 1) * stripeWidth);
      layers.buffer.line(ox - dx, oy - dy, ox + dx, oy + dy);
    }

    // square pixels per circle, helps with gridding
    sketch.blendMode(sketch.BLEND);
    let unit = Math.min(width, height) / Math.round(sketch.random(3, 10));
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
        + 1 * n0 * unit * Math.cos(Math.PI * 2 * flattenPerlin(n1))
      );
      point.y = (
        height / (rows - 1) * row
        + 1 * n0 * unit * Math.sin(Math.PI * 2 * flattenPerlin(n1))
      );
    });
    let bbox = {
      xl: 0 - unit / 2,
      xr: width + unit / 2,
      yt: 0 - unit / 2,
      yb: height + unit / 2
    };
    let diagram = lib.voronoi.compute(gridPoints, bbox);

    // let's draw cells
    layers.cells.background(0.5);
    diagram.cells.forEach(cell => {
      if (cell.halfedges.length >= 3) {
        layers.cells.fill(cell.site.noise[2]);
        layers.cells.beginShape();
        for(let i = 0; i < cell.halfedges.length + 1; i++) {
          const he = cell.halfedges[i % cell.halfedges.length];
          const {x: ax, y: ay} = he.getStartpoint()
          const {x: bx, y: by} = he.getEndpoint()
          if (i === 0) {
            layers.cells.vertex(
              sketch.lerp(sketch.lerp(ax, bx, 0.5), cell.site.x, 0.1),
              sketch.lerp(sketch.lerp(ay, by, 0.5), cell.site.y, 0.1)
            );
            first = false;
          } else {
            // check angular edge length
            layers.cells.quadraticVertex(
              sketch.lerp(ax, cell.site.x, 0.1),
              sketch.lerp(ay, cell.site.y, 0.1),
              sketch.lerp(sketch.lerp(ax, bx, 0.5), cell.site.x, 0.1),
              sketch.lerp(sketch.lerp(ay, by, 0.5), cell.site.y, 0.1)
            );
          }
        }
        layers.cells.endShape();
      }
    });

    // blur the cells
    let blurSize = unit / 300;
    for (let pass = 0; pass < blurQuality; pass++) {
      let radius = (blurQuality - pass) * blurSize / blurQuality;
      layers.blur1.shader(shaders.blurH);
      shaders.blurH.setUniform('tex0', pass == 0 ? layers.cells : layers.blur2);
      shaders.blurH.setUniform('texelSize', [radius/width, radius/height]);
      shaders.blurH.setUniform('direction', [1.0, 0.0]);
      layers.blur1.rect(0, 0, width, height);
      layers.blur2.shader(shaders.blurV);
      shaders.blurV.setUniform('tex0', layers.blur1);
      shaders.blurV.setUniform('texelSize', [radius/width, radius/height]);
      shaders.blurV.setUniform('direction', [0.0, 1.0]);
      layers.blur2.rect(0, 0, width, height);
    }

    layers.cells.image(layers.blur2, 0, 0, width, height);

    layers.displacement.shader(shaders.displacement);
    shaders.displacement.setUniform('u_src', layers.buffer);
    shaders.displacement.setUniform('u_map', layers.cells);
    shaders.displacement.setUniform('u_intensity', 10 / unit);
    layers.displacement.rect(0, 0, width, height);
    sketch.blendMode(sketch.BLEND);
    sketch.image(
      layers.displacement,
      Math.floor(-width * overdraw / 2),
      Math.floor(-height * overdraw / 2)
    );

    layers.noise.shader(shaders.whiteNoise);
    shaders.whiteNoise.setUniform('u_resolution', [width, height]);
    shaders.whiteNoise.setUniform('u_alpha', 0.05);
    layers.noise.rect(0, 0, width, height);
    sketch.blendMode(sketch.OVERLAY);
    sketch.image(layers.noise, 0, 0);

    // sketch.stroke(0);
    // sketch.strokeWeight(4);
    // diagram.vertices.forEach(vertex => {
    //   sketch.point(vertex.x, vertex.y);
    // });

    // diagram.edges.forEach(({va, vb}) => {
    //   sketch.line(
    //     va.x,
    //     va.y,
    //     vb.x,
    //     vb.y
    //   );
    // });

    // sketch.stroke('#E00');
    // gridPoints.forEach(({x, y}) => {
    //   sketch.point(x, y);
    // });
  }

  // Fisher-Yates shuffle
  function shuffle(array) {
    var i = 0, j = 0, temp = null;

    for (i = array.length - 1; i > 0; i -= 1) {
      j = Math.floor(sketch.random() * (i + 1));
      temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
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
