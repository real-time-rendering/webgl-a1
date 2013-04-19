function sphere_rec (d, p1, p2, p3){
    if(typeof p1 === 'undefined'){
        p1 = vec3.normalize([-1.1,  1.1,  1.1]);
        p2 = vec3.normalize([ 1.1,  1.1, -1.1]);
        p3 = vec3.normalize([-1.1, -1.1, -1.1]);
        p4 = vec3.normalize([ 1.1, -1.1,  1.1]);
        return [].concat(
            sphere_rec(d, p1, p2, p3),
            sphere_rec(d, p2, p3, p4),
            sphere_rec(d, p1, p3, p4),
            sphere_rec(d, p1, p2, p4)
        );
    } else {
        if(d==0){
            return [
                p1[0], p1[1], p1[2],
                p2[0], p2[1], p2[2],
                p3[0], p3[1], p3[2]
            ];
        } else {
            var m1 = vec3.normalize([((p3[0]-p1[0])/2.0)+p1[0] ,((p3[1]-p1[1])/2.0)+p1[1],((p3[2]-p1[2])/2.0)+p1[2]]);
            var m2 = vec3.normalize([((p2[0]-p1[0])/2.0)+p1[0] ,((p2[1]-p1[1])/2.0)+p1[1],((p2[2]-p1[2])/2.0)+p1[2]]);
            var m3 = vec3.normalize([((p3[0]-p2[0])/2.0)+p2[0] ,((p3[1]-p2[1])/2.0)+p2[1],((p3[2]-p2[2])/2.0)+p2[2]]);
            return [].concat(
                sphere_rec((d-1), p1, m1, m2),
                sphere_rec((d-1), m1, m3, p3),
                sphere_rec((d-1), m2, p2, m3),
                sphere_rec((d-1), m1, m2, m3));
        }
    }
}

function sphere_colors(sphere_vertices)
{
    var colors = [];
    for (var i = 0; i < (sphere_vertices.length/4); i++) {
        colors.push(sphere_vertices[i*4]);
        colors.push(sphere_vertices[i*4+1]);
        colors.push(sphere_vertices[i*4+2]);
        colors.push(sphere_vertices[i*4+3]);
    }
    return colors;
}

function createSphere(){
    var sphereVertices =  sphere_rec(4);
    var sphereColors =  sphere_colors(sphereVertices);
    return {vertices : sphereVertices, colors : sphereColors};
}


var sphere = createSphere();