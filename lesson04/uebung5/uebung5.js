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

var WATERMAP_SIZE = 128;

// The main entry point.
function initialize() {


    // Setup the canvas widget for WebGL.
    window.canvas = document.getElementById("canvas");
    window.gl = tdl.webgl.setupWebGL(canvas);

    // Create a new framebuffer linked to a texture whenever the
    var framebuffer = tdl.framebuffers.createFramebuffer(canvas.width, canvas.height, true);
    var smallFramebuffer = tdl.framebuffers.createFramebuffer(GLOWMAP_SIZE, GLOWMAP_SIZE, true);
    var glowmap = tdl.framebuffers.createFramebuffer(GLOWMAP_SIZE, GLOWMAP_SIZE, true);
    var watermap = tdl.framebuffers.createFramebuffer(WATERMAP_SIZE, WATERMAP_SIZE, true);
    var backBuffer = new tdl.framebuffers.BackBuffer(canvas);

    // Create the shader programs.
    var programs = createProgramsFromTags();

    var frag =  window.location.hash.substring(1);
    var pnum = frag ? parseInt(frag) : 0;

    // Create a torus mesh that initialy is renderd using the first shader
    // program.
    var torus = new DrawableTorus(programs[0], 0.88,0.65,20,80, [0,1,0]);

<<<<<<< HEAD
    var lollies = [];
    var max =5;
    var n = 0;
    for (var i=0;i<max;i++){
        for (var e=0;e<max;e++){
            lollies.push(new DrawablePillar(programs[pnum],0.2,[1,1,1],HSBtoRGB(1-(n/(max*max)),1,1)));
            n++;
        }
    }
=======
    var pillar = new DrawablePillar(programs[0],0.2,[1,1,1],[1,0,0]);
    var pillar2 = new DrawablePillar(programs[0],0.2,[1,1,1],[0,1,0]);
    pillar2.translate([2,0,0]);
    var pillar3 = new DrawablePillar(programs[0],0.2,[1,1,1],[0,0,1]);
    pillar3.translate([-2,0,0]);
    
    waterPlane = new DrawableQuad(programs[3], 10.0, 10.0, [1,1,1] );
    
    var drawableObjects = [pillar, pillar2, pillar3, waterPlane]; //, cube];
>>>>>>> c949ecc10f59a73b724f01efcd35cf055d63e8d1

    var drawableObjects = [].concat(lollies);

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
                drawObjectConst.texCount += 1;
                break;
            case "f":
                var newTexCount = drawObjectConst.texCount -= 1;
                drawObjectConst.texCount = (newTexCount>=1)?newTexCount:drawObjectConst.texCount;
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
    //var lightColors = [1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0];
    lightPositions = [10,10,10, 0,10,10, 10,0,10, 0,0,0];
    lightPositions = new Float32Array(lightPositions);

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.2;
    var eyeHeight = 10;
    var eyeRadius = 20;
    var eyeRotated = 4;
    var animate = true;

    // Animation needs accurate timing information.
    var elapsedTime = 0.0;
    var then = 0.0;
    var clock = 0.0;

    // Uniform variables that are the same for all sphere in one frame.
    var drawObjectConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition,
        lightPositions: lightPositions,
        lightColors: lightColors,
        brightpass: 0.5,
        time: clock,
    };

    var postProcessQuad = createPostProcessingQuad(programs[1], framebuffer, glowmap);
    var quadGlowMapBlur = createQuad(programs[2], smallFramebuffer);

    // Renders one frame and registers itself for the next frame.
   function render() {
        tdl.webgl.requestAnimationFrame(render, canvas);

        playerMovement();

        // Do the time keeping.
        var now = (new Date()).getTime() * 0.001;
        elapsedTime = (then == 0.0 ? 0.0 : now - then);
        then = now;
        if (animate) {
            clock += elapsedTime;
        }

        drawObjectConst.brightpass = 0.4;
        smallFramebuffer.bind();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        renderScene();
        
        drawObjectConst.brightpass = 0.0;
        
        glowmap.bind();
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        var quadGlowMapBlurModel = quadGlowMapBlur.model;
        quadGlowMapBlurModel.drawPrep();
        quadGlowMapBlurModel.draw({ model: quadGlowMapBlur.transform, glowBlurSize: 0.01});
        
        framebuffer.bind();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        animateScene();
        renderScene();
        
        backBuffer.bind();
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        
        var quadModel = postProcessQuad.model;
        quadModel.drawPrep({blurSize: 0.02, glowStrengh: 2.0});
        quadModel.draw({ model: postProcessQuad.transform });
    }

    function animateScene(){
<<<<<<< HEAD
        var colval = (Math.abs(Math.sin(clock/2)));
        var len = lollies.length;

        for (var i=0;i<len;i++){
            lollies[i].setSphereBrightness(colval);
        }
=======
        drawObjectConst.time = clock;
        var colval = (Math.sin(clock)/2)+0.5;
        pillar.setSphereColor([colval,0,0]);
        pillar2.setSphereColor([0,colval,0]);
        pillar3.setSphereColor([0,0,colval]);
>>>>>>> c949ecc10f59a73b724f01efcd35cf055d63e8d1
    }

    function renderScene(){
        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1);
     
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

<<<<<<< HEAD
        //reposition
        var counter = 0;
        for (var i=0;i<max;i++){
            for (var e=0;e<max;e++){
                lollies[counter].translate([(i-max/2)*5,((max-e)+(max-i))-3,(e-max/2)*5]);
                counter++;
            }
        }

=======
        
>>>>>>> c949ecc10f59a73b724f01efcd35cf055d63e8d1

        for (var i=0;i<drawableObjects.length;i++){
            drawableObjects[i].drawObject(drawObjectConst);
        }
    }
    
    //-----------------------------------------------

    function playerMovement(){
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
    }

    // Initial call to get the rendering started.
    render();
}