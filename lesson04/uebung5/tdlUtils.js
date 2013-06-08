// Required TDL modules.
tdl.require('tdl.programs');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.textures');
tdl.require('tdl.framebuffers');

//--------------------------------------------------
// ------------- DrawableObject --------------------
//--------------------------------------------------

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

//--------------------------------------------------
// ------------- DrawableTorus --------------------
//--------------------------------------------------

var DrawableTorus = function(program, radius, thickness, radialSubdivisions, bodySubdivisions, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createTorus(radius, thickness, radialSubdivisions, bodySubdivisions),null);
    this.color = color || null;
}

DrawableTorus.prototype = new DrawableObject();

DrawableTorus.prototype.drawObject = function(uniforms){
    this.draw(uniforms,{ model: this.transform , color: this.color});
}

//--------------------------------------------------
// ------------- DrawableCube --------------------
//--------------------------------------------------

var DrawableCube = function(program, size, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createCube(size),null);
    this.color = color || null;
}

DrawableCube.prototype = new DrawableObject();
DrawableCube.prototype.drawObject = DrawableTorus.prototype.drawObject;

//--------------------------------------------------
// ------------- DrawableSphere --------------------
//--------------------------------------------------

var DrawableSphere = function(program, size, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createSphere(size, 30, 20),null);
    this.color = color || null;
}

DrawableSphere.prototype = new DrawableObject();
DrawableSphere.prototype.drawObject = DrawableTorus.prototype.drawObject;

//--------------------------------------------------
// ------------- DrawableFlaredCube --------------------
//--------------------------------------------------

var DrawableFlaredCube = function(program, size, color){
    this.model = new tdl.models.Model(program,tdl.primitives.createFlaredCube(size * 3, size ,60),null);
    this.color = color || null;
}

DrawableFlaredCube.prototype = new DrawableObject();
DrawableFlaredCube.prototype.drawObject = DrawableTorus.prototype.drawObject;

//--------------------------------------------------
// ------------- DrawablePillar --------------------
//--------------------------------------------------

var DrawablePillar = function(program, size, color, sphereColor){
    this.size = size;
    this.elements = [];
    this.translations = [];
    for (var i=0;i<15;i++){
        //this.elements.push(new DrawableCube(program, size, color));
    }
    this.sphere = new DrawableSphere(program,size*3,sphereColor); 
    this.elements.push(this.sphere);
}

DrawablePillar.prototype.drawObject = function(uniforms){
    for (var i=0;i<this.elements.length;i++){
        var ident = mat4.identity(this.elements[i].transform);
        for (var e=0;e<this.translations.length;e++){
            mat4.translate(ident,this.translations[e]);
        }
        mat4.translate(ident,[0,i*this.size,0]);
        this.elements[i].drawObject(uniforms);
    }
}

DrawablePillar.prototype.translate = function(to){
    this.translations.push(to);
}

DrawablePillar.prototype.setSphereColor = function(color){
    this.sphere.color = color;
}



//--------------------------------------------------
// ------------- Quads -----------------------------
//--------------------------------------------------

function createPostProcessingQuad(program, framebuffer, glowmap) {
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
        glowMap: glowmap.texture,
        depthBuffer: framebuffer.depthTexture
    }),mat4.identity(mat4.create()));
};

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




