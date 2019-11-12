precision mediump float;

// lets grab texcoords just for fun
varying vec2 vTexCoord;

// our texture and image coming from p5
uniform sampler2D u_src;
uniform sampler2D u_map;

// how much to displace by (controlled by mouse)
uniform float u_intensity;

void main() {

  vec2 uv = vTexCoord;

  // get the displacement map as a vec4 using texture2D
  vec4 mapTex = texture2D(u_map, uv);

  // the texture is loaded upside down and backwards by default so lets flip it
  // uv = 1.0 - uv;
  uv[1] = 1.0 - uv[1];

  // lets get the average color of the rgb values
  float avg = dot(mapTex.rgb, vec3(0.33333));

  // then spread it between -1 and 1
  avg = avg * 2.0 - 1.0;

  // we will displace the image by the average color times the amt of displacement 
  float disp = avg * u_intensity;

  // displacement works by moving the texture coordinates of one image with the colors of another image
  // add the displacement to the texture coordinages
  vec4 srcTex = texture2D(u_src, uv + disp);

  // output the image
  gl_FragColor = srcTex;
}
