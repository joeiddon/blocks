'use strict';

/*
-1, 2   0, 2   1, 2   2, 2
-1, 1   0, 1   1, 1   2, 1
-1, 0   0, 0   1, 0   2, 0
-1,-1   0,-1   1,-1   2,-1
*/

//dictionaries (objects) for memoizing the get_chunk and dot_prod_grid functions respectviely
let chunks = {};
let gradients = {};

/*
TODO:
- sort out "cliffs" - commented parts are an attempt, but needs extra work.
  one way of doing it is to store all z's in a object, then build up and down from each
  block to match the height of the surrounding blocks
*/

//to be able to match up corresponding chunks, we must look at last line
//let last_line = [];


function dot_prod_grid(x, y, vx, vy){
    //the PRNG is seeded with (seed XOR x) * y
    //i,e with: x = 1, y = 4, seed = 321 then 13214
    let g_vect;
    if (gradients[[vx,vy]]){
        g_vect = gradients[[vx,vy]];
    } else {
        let theta = new MersenneTwister(seed ^ vx * vy).random() * 2 * Math.PI;
        g_vect = {x: Math.cos(theta), y: Math.sin(theta)};
        gradients[[vx,vy]] = g_vect;
    }
    let d_vect = {x: x - vx, y: y - vy};
    return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
}

//adapted perlin.js code to allow seed for chunk generator
//returns chunk at coordinate (vx,vy) WITH BLOCKS TRANSLATED TO CHUNK POINT
function get_chunk(vx, vy){ //parse in here the row of z heights of the column of blocks one unit in the negative x direction
    if (chunks.hasOwnProperty([vx, vy])){
        return chunks[[vx, vy]];
    }
    let blocks  = [];
    let smootherstep = (x) => 6*x**5 - 15*x**4 + 10*x**3;
    let interp = (x,a,b) => a + smootherstep(x) * (b-a);
    /*
    //holds the z-value of the block one unit in the negative x-direction
    let prev_z;
    */
    for (let i = 0; i < chunk_size; i++){
        for (let j = 0; j < chunk_size; j++){
            let pi = i / (chunk_size - 1);
            let pj = j / (chunk_size - 1);
            let bl = dot_prod_grid(vx+pi, vy+pj, vx,   vy);
            let br = dot_prod_grid(vx+pi, vy+pj, vx+1, vy);
            let tl = dot_prod_grid(vx+pi, vy+pj, vx,   vy+1);
            let tr = dot_prod_grid(vx+pi, vy+pj, vx+1, vy+1);
            let xt = interp(pi, tl, tr);
            let xb = interp(pi, bl, br);
            let v =  interp(pj, xb, xt); 
            let x = vx * chunk_size + i;
            let y = vy * chunk_size + j;
            let z = parseInt(v*hill_height);
            blocks.push({x: x, y: y, z: z, obj: 'grass'});
            /*
            //need to place more blocks above or below this height,
            //in case we are describing a "cliff" or similar
            //so we fill blocks from our below, up or down to join onto
            //the previous block
            //blocks.push({x: x, y: y, z: z, obj: 'grass'});
            if (i != 0){
                let above_last = prev_z < z;
                let zz = z;
                while (above_last ? zz >= prev_z : zz <= prev_z){
                    blocks.push({x: x, y: y, z: zz, obj: 'grass'});
                    zz += above_last ? -1 : 1;
                }
            }
            prev_z = z;
            */
        }
    }
    chunks[[vx, vy]] = blocks;
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
