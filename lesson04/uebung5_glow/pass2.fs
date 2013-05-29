precision highp float;

    varying vec2 texCoordI;
    uniform sampler2D colorBuffer;

    uniform float blurSize;
    const int samples = 5;
    const float center = (float(samples) - 1.0) / 2.0;

    void main() {
    vec3 color = vec3(0.0);
    for (int x = 0; x < samples; x++) {
    for (int y = 0; y < samples; y++) {
    vec2 tc = texCoordI + (vec2(x, y) - center) * blurSize;
    color += texture2D(colorBuffer, tc).rgb;
    }
    }

    gl_FragColor.rgb = color / float(samples * samples);
    gl_FragColor.a = 1.0;
    }