// Required TDL modules.
tdl.require('tdl.programs');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.textures');

// Loads all shader programs from the DOM and return them in an array.
function createProgramsFromTags() {
    var vs = $('script[id^="vs"]');
    var fs = $('script[id^="fs"]');
    var programs = [];
    for (var i = 0; i != vs.length; i++)
        programs[i] = tdl.programs.loadProgram(vs[i].text, fs[i].text)
    return programs;
}

// Registers an onload handler.
window.onload = function() {
    try {
        initialize();
    } catch (e) {
        $('#error').text(e.message || e);
        $('#error').css('display', 'block');
    }
}

// Recalculate per face normals for a triangle mesh.
function perFaceNormals(arrays) {
    var n = arrays.indices.numElements;
    var idx = arrays.indices;
    //var pos = arrays.position;
    var nrm = arrays.normal;
    for (var ti = 0; ti != n; ti++) {
        var i = idx.getElement(ti);
        var normal = nrm.getElement(i[0]);
        nrm.setElement(i[1], normal);
        nrm.setElement(i[2], normal);
    }
    return arrays;
};

// The main entry point.
function initialize() {
    // Setup the canvas widget for WebGL.
    window.canvas = document.getElementById("canvas");
    window.gl = tdl.webgl.setupWebGL(canvas);

    // Create the shader programs.
    var programs = createProgramsFromTags();

    // Load textures.
    var textures = {
        earth: tdl.textures.loadTexture('earth-2k-land-ocean-noshade.png')
    };

    var frag =  window.location.hash.substring(1);
    var pnum = frag ? parseInt(frag) : 0;

    // Create a torus mesh that initialy is renderd using the first shader
    // program.
    var torus = new tdl.models.Model(
        programs[pnum],
        tdl.primitives.createTorus(0.88,0.65,80,600),textures);

    // Register a keypress-handler for shader program switching using the number
    // keys.
    window.onkeypress = function(event) {
        var n = String.fromCharCode(event.which);
        if (n == "s")
            animate = !animate;
        else
            torus.setProgram(programs[n % programs.length]);
    };

    // Create some matrices and vectors now to save time later.
    var projection = mat4.create();
    var view = mat4.create();
    var model = mat4.create();

    // Uniforms for lighting.
    //var lightPosition = vec3.create([10, 10, 10]);
    var LIGHT_NUM = 4;
    //var lightPos = [10, 10, 10];
    var lightPositions = [];
    //var lightColors = [];
    for(var i=0; i<LIGHT_NUM; i++){
        lightPositions = lightPositions.concat([10, 10, 10]);
    }
    var lightColors = [1.0,0.0,0.0, 0.0,1.0,0.0, 0.0,0.0,1.0, 1.0,1.0,1.0];
    lightPositions = [10,10,10, 0,10,10, 10,0,10, 0,0,0];
    lightPositions = new Float32Array(lightPositions);

    /*var lightIntensity = vec3.create([0.5,
     0.5,
     0.5]);  */
    var color = vec3.create();

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.2;
    var eyeHeight = 2;
    var eyeRadius = 3.5;
    var animate = true;

    // Animation needs accurate timing information.
    var elapsedTime = 0.0;
    var then = 0.0;
    var clock = 0.0;

    // Uniform variables that are the same for all sphere in one frame.
    var torusConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
        lightPositions: lightPositions,
        lightColors: lightColors,
        time: clock
    };

    // Uniform variables that change for each torus in a frame.
    var torusPer = {
        model: model,
        color: color
    };

    // Renders one frame and registers itself for the next frame.
    function render() {
        tdl.webgl.requestAnimationFrame(render, canvas);

        // Do the time keeping.
        var now = (new Date()).getTime() * 0.001;
        elapsedTime = (then == 0.0 ? 0.0 : now - then);
        then = now;
        if (animate) {
            clock += elapsedTime;
        }

        // Calculate the current eye position.
        eyePosition[0] = Math.sin(clock * eyeSpeed) * eyeRadius;
        eyePosition[1] = eyeHeight;
        eyePosition[2] = Math.cos(clock * eyeSpeed) * eyeRadius;

        // Setup global WebGL rendering behavior.
        gl.viewport(0, 0, canvas.width, canvas.width * 0.9);
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Calculate the perspective projection matrix.
        mat4.perspective(
            60,
            canvas.clientWidth / canvas.clientHeight,
            0.1, 10,
            projection);

        // Calculate the viewing transfomation.
        mat4.lookAt(
            eyePosition, target, up,
            view);

        // Prepare rendering of toruses.
        torusConst.time = clock;
        torus.drawPrep(torusConst);

        //console.log();

        var ident = mat4.identity(torusPer.model);
        mat4.rotate(ident,((clock*20)%360)* Math.PI / 180,[1, 0, 0]);
        mat4.translate(ident, [0, 0, 0]);
        torusPer.color[0] = 0;
        torusPer.color[1] = 1;
        torusPer.color[2] = 0;
        torus.draw(torusPer);
    }

    // Initial call to get the rendering started.
    render();
}