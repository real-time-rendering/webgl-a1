attribute vec4 position;
    varying vec2 texCoordI;

    void main() {
    texCoordI = (position.xy + 1.0) / 2.0;
    gl_Position = position;
    }