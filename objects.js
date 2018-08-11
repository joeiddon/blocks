'use strict';

let player_height = 1.7;
let objects = {
    cube: function(){
        let col = {h: 37, s: 100, l: 60};
        return [{verts: [{x:0, y:0, z:0}, {x:0, y:1, z:0}, {x:0, y:1, z:1}, {x:0, y:0, z:1}], col: col, vect: {x:-1, y: 0, z: 0}},
                {verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:0, z:1}, {x:0, y:0, z:1}], col: col, vect: {x: 0, y:-1, z: 0}},
                {verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:0, y:1, z:0}], col: col, vect: {x: 0, y: 0, z:-1}},
                {verts: [{x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:1, y:0, z:1}], col: col, vect: {x: 1, y: 0, z: 0}},
                {verts: [{x:0, y:1, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: col, vect: {x: 0, y: 1, z: 0}},
                {verts: [{x:0, y:0, z:1}, {x:1, y:0, z:1}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: col, vect: {x: 0, y: 0, z: 1}}];
    },
    grass: function(){
        return [{verts: [{x:0, y:0, z:0}, {x:0, y:1, z:0}, {x:0, y:1, z:1}, {x:0, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x:-1, y: 0, z: 0}},
                {verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:0, z:1}, {x:0, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y:-1, z: 0}},
                {verts: [{x:0, y:0, z:0}, {x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:0, y:1, z:0}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y: 0, z:-1}},
                {verts: [{x:1, y:0, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:1, y:0, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 1, y: 0, z: 0}},
                {verts: [{x:0, y:1, z:0}, {x:1, y:1, z:0}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: {h: 0, s: 17, l: 38},  vect: {x: 0, y: 1, z: 0}},
                {verts: [{x:0, y:0, z:1}, {x:1, y:0, z:1}, {x:1, y:1, z:1}, {x:0, y:1, z:1}], col: {h: 90, s: 80, l: 40}, vect: {x: 0, y: 0, z: 1}}];
    },
    person: function(){
        // in the x,y plane with z upwards
        // looks down their own y axis
        // center at 0, 0, h/2
        let col = {h: 131, s: 84, l: 57};
        let sz = 1;
        let h  = player_height;
        let body =      get_cubiod(      0, 0, 3 * h /  5,     sz, sz / 2,  2 * h / 5, col);
        let head =      get_cubiod(      0, 0, 9 * h / 10, sz / 2, sz / 3,      h / 5, col);
        let left_leg =  get_cubiod( sz / 4, 0,     h /  5, sz / 3, sz / 3,  2 * h / 5, col);
        let right_leg = get_cubiod(-sz / 4, 0,     h /  5, sz / 3, sz / 3,  2 * h / 5, col);    
        return [].concat(body, head, left_leg, right_leg);
    }
}

function get_cubiod(x, y, z, w, d, h, color){
    let cubiod = [{verts: [{x:- w/2, y:- d/2, z:-h/2}, {x:- w/2, y:  d/2, z:-h/2}, {x:- w/2, y:  d/2, z: h/2}, {x:- w/2, y:- d/2, z: h/2}], col: color, vect: {x:-1, y: 0, z: 0}},  // left
                  {verts: [{x:- w/2, y:- d/2, z:-h/2}, {x:  w/2, y:- d/2, z:-h/2}, {x:  w/2, y:- d/2, z: h/2}, {x:- w/2, y:- d/2, z: h/2}], col: color, vect: {x: 0, y:-1, z: 0}},  // backwards
                  {verts: [{x:- w/2, y:- d/2, z:-h/2}, {x:  w/2, y:- d/2, z:-h/2}, {x:  w/2, y:  d/2, z:-h/2}, {x:- w/2, y:  d/2, z:-h/2}], col: color, vect: {x: 0, y: 0, z:-1}},  // down
                  {verts: [{x:  w/2, y:- d/2, z:-h/2}, {x:  w/2, y:  d/2, z:-h/2}, {x:  w/2, y:  d/2, z: h/2}, {x:  w/2, y:- d/2, z: h/2}], col: color, vect: {x: 1, y: 0, z: 0}},  // right
                  {verts: [{x:- w/2, y:  d/2, z:-h/2}, {x:  w/2, y:  d/2, z:-h/2}, {x:  w/2, y:  d/2, z: h/2}, {x:- w/2, y:  d/2, z: h/2}], col: color, vect: {x: 0, y: 1, z: 0}},  // forward
                  {verts: [{x:- w/2, y:- d/2, z: h/2}, {x:  w/2, y:- d/2, z: h/2}, {x:  w/2, y:  d/2, z: h/2}, {x:- w/2, y:  d/2, z: h/2}], col: color, vect: {x: 0, y: 0, z: 1}}   // up
    ]
    cubiod.forEach(obj => obj.verts = obj.verts.map(zengine.translate(x, y, z)));
    return cubiod;
}
