'use strict';


//adapted perlin.js code to allow seed for chunk generator
function get_chunk(x, y){
    let chunks = [];
    function dot_prod_grid(x, y, vx, vy){
        //the PRNG is seeded with the number xseedy,
        //i,e with: x = 1, y = 4, seed = 321 then 13214
        let theta = (new MersenneTwister(parseInt(toString(x) + toString(seed) + toString(y)))).random() * 2 * Math.PI;
        let g_vect = {x: Math.cos(theta), y: Math.sin(theta)};
        let d_vect = {x: x - vx, y: y - vy};
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    }
    let smootherstep = (x) => 6*x**5 - 15*x**4 + 10*x**3;
    let interp = (x,a,b) => a + smootherstep(x) * (b-a);
    for (let i = 0; i < chunk_size; i++){
        for (let j = 0; j < chunk_size; j++){
            let tl = this.dot_prod_grid(j/chunk_size, i/chunk_size, x,   y);
            let tr = this.dot_prod_grid(j/chunk_size, i/chunk_size, x+1, y);
            let bl = this.dot_prod_grid(j/chunk_size, i/chunk_size, x,   y+1);
            let br = this.dot_prod_grid(j/chunk_size, i/chunk_size, x+1, y+1);
            let xt = this.interp(j/chunk_size - x, tl, tr);
            let xb = this.interp(j/chunk_size - x, bl, br);
            let v = this.interp(i/chunk_size - y, xt, xb);
            chunks.push({x: x,
                         y: y,
                         z: parseInt(perlin.get(x/hill_size, y/hill_size)*hill_height),
                         obj: 'grass'});
        }
    }
    //gradients at the corners
}
'use strict';
let perlin = {
    rand_vect: function(){
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },
    dot_prod_grid: function(x, y, vx, vy){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if (this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function(x){
        return 6*x**5 - 15*x**4 + 10*x**3;
    },
    interp: function(x, a, b){
        return a + this.smootherstep(x) * (b-a);
    },
    seed: function(){
        this.gradients = {};
    },
    get: function(x, y) {
        let xf = Math.floor(x);
        let yf = Math.floor(y);
        //interpolate
        let tl = this.dot_prod_grid(x, y, xf,   yf);
        let tr = this.dot_prod_grid(x, y, xf+1, yf);
        let bl = this.dot_prod_grid(x, y, xf,   yf+1);
        let br = this.dot_prod_grid(x, y, xf+1, yf+1);
        let xt = this.interp(x-xf, tl, tr);
        let xb = this.interp(x-xf, bl, br);
        return this.interp(y-yf, xt, xb);
    }
}
perlin.seed();
