// Required TDL modules.
tdl.require('tdl.programs');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.textures');
tdl.require('tdl.framebuffers');

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

// The main entry point.
function initialize() {
    // Setup the canvas widget for WebGL.
    window.canvas = document.getElementById("canvas");
    window.gl = tdl.webgl.setupWebGL(canvas);

    // Create a new framebuffer linked to a texture whenever the

    //console.log(tdl.framebuffers);
    var framebuffer = tdl.framebuffers.createFramebuffer(canvas.width, canvas.height, true);
    var backBuffer = new tdl.framebuffers.BackBuffer(canvas);

    var quadTextures = {
        colorBuffer: framebuffer.texture,
        depthBuffer: framebuffer.depthTexture
    };



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
    var torus = new tdl.models.Model(programs[pnum],tdl.primitives.createTorus(0.88,0.65,80,600),textures);
    var cube  = new tdl.models.Model(programs[pnum],tdl.primitives.createCube(100),textures);

    canvas.onmousemove = function(event){
        var t = vec3.create([-eyePosition[0], -eyePosition[1], -eyePosition[2]]);

        var width = canvas.width/2;
        var height = canvas.height/2;
        var x = (((event.x==undefined)?event.pageX:event.x)-(width))/width;
        var y = (((event.y==undefined)?event.pageY:event.y)-(height))/height;

        target = vec3.create([(-(((x>1)?1:x)* (t[2]))) * (1+eyeRadius), (-((y>1)?1:y)) * (1+eyeRadius), (((x>1)?1:x)* (t[0])) * (1+eyeRadius)]);
    }

    var walkW = false;
    var walkA = false;
    var walkS = false;
    var walkD = false;
    var walkQ = false;
    var walkE = false;

    function setSwitch(key,val){
        switch (key) {
            case "W":
                walkW = val;
                break;
            case "A":
                walkA = val;
                break;
            case "S":
                walkS = val;
                break;
            case "D":
                walkD = val;
                break;
            case "Q":
                walkQ = val;
                break;
            case "E":
                walkE = val;
                break;
        }
    }

    window.onkeydown = function(event) {
        setSwitch(String.fromCharCode(event.which),true);
    }

    window.onkeyup = function(event) {
        setSwitch(String.fromCharCode(event.which),false);
    }

    // Register a keypress-handler for shader program switching using the number
    // keys.
    window.onkeypress = function(event) {
        var n = String.fromCharCode(event.which);
        switch (n) {
            case " ":
                animate = !animate;
                break;
            case "r":
                torusConst.texCount += 1;
                break;
            case "f":
                var newTexCount = torusConst.texCount -= 1;
                torusConst.texCount = (newTexCount>=1)?newTexCount:torusConst.texCount;
                break;
        }
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

    var color = vec3.create();

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.2;
    var eyeHeight = 2;
    var eyeRadius = 5.5;
    var eyeRotated = 0;
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
        lightColors: lightColors
    };

    // Uniform variables that change for each torus in a frame.
    var torusPer = {
        model: model,
        color: color
    };

    // Uniform variables that change for each torus in a frame.
    var cubePer = {
        model: model,
        color: color
    };

    // Uniform variables that are the same for all sphere in one frame.
    var cubeConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
        lightPositions: lightPositions,
        lightColors: lightColors
    };

    var quad = Entity.createQuad(programs[0], quadTextures);
    Entity.loadProgramFromUrl('pass2.vs', 'pass2.fs', [quad]);

    // Renders one frame and registers itself for the next frame.
   function render() {
        tdl.webgl.requestAnimationFrame(render, canvas);
        if(walkW){
            eyeRadius -= 0.05;
        }else if(walkS){
            eyeRadius += 0.05;
        }
        if(walkA){
            eyeRotated -= 0.05;
        }else if(walkD){
            eyeRotated += 0.05;
        }
        if(walkQ){
            eyeHeight += 0.05;
        }else if(walkE){
            eyeHeight -= 0.05;
        }



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

        // Prepare rendering of toruses.
        torusConst.time = clock;

       framebuffer.bind();
       gl.depthMask(true);

       gl.clearColor(1.0,1.0,1.0,1.0);
       gl.clearDepth(1);

       gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
       gl.enable(gl.CULL_FACE);
       gl.enable(gl.DEPTH_TEST);

        torus.drawPrep(torusConst);
        var ident = mat4.identity(torusPer.model);
        mat4.rotate(ident, Math.sin(clock/2) * 90* Math.PI / 180,[0, 1, 0]);
        mat4.rotate(ident, Math.sin(clock/2*-1) * 90* Math.PI / 180,[1, 0, 0]);
        torusPer.color[0] = 0;
        torusPer.color[1] = 1;
        torusPer.color[2] = 0;
        torus.draw(torusPer);

        cube.drawPrep(cubeConst);
        var ident = mat4.identity(cubePer.model);
        mat4.translate(ident,[0, -52, 0])
        torusPer.color[0] = 0;
        torusPer.color[1] = 0;
        torusPer.color[2] = 1;
        cube.draw(cubePer)

       gl.depthMask(true);
       backBuffer.bind();

       gl.depthMask(false);
       gl.disable(gl.DEPTH_TEST);


       quad.draw({blurSize: 0.005});
    }

    // Initial call to get the rendering started.
    render();
}