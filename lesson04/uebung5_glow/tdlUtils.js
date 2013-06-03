// Required TDL modules.
tdl.require('tdl.programs');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.textures');
tdl.require('tdl.framebuffers');

var DrawableObject = function(model, transform) {
    this.model = model || null;
    this.transform = transform || mat4.identity(mat4.create());
};

DrawableObject.prototype.draw = function(uniforms, per) {
    if (this.model) {
        this.model.drawPrep(uniforms);
        this.model.draw(per);
    }
}

DrawableObject.prototype.rotate =function(x,y,z){
    var ident = mat4.identity(this.transform);
    mat4.rotate(ident, z,[0, 0, 1]);
    mat4.rotate(ident, y,[0, 1, 0]);
    mat4.rotate(ident, x,[1, 0, 0]);
}

DrawableObject.prototype.translate = function(to){
    mat4.translate(mat4.identity(this.transform),to);
}


var DrawableTorus = function(program, radius, thickness, radialSubdivisions, bodySubdivisions, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createTorus(radius, thickness, radialSubdivisions, bodySubdivisions),null);
    this.color = color || null;
}

DrawableTorus.prototype = new DrawableObject();

DrawableTorus.prototype.drawObject = function(uniforms){
    this.draw(uniforms,{ model: this.transform , color: this.color});
}

var DrawableCube = function(program, size, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createCube(size),null);
    this.color = color || null;
}

DrawableCube.prototype = new DrawableObject();

DrawableCube.prototype.drawObject = DrawableTorus.prototype.drawObject;

function createQuad(program, framebuffer) {
    var positions = new tdl.primitives.AttribBuffer(3, 4);
    var texCoord = new tdl.primitives.AttribBuffer(2, 4);
    var indices = new tdl.primitives.AttribBuffer(3, 2, 'Uint16Array');
    positions.push([-1, -1, 0]);
    positions.push([1, -1, 0]);
    positions.push([1, 1, 0]);
    positions.push([-1, 1, 0]);
    texCoord.push([0, 0]);
    texCoord.push([1, 0]);
    texCoord.push([1, 1]);
    texCoord.push([0, 1]);
    indices.push([0, 1, 2]);
    indices.push([2, 3, 0]);

    return new DrawableObject(new tdl.models.Model( program, {
        position: positions,
        texCoord: texCoord,
        indices: indices
    }, {
        colorBuffer: framebuffer.texture,
        depthBuffer: framebuffer.depthTexture
    }),mat4.identity(mat4.create()));
};




