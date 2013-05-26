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

    var useSmallTextures = true;
    var size = (useSmallTextures)?"small":"large";

    // Load textures.
    var textures = {
        //earth: tdl.textures.loadTexture('earth-2k-land-ocean-noshade.png'),
        normalmap: tdl.textures.loadTexture('crossnrm.jpg'),
        cubemap: tdl.textures.loadTexture(
            [
            'cubemap/'+size+'/posx.jpg', //positive x
            'cubemap/'+size+'/negx.jpg', //negative x
            'cubemap/'+size+'/posy.jpg', //positive y
            'cubemap/'+size+'/negy.jpg', //negative y
            'cubemap/'+size+'/posz.jpg', //positive z
            'cubemap/'+size+'/negz.jpg'  //negative z
            ]
        )
    };
    
    var frag =  window.location.hash.substring(1);
    var pnum = frag ? parseInt(frag) : 0;

    // Create a torus mesh that initialy is renderd using the first shader
    // program.
    var torus = new tdl.models.Model(
        programs[0],
        //tdl.primitives.createTorus(0.28,0.15,30,20),
        tdl.primitives.addTangentsAndBinormals(
            tdl.primitives.createSphere(1, 30, 30)
        ),
        textures);
    
    var skybox = new tdl.models.Model(
        programs[1],
        tdl.primitives.createCube(-10),
        textures
    )

    // Register a keypress-handler for shader program switching using the number
    // keys.

    canvas.onmousemove = function(event){
        var t = vec3.normalize(vec3.scale(eyePosition,-1));

        var width = canvas.width/2;
        var height = canvas.height/2;
        var x = (event.x-(width))/width;
        var y = (event.y-(height))/height;

        var xx = -(((x>1)?1:x)* (t[2]));
        var yy = -((y>1)?1:y);
        var zz = ((x>1)?1:x)* (t[0]);

        target = vec3.create([xx, yy, zz]);
        vec3.normalize(target);
    }

    window.onkeypress = function(event) {
        var n = String.fromCharCode(event.which);

        switch (n) {
            case "w":
                eyeRadius -= 0.1;
                break;
            case "a":
                eyeRotated += 0.1;
                break;
            case "s":
                eyeRadius += 0.1;
                break;
            case "d":
                eyeRotated -= 0.1;
                break;
        }
    };

    // Create some matrices and vectors now to save time later.
    var projection = mat4.create();
    var view = mat4.create();
    var skyboxview = mat4.create();
    var model = mat4.create();

    // Uniforms for lighting.
    //var lightPosition = vec3.create([10, 10, 10]);
    var LIGHT_NUM = 3;
    //var lightPos = [10, 10, 10];
    var lightPositions = [];
    //var lightColors = [];
    for(var i=0; i<LIGHT_NUM; i++){
        lightPositions = lightPositions.concat([50, 50, 50]);
    }
    lightPositions = [50,50,50, 50,50,-50, -50,50,-50];
    lightPositions = new Float32Array(lightPositions);

    /*var lightIntensity = vec3.create([0.5,
     0.5,
     0.5]);  */
    var color = vec3.create();

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.8;
    var eyeHeight = 0;
    var eyeRadius = 2;
    var eyeRotated = 0;
    var animate = true;

    // Animation needs accurate timing information.
    var elapsedTime = 0.0;
    var then = 0.0;
    var clock = 0.0;
    var showToon = true;

    // Uniform variables that are the same for all sphere in one frame.
    var torusConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
        lightPositions: lightPositions,
        time: clock
    };
    
    var skyboxConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
        lightPositions: lightPositions,
        time: clock
    };

    // Uniform variables that change for each torus in a frame.
    var torusPer = {
        model: model,
        color: color
    };
    
    var skyboxPer = {
        model: model,
        color: vec3.create()
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
        eyePosition[0] = Math.sin(eyeRotated * eyeSpeed) * eyeRadius;
        eyePosition[1] = eyeHeight;
        eyePosition[2] = Math.cos(eyeRotated * eyeSpeed) * eyeRadius;



        // Setup global WebGL rendering behavior.
        gl.viewport(0, 0, canvas.width, canvas.width * 0.9);
        gl.colorMask(true, true, true, true);
        gl.depthMask(true);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        // Calculate the perspective projection matrix.
        mat4.perspective(
            60,
            canvas.clientWidth / canvas.clientHeight,
            0.1, 100,
            projection);

        // Calculate the viewing transfomation.
        mat4.lookAt(
            eyePosition, target, up,
            view);

        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        skybox.drawPrep(skyboxConst);
        skybox.draw(skyboxPer);
        gl.depthMask(true);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Prepare rendering of toruses.
        torusConst.time = clock;
        torus.drawPrep(torusConst);

        //console.log();

        var ident = mat4.identity(torusPer.model);
        //mat4.rotate(ident, 0 ,[0, 1, 0]);
        mat4.translate(ident, [0, 0, 0]);
        torus.draw(torusPer);
        
        
    }

    // Initial call to get the rendering started.
    render();
}