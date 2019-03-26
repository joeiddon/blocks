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

//gives a deterministic pseudo-random number based on two inputs and
//the random seed - a bit like a hash
//requires seed to be a char (uint8)
function random(x, y){
    //times seed by x and y multiplied by two primes and then normalise
    //with the size of the seed
    return seed * 193 * (x * 197 + y * 199) % 97 / 97;
}

function dot_prod_grid(x, y, vx, vy){
    let g_vect;
    if (gradients[[vx,vy]]){
        g_vect = gradients[[vx,vy]];
    } else {
        let theta = random(vx, vy) * 2 * Math.PI;
        g_vect = {x: Math.cos(theta), y: Math.sin(theta)};
        gradients[[vx,vy]] = g_vect;
    }
    let d_vect = {x: x - vx, y: y - vy};
    return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
}

//adapted perlin.js code to allow seed for chunk generator
//returns chunk at coordinate (vx,vy) in chunk coordinate system
//BLOCKS RETURNED ARE TRANSLATED TO CHUNK POINT IN ZENGINE 3D COORDINATES
function get_chunk(vx, vy){ //parse in here the row of z heights of the column of blocks one unit in the negative x direction
    //memoization
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
            if (random(i, j) > 0.98)
            blocks.push(...objects.tree(x, y, z+1));

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
    //and also with the 8 chunks around the chunk we are standing on (making 9 in total)
    chunk_blocks = [];
    let cx = Math.floor(cam.x / chunk_size);
    let cy = Math.floor(cam.y / chunk_size);
    chunk_blocks = [].concat(get_chunk(cx, cy),
                             get_chunk(cx+1, cy),
                             get_chunk(cx+1, cy+1),
                             get_chunk(cx+1, cy-1),
                             get_chunk(cx-1, cy),
                             get_chunk(cx-1, cy+1),
                             get_chunk(cx-1, cy-1),
                             get_chunk(cx, cy+1),
                             get_chunk(cx, cy-1));
}
