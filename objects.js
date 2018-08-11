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
        let col = {h: 131, s: 84, l: 57};
        let sz = 0.5;
        let h  = player_height;
        return [{verts: [{x:-sz/2, y:-sz/2, z:0}, {x:-sz/2, y:sz/2, z:0}, {x:-sz/2, y:sz/2, z:h}, {x:-sz/2, y:-sz/2, z:h}], col: col, vect: {x:-1, y: 0, z: 0}},
                {verts: [{x:-sz/2, y:-sz/2, z:0}, {x:sz/2, y:-sz/2, z:0}, {x:sz/2, y:-sz/2, z:h}, {x:-sz/2, y:-sz/2, z:h}], col: col, vect: {x: 0, y:-1, z: 0}},
                {verts: [{x:-sz/2, y:-sz/2, z:0}, {x:sz/2, y:-sz/2, z:0}, {x:sz/2, y:sz/2, z:0}, {x:-sz/2, y:sz/2, z:0}], col: col, vect: {x: 0, y: 0, z:-2}},
                {verts: [{x:sz/2, y:-sz/2, z:0}, {x:sz/2, y:sz/2, z:0}, {x:sz/2, y:sz/2, z:h}, {x:sz/2, y:-sz/2, z:h}], col: col, vect: {x: 1, y: 0, z: 0}},
                {verts: [{x:-sz/2, y:sz/2, z:0}, {x:sz/2, y:sz/2, z:0}, {x:sz/2, y:sz/2, z:h}, {x:-sz/2, y:sz/2, z:h}], col: col, vect: {x: 0, y: 1, z: 0}},
                {verts: [{x:-sz/2, y:-sz/2, z:h}, {x:sz/2, y:-sz/2, z:h}, {x:sz/2, y:sz/2, z:h}, {x:-sz/2, y:sz/2, z:h}], col: col, vect: {x: 0, y: 0, z: 2}}];
    }
}
