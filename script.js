'use strict';

/*************************************
            VARIABLES
**************************************/
/****DOM elements (+ctx)*******/
let cnvs  = document.getElementById('cnvs');
let ctx = cnvs.getContext('2d');
let name_div = document.getElementById('name_div');
let name_inpt = document.getElementById('name_inpt');
let info_div = document.getElementById('info_div');
let log = document.getElementById('log');

/*******general*******/
//have they clicked through the start screen? (i.e. verified name)
let in_game = false;
//is pointer lock active?
let pointer_locked = false;
//sensitivity of mouse movement
let sens = 2;
//radius HUD of circle
let hud_radius = 4;
//wireframe for rendering
let wireframe = false;
//set of currently pressed keys
let pressed_keys = new Set();
//blocks array
let blocks = [];
//light
let light = {x: 0.5, y: 0.5, z: -0.7, min_saturation: 0.3, min_lightness: 0.3};
//random_names
let names = ['bob', 'bill', 'jim', 'fish', 'cat'];
//object to store positions (cameras) of other players
let players = {};

/******websocket*********/
//server address
let ws_server = 'ws://35.207.51.171:8000/';
//position update interval
let pos_int_ms = 100;
//last position update
let pos_last_ms = -Infinity;

/*********player*******/
//player_height defined in objects.js
//name (used for websockets)
let name;
//position of camera
let cam = {x: 0, y: 0, z: 1+player_height, yaw: 0, pitch: 0, roll: 0, fov: 90};
//how far can we see?
let horizon = 16;
//speed, units per second
let spd = 4;

/*********jumping******/
let jump_spd = 0;         //units per second
let jump_init_spd = 16;   //units per second
let gravity = 16;         //units per second ^ 2

/*****anim. frame globals****/
//id
let update_id;
//timing globals
let time_diff_s;
let time_last_ms;

/********world*************/
//size of world (for initial perlin)
let world_size = 16;
//multiplier for perlin noise
let hill_height = 6;
//size of perlin grid square
let hill_size = world_size;

/*************************************
               STARTUP
**************************************/

//fit the canvas to the screen
fts();
//setup the world
init_world();
//display startup message
startup_screen();
//init. websocket connection
let websocket = new WebSocket(ws_server);
//put stored name in the input textbox or default to random
setup_name();

/*************************************
          MAIN EVENT LOOP
**************************************/

function update(time_now_ms){
    time_diff_s  = time_last_ms ? (time_now_ms - time_last_ms) / 1000 : 0;
    time_last_ms = time_now_ms;

    if (pos_last_ms + pos_int_ms < time_now_ms){
        pos_last_ms = time_now_ms;
        send_position();
    }

    handle_keys();
    handle_jump();
    zengine.render(gen_world(), cam, cnvs, wireframe, horizon, light);
    render_hud();

    update_id = requestAnimationFrame(update);
}


/*************************************
            EVENT LISTENERS
***************************************/

/***********resize*****************/

window.addEventListener('resize',fts);

function fts(){
    cnvs.width  = innerWidth;
    cnvs.height = innerHeight;
}

/**********keyboard***************/


//handlers initiated in the pointer lock event handler

function kd(e){
    if ('f'.includes(e.key)){
        switch (e.key){
            case 'f':
                wireframe = !wireframe;
            break;
        }
    } else {
        pressed_keys.add(e.key);
    }
}

function ku(e){
    pressed_keys.delete(e.key);
}

function handle_keys(){
    for (let k of pressed_keys){
        switch (k){
            case 'w':
                step(0);
                break;
            case 'a':
                step(-90);
                break;
            case 's':
                step(180);
                break;
            case 'd':
                step(90);
                break;
            case ' ':
                if (jump_spd==0)jump_spd=jump_init_spd;
                break;
        }
    }
}


/*************mouse**********/

//experimental
document.addEventListener('mousewheel',e=>(cam.fov+=e.deltaY<0?-10:10));

cnvs.onclick = function(){
    if (!pointer_locked)
    cnvs.requestPointerLock();
    if (!in_game){
        in_game = true;
        websocket.send(JSON.stringify({name: name, type: 'set_name', data: name_inpt.value}));
        name = name_inpt.value;
        name_div.style.display = 'none';
        log.style.display = 'block';
    }
}

document.addEventListener('pointerlockchange', function(){
    if (document.pointerLockElement == cnvs){
        pointer_locked = true;
        update_id = requestAnimationFrame(update);
        document.addEventListener('mousemove', mm);
        document.addEventListener('click', mc);
        document.addEventListener('keypress', kd);
        document.addEventListener('keyup', ku);
    } else {
        pointer_locked = false;
        cancelAnimationFrame(update_id);
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseclick', mc);
        document.removeEventListener('keypress', kd);
        document.removeEventListener('keyup', ku);
    }
})

function mc(e){
    // 0 --> left ; 2 --> right
    if (e.button != 0 && e.button != 2) return;
    blocks.sort((a,b)=>zengine.distance(cam, {x:a.x+0.5, y: a.y+0.5, z:a.z+0.5}) -
                       zengine.distance(cam, {x:b.x+0.5, y: b.y+0.5, z:b.z+0.5}));
    for (let i = 0; i < blocks.length; i++){
        //every object is just treated as a cube for speed
        let blk = objects.cube().map(f => ({verts: f.verts.map(zengine.translate(blocks[i].x, blocks[i].y, blocks[i].z)),
                                            vect:  f.vect}))
                                .sort((a,b)=>zengine.distance(cam, zengine.centroid(a.verts))-
                                             zengine.distance(cam, zengine.centroid(b.verts)));
        for (let j = 0; j < blk.length; j++){
            let f = blk[j].verts.map(zengine.translate(-cam.x, -cam.y, -cam.z))
                                .map(zengine.z_axis_rotate(zengine.to_rad(cam.yaw)))
                                .map(zengine.y_axis_rotate(zengine.to_rad(cam.roll)))
                                .map(zengine.x_axis_rotate(zengine.to_rad(cam.pitch)))
                                .map(zengine.translate(cam.x, cam.y, cam.z));
            //convert face to 2d
            f = f.map(c=>({x: zengine.to_deg(Math.atan2(c.x - cam.x, c.y - cam.y)),
                           y: zengine.to_deg(Math.atan2(c.z - cam.z, c.y - cam.y))}));
            //bounding box quick check
            let min_x = f[0].x;
            let max_x = f[0].x;
            let min_y = f[0].y;
            let max_y = f[0].y;
            for (let i = 1; i < f.length; i++){
                min_x = Math.min(min_x, f[i].x);
                max_x = Math.max(max_x, f[i].x);
                min_y = Math.min(min_y, f[i].y);
                max_y = Math.max(max_y, f[i].y);
            }
            if (min_x > 0 || max_x < 0 || min_y > 0 || max_y < 0) continue;
            //if passed bounding box, try ray casting
            let inside = false;
            for (let ii = 0; ii < f.length; ii++){
                let jj = ii < f.length - 1 ? ii + 1 : 0;
                //check if crosses line and if that cross is to the right of the point
                if ((f[ii].y < 0 && f[jj].y > 0 || f[ii].y > 0 && f[jj].y < 0) &&
                    0 < ((0 - f[ii].y) * (f[jj].x - f[ii].x)) / (f[jj].y - f[ii].y) + f[ii].x){
                    inside = !inside;
                }
            }
            if (!inside) continue;
            console.log('hit');
            if (e.button == 2) {
                console.log('removing', i);
                if (blocks[i].obj != 'grass')
                blocks.splice(i,1);
            } else {
                let nb = {x: blocks[i].x + blk[j].vect.x,
                          y: blocks[i].y + blk[j].vect.y,
                          z: blocks[i].z + blk[j].vect.z,
                          obj: 'cube'};
                //check if trying to place block where am standing, still return if was
                if (!(nb.x==Math.floor(cam.x)&&nb.y==Math.floor(cam.y)&&(nb.z==Math.floor(cam.z)||nb.z==Math.floor(cam.z)-1))){
                    blocks.push(nb);
                }
            }
            return;
        }
    }
}

function mm(e){
    cam.yaw += e.movementX * sens / 32;
    cam.yaw += cam.yaw < -180 ? 360 : cam.yaw > 180 ? -360 : 0;
    cam.pitch -= e.movementY * sens / 32;
    cam.pitch += cam.pitch < -180 ? 360 : cam.pitch > 180 ? -360 : 0;
}

/********** websocket **********/

websocket.onerror = function(e){
    document.body.innerText = 'server error: likely server script is not running';
}

websocket.onmessage = function(e){
    let message = JSON.parse(e.data);
    switch (message['type']){
        case 'positions':
            players = message['data'];
            break;
        case 'log':
            log.innerText += '\n' + message['data'];
            break;
        default:
            console.log('unknown message type');
    }
}

/********************************
           OTHER FUNCS
*********************************/

function step(angle){
    //step distance
    let sd = spd * time_diff_s;
    let nx = cam.x + Math.sin(zengine.to_rad(cam.yaw + angle)) * sd;
    let ny = cam.y + Math.cos(zengine.to_rad(cam.yaw + angle)) * sd;
    //blocks surrounding me (so the 2)
    let bs = blocks.filter(b => b.x==Math.floor(nx)&&b.y==Math.floor(ny)&&(b.z==Math.floor(cam.z)||b.z==Math.floor(cam.z-1)));
    if (0 < nx && nx < world_size && 0 < ny && ny < world_size && !bs.length){
        cam.x = nx;
        cam.y = ny;
    }
}

function render_hud(){
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cnvs.width/2,cnvs.height/2,hud_radius,0,Math.PI*2);
    ctx.stroke();
}

function handle_jump(){
    //z of ground (block below's z plus one)
    let gz = blocks.filter(b=>(b.x == Math.floor(cam.x) &&
                               b.y == Math.floor(cam.y) &&
                               b.z <= Math.ceil(cam.z-player_height)))
                   .reduce((a,b)=>a.z>b.z?a:b).z+1;
    //update speed
    jump_spd -= gravity * time_diff_s;
    //next z pos
    let nz = cam.z + jump_spd * time_diff_s;
    if (nz - player_height <= gz){
        cam.z = gz + player_height;
        jump_spd = 0;
    } else {
        cam.z = nz;
    }
}

function init_world(){
    for (let x = 0; x < world_size; x++){
        for (let y = 0; y < world_size; y++){
            blocks.push({x: x,
                         y: y,
                         z: parseInt(perlin.get(x/hill_size, y/hill_size)*hill_height),
                         obj: 'grass'});
        }
    }
}

function gen_world(){
    let world = [];
    for (let i = 0; i < blocks.length; i++){
        world = world.concat(objects[blocks[i].obj]().map(
            f => ({verts: f.verts.map(zengine.translate(blocks[i].x,
                                                        blocks[i].y,
                                                        blocks[i].z)),
                   vect: f.vect,
                   col:  f.col})
        ));
    }
    return world;
}

function startup_screen(){
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('click anywhere to start (ESC to escape)', cnvs.width/2, cnvs.height/2);
}

function send_position(){
    websocket.send(JSON.stringify({type: 'update_position', data: {x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw}}));
}

function give_name(){
    //  BAD CODE!  - could have overlap with other name
    name_inpt.value = names[Math.floor(Math.random()*names.length)];
}

function setup_name(){
    let stored_name = localStorage.getItem('name_inpt');
    if(stored_name) name_inpt.value = stored_name;
    else give_name();
}

name_inpt.addEventListener('change', (e) => localStorage.setItem('name_inpt', name_inpt.value));