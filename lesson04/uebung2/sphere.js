var sphereVertexPositionBuffer;
var sphereVertexColorBuffer;
var sphere_vertices=[];
var sphere_colors=[];

function pushPoint (array, p){
    array.push(p[0]);
    array.push(p[1]);
    array.push(p[2]);
}

function pushColor (array, p){
    array.push((p[0]+1.0)/2);
    array.push((p[1]+1.0)/2);
    array.push((p[2]+1.0)/2);
    array.push(1);
}

function sphere_rec (d, p1, p2, p3){
    if(d==0){
        pushPoint(sphere_vertices,p1);
        pushPoint(sphere_vertices,p2);
        pushPoint(sphere_vertices,p3);

        pushColor(sphere_colors,p1);
        pushColor(sphere_colors,p2);
        pushColor(sphere_colors,p3);
        return;
    } else {
        var m1 = vec3.normalize([((p3[0]-p1[0])/2.0)+p1[0] ,((p3[1]-p1[1])/2.0)+p1[1],((p3[2]-p1[2])/2.0)+p1[2]]);
        var m2 = vec3.normalize([((p2[0]-p1[0])/2.0)+p1[0] ,((p2[1]-p1[1])/2.0)+p1[1],((p2[2]-p1[2])/2.0)+p1[2]]);
        var m3 = vec3.normalize([((p3[0]-p2[0])/2.0)+p2[0] ,((p3[1]-p2[1])/2.0)+p2[1],((p3[2]-p2[2])/2.0)+p2[2]]);

        sphere_rec((d-1), p1, m1, m2);
        sphere_rec((d-1), m1, m3, p3);
        sphere_rec((d-1), m2, p2, m3);
        sphere_rec((d-1), m1, m2, m3);
    }
}

function generateSphereVerticesAndColors(d){
    var p1 = vec3.normalize([-1.1,  1.1,  1.1]);
    var p2 = vec3.normalize([ 1.1,  1.1, -1.1]);
    var p3 = vec3.normalize([-1.1, -1.1, -1.1]);
    var p4 = vec3.normalize([ 1.1, -1.1,  1.1]);

    sphere_rec(d, p1, p2, p3);
    sphere_rec(d, p2, p3, p4);
    sphere_rec(d, p1, p3, p4);
    sphere_rec(d, p1, p2, p4);
}

function Sphere (gl, d){
    var itemSize = 3;

    // assign sphere attributes
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);

    generateSphereVerticesAndColors(d || 4);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere_vertices), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = itemSize;
    sphereVertexPositionBuffer.numItems = sphere_vertices.length/itemSize;

    sphereVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexColorBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere_colors), gl.STATIC_DRAW);
    sphereVertexColorBuffer.itemSize = 4;
    sphereVertexColorBuffer.numItems = sphere_vertices.length/itemSize;

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);


    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, sphereVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
}

Sphere.prototype.draw = function(gl, r, a, t, s){
    mvPushMatrix();
    mat4.rotate(mvMatrix, r, a);
    mat4.translate(mvMatrix, t);
    mat4.scale(mvMatrix, s);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
    mvPopMatrix();
}
