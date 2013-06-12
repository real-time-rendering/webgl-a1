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

var GLOWMAP_SIZE = 128;
var WATERMAP_SIZE = 256;

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
    
    var waternormal = tdl.textures.loadTexture('waternormal.jpg');
    var bricktexture = tdl.textures.loadTexture('BubblyBricks-ColorMap.png');
    var bricknormals = tdl.textures.loadTexture('BubblyBricks-NormalMap.png');

    // Create the shader programs.
    var programs = createProgramsFromTags();

    var frag =  window.location.hash.substring(1);
    var pnum = frag ? parseInt(frag) : 0;

    var pillar = new DrawablePillar(programs[0], 0.2, [0,0,0] ,[0,1,0]);
    var pillarSphereColors = [];
    var pillarPositions = [];

    var max =5;
    var n = 0;
    for (var i=0;i<max;i++){
        for (var e=0;e<max;e++){
            pillarPositions.push([(i-max/2)*5 + (max/2),Math.abs(i-((max/2)-0.5)+e-((max/2)-0.5))*2+2,(e-max/2)*5 + (max/2)]);
            pillarSphereColors.push(HSBtoRGB(1-(n/(max*max)),1,1));
            n++;
        }
    }

    var waterPlane = new DrawableQuad(programs[3],
                                      30.0, 30.0,
                                      {waterMap: watermap.texture,
                                       waterNormal: waternormal} );
    var waterWell = new DrawableCube(programs[0],32.0,[0.5,0.5,0.5], {texture: bricktexture, normalmap: bricknormals});

    var size = "small";
    var cubeTextures = {
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

    var skybox = new tdl.models.Model(
        programs[4],
        tdl.primitives.createCube(-10),
        cubeTextures
    )

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

    var animate = true;
    var renderActivated = true;
    var showReflectionTex = false;

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
            case "c":
                renderActivated = !renderActivated;
                if(renderActivated){
                    render();
                }
                break;
            case "l":
                showReflectionTex = !showReflectionTex;
                if(showReflectionTex){
                    drawObjectConst.showReflectiveTex = showReflectionTex;
                }
                break;
        }
    };

    // Create some matrices and vectors now to save time later.
    var projection = mat4.create();
    var view = mat4.create();
    var model = mat4.create();
    var invModelView = mat4.create();

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
    lightPositions = [50,50,50, -50,50,50, -50,50,-50, 0,0,0];
    lightPositions = new Float32Array(lightPositions);

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.2;
    var eyeHeight = 10;
    var eyeRadius = 80;
    //var eyeRotated = 4;
    var eyeRotated = 0;

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
        waterview: 1,
        showReflectiveTex: showReflectionTex ? 1 : 0,
        invModelView: invModelView
    };

    var skyboxConst = {
        view: view,
        projection: projection,
        eyePosition: eyePosition
    };

    var skyboxPer = {
        model: model,
        color: vec3.create()
    };

    var postProcessQuad = createPostProcessingQuad(programs[1], framebuffer, glowmap, watermap);
    var quadGlowMapBlur = createQuad(programs[2], smallFramebuffer);

    // Renders one frame and registers itself for the next frame.
   function render() {
        if(renderActivated){
            tdl.webgl.requestAnimationFrame(render, canvas);
        }

        playerMovement();

        // Do the time keeping.
        var now = (new Date()).getTime() * 0.001;
        elapsedTime = (then == 0.0 ? 0.0 : now - then);
        then = now;
        if (animate) {
            clock += elapsedTime;
        }

        //render scene from under water perspective
        drawObjectConst.waterview = 1;
        watermap.bind();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        renderScene(true);
        drawObjectConst.waterview = 0;

        //enable brightpass for glow map generation
        drawObjectConst.brightpass = 0.4;
        // draw scene in small framebuffer for glowmap
        smallFramebuffer.bind();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        renderScene(false);
        //disable brightpass
        drawObjectConst.brightpass = 0.0;
        
        //create glowmap by blurring small framebuffer
        glowmap.bind();
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        var quadGlowMapBlurModel = quadGlowMapBlur.model;
        quadGlowMapBlurModel.drawPrep();
        quadGlowMapBlurModel.draw({ model: quadGlowMapBlur.transform, glowBlurSize: 0.01});
        
        //create fullscreen scene
        framebuffer.bind();
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        renderScene(true);
        
        backBuffer.bind();
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        
        //post processing
        var quadModel = postProcessQuad.model;
        quadModel.drawPrep({blurSize: 0.04, glowStrengh: 2.0});
        quadModel.draw({ model: postProcessQuad.transform });
    }

    function renderScene(renderskybox){
        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1);
     
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);

        if(renderskybox){
            gl.depthMask(false);
            gl.disable(gl.DEPTH_TEST);

            skybox.drawPrep(skyboxConst);
            mat4.translate(mat4.identity(skyboxPer.model),eyePosition);
            skybox.draw(skyboxPer);

            gl.depthMask(true);
        }
        gl.enable(gl.DEPTH_TEST);


        drawObjectConst.time = clock;
        var colval = (Math.abs(Math.sin(clock/2)));

        for (var i=0;i<max*max;i++){
            pillar.setSphereBrightness(colval);
            pillar.setSphereColor(pillarSphereColors[i]);

            pillar.translate(pillarPositions[i]);
            //pillar.rotate(0,((clock*20)%360)* Math.PI / 180,0);

            pillar.drawObject(drawObjectConst);
        }

        waterWell.drawObject(drawObjectConst);
        waterWell.translate([0,-16.1,0]);


        if(drawObjectConst.waterview == 0){
            waterPlane.drawObject(drawObjectConst);
        }
    }
    
    //-----------------------------------------------

    function playerMovement(){
        if(walkW){
            eyeRadius -= 0.15;
        }else if(walkS){
            eyeRadius += 0.15;
        }
        if(walkA){
            eyeRotated -= 0.15;
        }else if(walkD){
            eyeRotated += 0.15;
        }
        if(walkQ){
            eyeHeight += 0.15;
        }else if(walkE){
            eyeHeight -= 0.15;
        }

        // Calculate the current eye position.
        eyePosition[0] = Math.sin(eyeRotated * eyeSpeed) * eyeRadius/2;
        eyePosition[1] = eyeHeight;
        eyePosition[2] = Math.cos(eyeRotated * eyeSpeed) * eyeRadius/2;

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
        
        var invModel = mat3.create();
        mat4.toInverseMat3(model, invModel);
        invModel = mat3.toMat4(invModel);
        mat4.transpose(invModel);
        
        var invProj = mat3.create();
        mat4.toInverseMat3(model, invProj);
        invProj = mat3.toMat4(invProj);
        mat4.transpose(invProj);
        
        var invView = mat3.create();
        mat4.toInverseMat3(model, invView);
        invView = mat3.toMat4(invView);
        mat4.transpose(invView);
        
        invModelView = mat4.create();
        mat4.multiply(invModelView, invProj,  invModelView);
        mat4.multiply(invModelView, invView,  invModelView);
        mat4.multiply(invModelView, invModel, invModelView);
    }

    // Initial call to get the rendering started.
    render();
}