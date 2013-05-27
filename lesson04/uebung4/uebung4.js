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

function makeTextures(textureVal,useSmallTextures,normalmapVal){

    var size = (useSmallTextures)?"small":"large";

    var textures = {
        //earth: tdl.textures.loadTexture('earth-2k-land-ocean-noshade.png'),
        normalmap: tdl.textures.loadTexture('normalmap'+normalmapVal+'.jpg'),
        cubemap: tdl.textures.loadTexture(
            [
                'cubemap/'+textureVal+'/'+size+'/posx.jpg', //positive x
                'cubemap/'+textureVal+'/'+size+'/negx.jpg', //negative x
                'cubemap/'+textureVal+'/'+size+'/posy.jpg', //positive y
                'cubemap/'+textureVal+'/'+size+'/negy.jpg', //negative y
                'cubemap/'+textureVal+'/'+size+'/posz.jpg', //positive z
                'cubemap/'+textureVal+'/'+size+'/negz.jpg'  //negative z
            ]
        )
    };
    return textures;
}

var textureVal = 1;
var useSmallTextures = true;
var normalmapVal = 1;

// The main entry point.
function initialize() {

    // Setup the canvas widget for WebGL.
    window.canvas = document.getElementById("canvas");
    window.gl = tdl.webgl.setupWebGL(canvas);

    // Create the shader programs.
    var programs = createProgramsFromTags();



    // Load textures.
    var textures = makeTextures(textureVal,useSmallTextures,normalmapVal);

    var frag =  window.location.hash.substring(1);

    // Create a torus mesh that initialy is renderd using the first shader
    // program.
    var torus = new tdl.models.Model(
        programs[0],
        tdl.primitives.addTangentsAndBinormals(
            tdl.primitives.createSphere(1, 100, 100)
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
        var t = vec3.create([-eyePosition[0], -eyePosition[1], -eyePosition[2]]);

        var width = canvas.width/2;
        var height = canvas.height/2;
        var x = (((event.x==undefined)?event.pageX:event.x)-(width))/width;
        var y = (((event.y==undefined)?event.pageY:event.y)-(height))/height;

        target = vec3.create([(-(((x>1)?1:x)* (t[2]))) * (1+eyeRadius), (-((y>1)?1:y)) * (1+eyeRadius), (((x>1)?1:x)* (t[0])) * (1+eyeRadius)]);
    }

    function resetTexture(){
        var tex = makeTextures(textureVal, useSmallTextures, normalmapVal);
        torus.textures =  tex;
        skybox.textures = tex;
    }

    window.onkeypress = function(event) {
        var n = String.fromCharCode(event.which);
        var normalmapKey = ['z','u', 'i', 'o', 'p'];
        var bitmapKey = ['1', '2', '3'];

        if(event.which==13){
            useSmallTextures = !useSmallTextures;
            resetTexture();
            return;
        }

        var pos = normalmapKey.indexOf(n);
        if(pos!=-1){
            normalmapVal = pos;
            resetTexture();
            return;
        }

        var pos = bitmapKey.indexOf(n);
        if(pos!=-1){
            textureVal = pos+1;
            resetTexture();
            return;
        }

        switch (n) {
            case " ":
                animate = !animate;
                break;
            case "w":
                eyeRadius -= 0.1;
                break;
            case "a":
                eyeRotated -= 0.1;
                break;
            case "s":
                eyeRadius += 0.1;
                break;
            case "d":
                eyeRotated += 0.1;
                break;
            case "e":
                eyeHeight += 0.1;
                break;
            case "q":
                eyeHeight -= 0.1;
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
    var LIGHT_NUM = 3;
    var lightPositions = [];

    for(var i=0; i<LIGHT_NUM; i++){
        lightPositions = lightPositions.concat([50, 50, 50]);
    }
    lightPositions = [50,50,50, 50,50,-50, -50,50,-50];
    lightPositions = new Float32Array(lightPositions);

    var color = vec3.create();

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.8;
    var eyeHeight = 0;
    var eyeRadius = 3;
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
        texCount: 1
    };

    var skyboxConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
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
        mat4.translate(mat4.identity(skyboxPer.model),eyePosition);
        skybox.draw(skyboxPer);

        gl.depthMask(true);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Prepare rendering of toruses.
        torus.drawPrep(torusConst);

        var ident = mat4.identity(torusPer.model);
        mat4.translate(ident, [0, 0, 0]);

        mat4.rotate(ident, Math.sin(clock/2) * 90* Math.PI / 180,[0, 1, 0]);
        mat4.rotate(ident, Math.sin(clock/2*-1) * 90* Math.PI / 180,[1, 0, 0]);
        torus.draw(torusPer);
    }

    // Initial call to get the rendering started.
    render();
}