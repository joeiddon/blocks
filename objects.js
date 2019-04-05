'use strict';

let player_height = 1.7;
let objects = {
    cube: function(){
        let col = {h: 37, s: 100, l: 60};
        return get_cuboid(0, 0, 0, 1, 1, 1, col);
    },
    grass: function(){
        //to speed up rendering, the grass doesnt have a bottom,
        //so we can't use get_cuboid :(
        return [{verts: [{x:0, y:0, z:0}, {x:0, y:1, z:0}, {x:0, y:1, z:1}, {x:0, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x:-1, y: 0, z: 0}},
                {verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:0, z:1}, {x:0, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y:-1, z: 0}},
                //{verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:0, y:1, z:0}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y: 0, z:-1}},
                {verts: [{x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:1, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 1, y: 0, z: 0}},
                {verts: [{x:0, y:1, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y: 1, z: 0}},
                {verts: [{x:0, y:0, z:1}, {x:1, y:0, z:1}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: {h: 90, s: 80, l: 40}, vect: {x: 0, y: 0, z: 1}}];
    },
    wood: function(){
        return get_cuboid(0, 0, 0, 1, 1, 1, {h: 31, s: 77, l: 36});
    },
    leaves: function(){
        return get_cuboid(0, 0, 0, 1, 1, 1, {h: 104, s: 77, l: 36});
    },
    human: function(head_pitch){
        //stands on z-axis, looking down y-axis, head tilted by head_pitch, in degrees
        let col = {h: 182, s: 86, l: 64};
        let fc =  {h: 299, s: 66, l: 68};
        let sz = 1; //width of body; proportions based of this
        let h  = player_height;
        let head =      get_cuboid(    -sz/4, -sz/6, h * 4/5, sz/2, sz/3, h * 1/5, [col,fc,col,col,col,col], zengine.to_rad(-head_pitch));
        let body =      get_cuboid(    -sz/2, -sz/4, h * 2/5,   sz, sz/2, h * 2/5, col);
        let left_leg =  get_cuboid(sz/2-sz/4, -sz/6,       0, sz/4, sz/3, h * 2/5, col);
        let right_leg = get_cuboid(    -sz/2, -sz/6,       0, sz/4, sz/3, h * 2/5, col);
        return [].concat(body, head, left_leg, right_leg);
    },
    /*
    constructor objects:
    return blocks from above that need to be spread (...) into the blocks array
    */
    tree: function(x, y, z){
        return [{x: x, y: y, z: z+0, obj: 'wood'},
                {x: x, y: y, z: z+1, obj: 'wood'},
                {x: x, y: y, z: z+3, obj: 'leaves'},
                {x: x-1, y: y,   z: z+2, obj: 'leaves'},
                {x: x+1, y: y,   z: z+2, obj: 'leaves'},
                {x: x,   y: y+1, z: z+2, obj: 'leaves'},
                {x: x,   y: y-1, z: z+2, obj: 'leaves'}];
    },
    person: function(their_cam){
        //no pre-processing required, just pass their cam straight in
        return objects.human(their_cam.pitch).map(
            f => ({verts: f.verts.map(zengine.z_axis_rotate(zengine.to_rad(-their_cam.yaw)))
                                 .map(zengine.translate(their_cam.x,
                                                        their_cam.y,
                                                        their_cam.z-player_height)),
                   vect: zengine.z_axis_rotate(zengine.to_rad(-their_cam.yaw))(f.vect),
                   col:  f.col})
        );
    }
}

function get_cuboid(x, y, z, lx, ly, lz, color, tilt){
    //gives cuboid: at position (x,y,z),
    //              with dimensions (lx,ly,lz),
    //              coloured by the col: either a single colour, or
    //                                   an array of face colors (right,forward,up,left,back,down)
    //              also (optionally) tilted by angle tilt, in radians
    //the position is from the bottom corner, with the cuboid extending into the positive octant
    if (tilt == undefined) tilt = 0;
    let cols = color.length ? color : [color,color,color,color,color,color];
    let cuboid = [{verts: [{x: 0, y: 0, z: 0}, {x: 0, y:ly, z: 0}, {x: 0, y:ly, z:lz}, {x: 0, y: 0, z:lz}], col: cols[3], vect: {x:-1, y: 0, z: 0}},
                  {verts: [{x: 0, y: 0, z: 0}, {x:lx, y: 0, z: 0}, {x:lx, y: 0, z:lz}, {x: 0, y: 0, z:lz}], col: cols[4], vect: {x: 0, y:-1, z: 0}},
                  {verts: [{x: 0, y: 0, z: 0}, {x:lx, y: 0, z: 0}, {x:lx, y:ly, z: 0}, {x: 0, y:ly, z: 0}], col: cols[5], vect: {x: 0, y: 0, z:-1}},
                  {verts: [{x:lx, y: 0, z: 0}, {x:lx, y:ly, z: 0}, {x:lx, y:ly, z:lz}, {x:lx, y: 0, z:lz}], col: cols[0], vect: {x: 1, y: 0, z: 0}},
                  {verts: [{x: 0, y:ly, z: 0}, {x:lx, y:ly, z: 0}, {x:lx, y:ly, z:lz}, {x: 0, y:ly, z:lz}], col: cols[1], vect: {x: 0, y: 1, z: 0}},
                  {verts: [{x: 0, y: 0, z:lz}, {x:lx, y: 0, z:lz}, {x:lx, y:ly, z:lz}, {x: 0, y:ly, z:lz}], col: cols[2], vect: {x: 0, y: 0, z: 1}}];
    cuboid.forEach(c => {c.verts = c.verts.map(zengine.x_axis_rotate(tilt)).map(zengine.translate(x,y,z));
                         c.vect = zengine.x_axis_rotate(tilt)(c.vect)});
    return cuboid;
}
