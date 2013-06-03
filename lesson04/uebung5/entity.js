/*
 * Contains the entity definitions.
 */

/* 
 * Creates an entity. Entities consist of a TDL model, an initial
 * transformation and an optional behavior.
 */
var Entity = function(model, transform, behavior, properties) {
    this.model = model || null;
    this.transform = transform || mat4.identity(mat4.create());
    this.behavior = behavior || null;
    $.extend(this, properties || {});
};

/*
 * Render the model.
 */
Entity.prototype.draw = function(uniforms) {
    if (this.model) {
        this.model.drawPrep(uniforms);
        this.model.draw({ model: this.transform });
    }
}

/*
 * Simulate the entity.
 */
Entity.prototype.simulate = function(elapsed) {
    if (this.behavior)
        this.behavior.call(this, elapsed);
}

/*
 * The camera.
 */
Entity.createCamera = function(canvas, uniforms, position) {
    var pressed = {};
    var mousePos = [0, 0];
    window.addEventListener('keydown', function(event) {
        pressed[event.keyCode] = true;
    });
    window.addEventListener('keyup', function(event) {
        delete pressed[event.keyCode];
    });
    canvas.addEventListener('mousemove', function(event) {
        mousePos[0] = event.pageX - $(canvas).offset().left;
        mousePos[1] = $(canvas).height() - (event.pageY - $(canvas).offset().top);
        mousePos[0] = 2 * mousePos[0] / $(canvas).width() - 1;
        mousePos[1] = 2 * mousePos[1] / $(canvas).height() - 1;
    });

    uniforms.eyePosition = position || vec3.create([0, 1, 0]);
    uniforms.projection = mat4.create();
    uniforms.view = mat4.create();

    return new Entity(null, null, function(elapsed) {
        var lookH = -Math.atan(mousePos[0]) * 2;
        var lookV = Math.atan(mousePos[1]) * 2;

        var orientation = mat4.rotateY(mat4.identity([]), this.heading + lookH);
        var pitch = mat4.rotateX(mat4.identity([]), lookV);
        this.direction = mat4.multiplyVec4(orientation, [0, 0, -1, 0]);
        var lookat = mat4.multiplyVec4(orientation, mat4.multiplyVec4(pitch, [0, 0, -1, 0]));

        if (65 in pressed) {
            // left arrow
            vec3.add(
                uniforms.eyePosition,
                vec3.scale(
                    vec3.cross(this.up, this.direction, []),
                    this.speed * elapsed,
                    []
                )
            );
        } else if (87 in pressed) {
            // top arrow
            vec3.add(
                uniforms.eyePosition,
                vec3.scale(
                    this.direction,
                    this.speed * elapsed,
                    []
                )
            );
            this.heading += lookH * elapsed;
        } else if (68 in pressed) {
            // right arrow
            vec3.add(
                uniforms.eyePosition,
                vec3.scale(
                    vec3.cross(this.direction, this.up, []),
                    this.speed * elapsed,
                    []
                )
            );
        } else if (83 in pressed) {
            // bottom arrow
            vec3.add(
                uniforms.eyePosition,
                vec3.scale(
                    this.direction,
                    - this.speed * elapsed,
                    []
                )
            );
            this.heading += lookH * elapsed;
        }
        vec3.add(
            uniforms.eyePosition,
            lookat,
            this.target
        );

        // Calculate the perspective projection matrix.
        mat4.perspective(
            60,
            canvas.clientWidth / canvas.clientHeight,
            0.1, 20,
            uniforms.projection);

        // Calculate the viewing transfomation.
        mat4.lookAt(
            uniforms.eyePosition, this.target, this.up,
            uniforms.view);
    }, {
        heading: 0.0,
        direction: vec3.create([0, 0, -1, 0]),
        target: vec3.create([0, 1, -1]),
        up: vec3.create([0, 1, 0]),
        speed: 1,
        angularSpeed: 1
    });
};

/*
 * The donut.
 */
Entity.createDonut = function(position, program, textures) {
    return new Entity(
        new tdl.models.Model(
            program,
            tdl.primitives.addTangentsAndBinormals(
                tdl.primitives.createTorus(0.25, 0.2, 80, 80)),
            textures),
        mat4.translate(mat4.identity(mat4.create()), position),
        function(elapsed) {
            mat4.multiply(this.transform, mat4.rotateX(mat4.identity([]), elapsed / 10));
        });
};

/*
 * Ball.
 */
Entity.createBall = function(position, program, textures) {
    return new Entity(
        new tdl.models.Model(
            program,
            tdl.primitives.addTangentsAndBinormals(
                tdl.primitives.createSphere(0.5, 80, 80)),
            textures),
        mat4.translate(mat4.identity(mat4.create()), position));
};

/*
 * The floor.
 */
Entity.createFloor = function(program, textures) {
    return new Entity(
        new tdl.models.Model(
            program,
            tdl.primitives.addTangentsAndBinormals(
                tdl.primitives.createPlane(30, 30, 1, 1)),
            textures));
};

/*
 * The skybox.
 */
Entity.createSkybox = function(program, textures) {
    var prim = tdl.primitives.createCube(10);
    tdl.primitives.reorientPositions(prim.position,
        mat4.scale(mat4.identity([]), [-1, -1, -1]));

    return new Entity(
        new tdl.models.Model(
            program, prim, textures));
};

/*
 * Ball.
 */
Entity.createBox = function(position, program, textures) {
    return new Entity(
        new tdl.models.Model(
            program,
            tdl.primitives.addTangentsAndBinormals(
                tdl.primitives.createCube(1)),
            textures),
        mat4.translate(mat4.identity(mat4.create()), position));
};

Array.toAttribBuffer = function(array, numComponents, type) {
    var numElements = array.length / numComponents;
    var attribBuffer = new tdl.primitives.AttribBuffer(numComponents, numElements, type);
    var i, j;
    for (i = 0; i != numElements; i++) {
        var element = [];
        for (j = 0; j != numComponents; j++) {
            element[j] = array[i * numComponents + j];
        }
        attribBuffer.push(element);
    }
    return attribBuffer;
};

/*
 * A XY quad for multi-pass rendering.
 */
Entity.createQuad = function(program, textures) {
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
    return new Entity(
        new tdl.models.Model(
            program, {
                position: positions,
                texCoord: texCoord,
                indices: indices
            }, textures));
};

/*
 * Teapot.
 */
Entity.loadJSON = function(url, position, program, textures) {
    var entity =
        new Entity(null, mat4.translate(mat4.identity(mat4.create()), position));

    $.get(url, function(data) {
        var arrays = {
            position: Array.toAttribBuffer(data.position, 3),
            normal: Array.toAttribBuffer(data.normal, 3),
            texCoord: Array.toAttribBuffer(data.texCoord, 2),
            indices: Array.toAttribBuffer(data.indices, 3, 'Uint16Array')
        };

        Entity.normalizeCoordinates(arrays.position);

        entity.model = new tdl.models.Model(
            program,
            tdl.primitives.addTangentsAndBinormals(arrays),
            textures);
    }, 'json');

    return entity;
};

Entity.normalizeCoordinates = function(array) {
    var extents = array.computeExtents();

    var size = [];
    var i;
    for (i = 0; i != array.numComponents; i++) {
        size[i] = extents.max[i] - extents.min[i];
    }

    var scale = 2.0 / Math.max.apply(Math, size);
    var shift = [];
    for (i = 0; i != array.numComponents; i++) {
        shift[i] = -extents.max[i] + extents.min[i] / 2.0;
    }

    var e, c;
    for (e = 0; e != array.numElements; e++) {
        var element = array.getElement(e);
        for (c = 0; c != array.numComponents; c++) {
            // element[c] = (element[c] + shift[c])  * scale ;
            element[c] = element[c] * scale ;
        }
        array.setElement(e, element);
    }
};

/*
 * Load program from URL and install on provided entities. 
 */
Entity.loadProgramFromUrl = function(vsurl, fsurl, entities) {
    $.when($.get(vsurl), $.get(fsurl)).done(
        function(vs, fs) {
            try {
                var program = tdl.programs.loadProgram(vs[0], fs[0]);
                entities.map(function(entity) {
                    entity.model.setProgram(program);
                });
            } catch (e) {
                displayError('Loading "' + vsurl + '" and  "' + fsurl + '" failed:\n' + e);
            }
        }
    );
};
