'use strict';

/*
-1, 2   0, 2   1, 2   2, 2
-1, 1   0, 1   1, 1   2, 1
-1, 0   0, 0   1, 0   2, 0
-1,-1   0,-1   1,-1   2,-1
*/

let gradients = {};

function dot_prod_grid(x, y, vx, vy){
    //the PRNG is seeded with the number xseedy,
    //i,e with: x = 1, y = 4, seed = 321 then 13214
    let g_vect;
    if (gradients[[vx,vy]]){
        g_vect = gradients[[vx,vy]];
    } else {
        let theta = new MersenneTwister(seed ^ vx ^ 31 * vy).random() * 2 * Math.PI;
        g_vect = {x: Math.cos(theta), y: Math.sin(theta)};
        gradients[[vx,vy]] = g_vect;
    }
    let d_vect = {x: x - vx, y: y - vy};
    return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
}

//adapted perlin.js code to allow seed for chunk generator
//returns chunk at coordinate (vx,vy) WITH BLOCKS TRANSLATED TO CHUNK POINT
function get_chunk(vx, vy){
    let blocks  = [];
    let smootherstep = (x) => 6*x**5 - 15*x**4 + 10*x**3;
    let interp = (x,a,b) => a + smootherstep(x) * (b-a);
    for (let i = 0; i < chunk_size; i++){
        for (let j = 0; j < chunk_size; j++){
            let pi = i / (chunk_size - 1);
            let pj = j / (chunk_size - 1);
            let bl = dot_prod_grid(vx+pj, vy+pi, vx,   vy);
            let br = dot_prod_grid(vx+pj, vy+pi, vx+1, vy);
            let tl = dot_prod_grid(vx+pj, vy+pi, vx,   vy+1);
            let tr = dot_prod_grid(vx+pj, vy+pi, vx+1, vy+1);
            let xt = interp(pj, tl, tr);
            let xb = interp(pj, bl, br);
            let v =  interp(pi, xb, xt);
            blocks.push({x: vx*chunk_size + j,
                         y: vy*chunk_size + i,
                         z: parseInt(v*hill_height),
                         obj: 'grass'});
        }
    }
    return blocks;
}

function gen_chunk_blocks(){
    //populates global chunk_blocks array with blocks from the current chunk and
    //then the closest 3 chunks around
    chunk_blocks = [];
    let cx = Math.floor(cam.x / chunk_size);
    let cy = Math.floor(cam.y / chunk_size);
    //what to add to x and y for the other 3 chunks
    let ax = (cam.x % chunk_size) > ((cam.x >= 0 ? 1 : -1) * chunk_size / 2) ? 1 : -1;
    let ay = (cam.y % chunk_size) > ((cam.y >= 0 ? 1 : -1) * chunk_size / 2) ? 1 : -1;
    chunk_blocks = chunk_blocks.concat(get_chunk(cx, cy));
    chunk_blocks = chunk_blocks.concat(get_chunk(cx + ax, cy));
    chunk_blocks = chunk_blocks.concat(get_chunk(cx, cy + ay));
    chunk_blocks = chunk_blocks.concat(get_chunk(cx + ax, cy + ay));
}
