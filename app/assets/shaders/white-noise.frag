precision mediump float;

uniform vec2 u_resolution;
uniform float u_alpha;

highp float random(vec2 co) {
  highp float a = 12.9898;
  highp float b = 78.233;
  highp float c = 43758.5453;
  highp float dt= dot(co.xy, vec2(a, b));
  highp float sn= mod(dt, 3.14);
  return fract(sin(sn) * c);
}

void main() {
  vec2 st = gl_FragCoord.xy/u_resolution.xy;

  float rnd = random(st);

  gl_FragColor = vec4(vec3(rnd), u_alpha);
}
