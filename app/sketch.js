new p5(sketch => {
  let width = document.documentElement.scrollWidth;
  let height = document.documentElement.scrollHeight;
  let maxD = Math.min(width, height) / 2;

  let buffer = sketch.createGraphics(maxD, maxD);

  function generate() {
    sketch.blendMode(sketch.REPLACE);
    sketch.background('#000');
    sketch.blendMode(sketch.ADD);
    for (let i = 0; i < 60; i++) {
      buffer.background('#000');
      let d = maxD * sketch.random(0.2, 1);
      let c = sketch.color(sketch.random(100), 100, 100, 80)
      buffer.fill(c);
      buffer.circle(maxD / 2, maxD / 2, d);
      buffer.fill('#000');
      buffer.circle(sketch.random(maxD), sketch.random(maxD), sketch.random(0.2, 0.8) * d);
      while (sketch.random() > 0.1) {
        let a1 = sketch.random(2 * Math.PI);
        let a2 = sketch.random(2 * Math.PI);
        buffer.stroke(0);
        buffer.strokeWeight(sketch.random(1, maxD * 0.1));
        buffer.line(maxD * (Math.sin(a1) + 0.5), maxD * (Math.cos(a1) + 0.5),
          maxD * (Math.sin(a2) + 0.5), maxD * (Math.cos(a2) + 0.5));
      }
      let w = sketch.random(-d, width + d);
      let h = sketch.random(-d, height + d);
      sketch.image(buffer, w, h);
    }
  }

  sketch.preload = () => {
    /* load images, music, etc */
  }

  sketch.keyPressed = () => {
    generate();
  }

  sketch.setup = () => {
    sketch.createCanvas(width, height);
    sketch.colorMode(sketch.HSB, 100);
    buffer.noStroke();
    buffer.blendMode(sketch.BLEND);

    generate();
  }

  sketch.draw = () => {
  }
});
