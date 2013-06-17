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

window.onload = function() {
    $(window).resize(function() {
        var width = $('#canvas-container').innerWidth();
        $('#canvas').attr('width', width).attr('height', width*0.6);
    });
    $(window).resize();
    try {
        initialize();
    } catch(e) {
        $('#error').text(e.message || e);
        $('#error').css('display', 'block');
    }
}

function parseHash(){
    var hashstring = window.location.hash.substring(1)
    var kwargs = {};
    var args = hashstring.split(':');
    for(var i=0; i<args.length; i++){
        if(args[i].length == 0){
            continue;
        }
        a = args[i].split('=');
        kwargs[a[0]] = parseInt(a[1]);
    }
    return kwargs;
}

function reloadWindow(){
    var url = window.location.protocol + '//' + window.location.host+ window.location.pathname;
    url += '#'
    url += 'GLOWMAP_SIZE='+$('#glowmapsize').val();
    url += ':'
    url += 'WATERMAP_SIZE='+$('#watermapsize').val();
    url += ':'
    window.location = url;
    window.location.reload();
}

var options = parseHash();
var GLOWMAP_SIZE = options.GLOWMAP_SIZE || 128;
var WATERMAP_SIZE = options.WATERMAP_SIZE || 256;
var BRIGHT_PASS = 0.5;
var GLOW_BLUR_SIZE = 0.01;
var GLOW_STRENGTH = 2.0;
var WATER_DENSITY = 0.00;
var REFLECTION_ANGLE_MULTIPLICATOR = 30.0;
var size = "small";

var RENDER_WATER = true;
var RENDER_WATER_REFLECTION = true;
var RENDER_WATER_REFLECTION_NORMALMAP = true;
var RENDER_WATER_REFRACTION = true;
var RENDER_WATER_REFRACTION_NORMALMAP = true;
var SHOW_WATER = true;
var SHOW_WATER_DEPTH = false;
var RENDER_BLOOM = true;
var SHOW_BLOOM = true;
var RENDER_SCENE = true;
var SHOW_SCENE = true;
var RENDER_SKYBOX = true;
var GLOWINGWELL = true;
var BLOOM_BACKGROUND = false;

var genViewTarget = function (x,y, eyePosition, eyeRadius){
    var t = vec3.create([-eyePosition[0], -eyePosition[1], -eyePosition[2]]);
    var width = canvas.width/2;
    var height = canvas.height/2;
    var x = (x-(width))/width;
    var y = (y-(height))/height;
    x*=(1/eyeRadius);
    y*=0.25;
    return vec3.create([(-(((x>1)?1:x)* (t[2]))) * (1+eyeRadius), (-((y>1)?1:y)) * (1+eyeRadius), (((x>1)?1:x)* (t[0])) * (1+eyeRadius)]);
}

/*
 * http://stackoverflow.com/questions/1125084/how-to-make-in-javascript-full-screen-windows-stretching-all-over-the-screen
 */
function requestFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT) || element.mozRequestFullScreen || element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}

// The main entry point.
function initialize() {
    // Setup the canvas widget for WebGL.
    window.canvas = document.getElementById("canvas");
    window.gl = tdl.webgl.setupWebGL(canvas);

    // Create a new framebuffer linked to a texture whenever the
    var framebuffer = tdl.framebuffers.createFramebuffer(canvas.width, canvas.height, true);
    var smallFramebuffer = tdl.framebuffers.createFramebuffer(GLOWMAP_SIZE, GLOWMAP_SIZE, true);
    var glowmap = tdl.framebuffers.createFramebuffer(GLOWMAP_SIZE, GLOWMAP_SIZE, true);
    var refractionmap = new tdl.framebuffers.createFramebuffer(WATERMAP_SIZE, WATERMAP_SIZE, true);
    var watermap = tdl.framebuffers.createFramebuffer(WATERMAP_SIZE, WATERMAP_SIZE, true);
    var backBuffer = new tdl.framebuffers.BackBuffer(canvas);
    
    var waternormal = tdl.textures.loadTexture('waternormal.jpg');
    var bricktexture = tdl.textures.loadTexture('brick-tex.png');
    var bricknormals = tdl.textures.loadTexture('brick-nrm.png');

    // Create the shader programs.
    var programs = createProgramsFromTags();

    var frag =  window.location.hash.substring(1);
    var pnum = frag ? parseInt(frag) : 0;

    var pillar = new DrawablePillar(programs[0], 0.4, [0,0,0] ,[0,1,0]);
    var pillarSphereColors = [];
    var pillarPositions = [];

    var animate = true;
    var mouseView = true;
    var renderActivated = true;
    var showReflectionTex = false;

    var max =5;
    var n = 0;
    for (var i=0;i<max;i++){
        for (var e=0;e<max;e++){
            pillarPositions.push([(i-max/2)*5*0.8 + (max/2),Math.abs(i-((max/2)-0.5)+e-((max/2)-0.5))*2-9,((e-max/2)*5 + (max/2))*0.8]);
            pillarSphereColors.push(HSBtoRGB(1-(n/(max*max)),1,1));
            n++;
        }
    }

    var postProcessQuad = createPostProcessingQuad(programs[1], framebuffer, glowmap, watermap);
    var quadGlowMapBlur = createQuad(programs[2], smallFramebuffer);

    var waterPlane = new DrawableQuad(programs[3],
                                      30.0, 30.0,
                                      {waterMap: watermap.texture,
                                       waterNormal: waternormal,
                                       sceneTexture: refractionmap.texture} );
    var waterWell1 = new DrawableCuboid(programs[0],1.5,32.0,32.0,[0.5,0.5,0.5], {texture: bricktexture, normalmap: bricknormals});
    var waterWell2 = new DrawableCuboid(programs[0],32.0,32.0,1.5,[0.5,0.5,0.5], {texture: bricktexture, normalmap: bricknormals});
    var waterWell3 = new DrawableQuad(programs[0],
                                      30.0, 30.0,
                                      {texture: bricktexture,
                                       normalmap: bricknormals} );

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

    canvas.addEventListener("click", function() {
        mouseView = !mouseView;
    });

    canvas.addEventListener('dblclick', function(){
        requestFullScreen(document.body);
    });

    canvas.onmousemove = function(event){
        if (mouseView){
            target = genViewTarget(((event.x==undefined)?event.pageX:event.x),((event.y==undefined)?event.pageY:event.y), eyePosition, eyeRadius);
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
        //console.log(n);
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
    var lightColors = [0.925,   0.662,  0.478,
                       0.925,   0.662,  0.478,
                       0.925,   0.662,  0.478,
                       1.0,     1.0,    1.0];

    lightPositions = [  -50,    40,     50,
                        -50,    40,     -50,
                        50,      40,     -50,
                        50,      40,      50];
    lightPositions = new Float32Array(lightPositions);

    var eyePosition = vec3.create();
    var target = vec3.create();
    var up = vec3.create([0, 1, 0]);

    // Animation parameters for the rotating eye-point.
    var eyeSpeed = 0.2;
    var eyeHeight = 20;
    var eyeRadius = 80;
    var eyeRotated = 11;
    //var eyeRotated = 0;

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
        invModelView: invModelView,
        reflectionAngleBias: 50.0,
        showWaterDepth: 0,
        waterDensity: 0.1,
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


    // Renders one frame and registers itself for the next frame.
   function render() {
        if(renderActivated){
            tdl.webgl.requestAnimationFrame(render, canvas);
        }

        // Do the time keeping.
        var now = (new Date()).getTime() * 0.001;
        elapsedTime = (then == 0.0 ? 0.0 : now - then);
        then = now;
        if (animate) {
            clock += elapsedTime;
        }

        playerMovement(elapsedTime);
        drawObjectConst.reflectionAngleBias = REFLECTION_ANGLE_MULTIPLICATOR;
        drawObjectConst.renderWater = RENDER_WATER ? 1 : 0;
        drawObjectConst.renderWaterReflect = RENDER_WATER_REFLECTION ? 1 : 0;
        drawObjectConst.renderWaterReflectNormalmap = RENDER_WATER_REFLECTION_NORMALMAP ? 1 : 0;
        drawObjectConst.renderWaterRefract = RENDER_WATER_REFRACTION ? 1 : 0;
        drawObjectConst.renderWaterRefractNormalmap = RENDER_WATER_REFRACTION_NORMALMAP ? 1 : 0;
        drawObjectConst.renderBloom = RENDER_BLOOM ? 1 : 0;
        

        gl.enable(gl.CULL_FACE);

        if(RENDER_WATER){
            //render scene without water for refraction
            var tmp_water_shown = SHOW_WATER;
            SHOW_WATER = false;
            drawObjectConst.refractionView = 1;
            refractionmap.bind();
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            renderScene(true);
            SHOW_WATER = tmp_water_shown;
            drawObjectConst.refractionView = 0;
            
            //render scene from under water perspective
            drawObjectConst.waterview = 1;
            watermap.bind();
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            renderScene(true);
            drawObjectConst.waterview = 0;
            gl.enable(gl.CULL_FACE);
        }
        
        if(RENDER_BLOOM){
            //enable brightpass for glow map generation
            drawObjectConst.brightpass = BRIGHT_PASS;
            // draw scene in small framebuffer for glowmap
            smallFramebuffer.bind();
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            renderScene(BLOOM_BACKGROUND);
            //disable brightpass
            drawObjectConst.brightpass = 0.0;
            
            //create glowmap by blurring small framebuffer
            glowmap.bind();
            gl.depthMask(false);
            gl.disable(gl.DEPTH_TEST);
            var quadGlowMapBlurModel = quadGlowMapBlur.model;
            quadGlowMapBlurModel.drawPrep();
            quadGlowMapBlurModel.draw({ model: quadGlowMapBlur.transform, glowBlurSize: GLOW_BLUR_SIZE});
        }
        
        if(RENDER_SCENE){
            //create fullscreen scene
            framebuffer.bind();
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            renderScene(true);
        }
        
        backBuffer.bind();
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        
        //post processing
        var quadModel = postProcessQuad.model;
        quadModel.drawPrep({blurSize: 0.02,
                            glowStrength: GLOW_STRENGTH,
                            showBloom: SHOW_BLOOM ? 1 : 0,
                            showScene: SHOW_SCENE ? 1 : 0});
        quadModel.draw({ model: postProcessQuad.transform });
    }

    function renderScene(renderskybox, renderwater){
        gl.clearColor(0.0,0.0,0.0,1.0);
        gl.clearDepth(1);
     
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if(renderskybox && RENDER_SKYBOX){
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
        var tval = (Math.sin(clock*2)+1)/2;

        for (var i=0;i<max*max;i++){
            pillar.setSphereBrightness(colval);
            //pillar.setSphereBrightness(tval);
            pillar.setSphereColor(pillarSphereColors[i]);

            var pos = pillarPositions[i];

            var translateTo = [pos[0],pos[1]*tval+8,pos[2]];
            pillar.translate(translateTo);

            pillar.rotateY=((clock*5.0)%360)* Math.PI / 180;

            pillar.drawObject(drawObjectConst);
        }

        if((!renderskybox)&&(!GLOWINGWELL)){
            return;
        }
        waterWell1.translate([-15.3,-14.2,0]);
        waterWell1.drawObject(drawObjectConst);
        waterWell1.translate([15.3,-14.2,0]);
        waterWell1.drawObject(drawObjectConst);
        waterWell2.translate([0,-14.2,-15.3]);
        waterWell2.drawObject(drawObjectConst);
        waterWell2.translate([0,-14.2, 15.3]);
        waterWell2.drawObject(drawObjectConst);

        if(drawObjectConst.waterview == 0){
            waterWell3.translate([0,-4.5, 0]);
            waterWell3.drawObject(drawObjectConst);
            if(SHOW_WATER){
                waterPlane.translate([0,0,0]);
                waterPlane.drawObject(drawObjectConst);
            }
        }
    }
    
    //-----------------------------------------------

    function playerMovement(deltat){
        var moveSpeed = 15.0;
        
        if(walkW){
            eyeRadius -= deltat*moveSpeed*2.0;
        }else if(walkS){
            eyeRadius += deltat*moveSpeed*2.0;
        }
        if(walkA){
            eyeRotated -= deltat*moveSpeed;
        }else if(walkD){
            eyeRotated += deltat*moveSpeed;
        }
        if(walkQ){
            eyeHeight += deltat*moveSpeed;
        }else if(walkE){
            eyeHeight -= deltat*moveSpeed;
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
        
        invModelView = mat4.create();
        mat4.multiply(invModelView, invProj,  invModelView);
    }

    // Initial call to get the rendering started.
    render();
}