'use strict';

/*************************************
            VARIABLES
**************************************/
/****DOM elements (+ctx)*******/
let cnvs        = document.getElementById('cnvs');
let name_div    = document.getElementById('name_div');
let name_inpt   = document.getElementById('name_inpt');
let control_div = document.getElementById('control_div');
let log         = document.getElementById('log');
let cmd_inpt    = document.getElementById('cmd_inpt');

let ctx = cnvs.getContext('2d');

/*******misc*******/
//the current grass chunk blocks are stored
let chunk_blocks;
//array to store player-placed blocks
let user_blocks = [];
//global to store chunk_blocks and user_blocks
let blocks;
//object to store positions (cameras) of other players
let positions;
//sensitivity of mouse movement
let sens = 2;
//radius HUD of circle
let hud_radius = 4;
//wireframe for rendering
let wireframe = false;
//set of currently pressed keys
let pressed_keys = new Set();
//light
let light = {x: 0.5, y: 0.5, z: -0.7, min_saturation: 0.3, min_lightness: 0.3};
//random_names
let names = ['bob', 'bill', 'jim', 'fish', 'cat'];

/******websocket*********/
//server address
let ws_server_ip = 'ws://35.207.51.171:8000/';
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
let horizon = 10;
//speed, units per second
let spd = 4;

/*********jumping******/
let jump_spd = 0;         //units per second
let jump_init_spd = 16;   //units per second
let gravity = 64;         //units per second ^ 2

/*****anim. frame globals****/
//id returned from requestAnimationFrame
let update_id;
//timing globals
let time_diff_s;
let time_last_ms;

/********world*************/
//size of chunks
let chunk_size = 16;
//world seed
let seed;
//multiplier for perlin noise
let hill_height = 4;

/*************************************
               STARTUP
**************************************/

//fit the canvas to the screen
fts();
//display startup message
startup_screen();
//init. websocket connection
let websocket = new WebSocket(ws_server_ip);
//put stored name in the input textbox
setup_name();

/*************************************
          MAIN EVENT LOOP
**************************************/

function update(time_now_ms){
    time_diff_s  = time_last_ms ? (time_now_ms - time_last_ms) / 1000 : 0;
    time_last_ms = time_now_ms;

    gen_chunk_blocks();
    blocks = chunk_blocks.concat(user_blocks);
    handle_keys();
    handle_jump();
    zengine.render(gen_world(), cam, cnvs, wireframe, false, light);
    render_names();
    render_hud();

    if (pos_last_ms + pos_int_ms < time_now_ms){
        pos_last_ms = time_now_ms;
        send_position();
    }

    update_id = requestAnimationFrame(update);
}


/*************************************
            EVENT LISTENERS
***************************************/

/***********resize*****************/

window.addEventListener('resize', fts);

function fts(){
    cnvs.width  = innerWidth;
    cnvs.height = innerHeight;
}

/************canvas*********/

cnvs.addEventListener('click', initial_click);

function initial_click(){
    //check we have been sent the positions (names) and we havent't
    //chosen someone else's name or no name
    if (!positions || name_inpt.value in positions || !name_inpt.value.length){
        name_inpt.value = '';
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        ctx.fillRect(0, 0, cnvs.width, cnvs.height);
        return;
    }
    name = name_inpt.value;
    store_name();
    websocket.send(JSON.stringify({type: 'join', data: name}));
    name_div.style.display = 'none';
    control_div.style.display = 'block';
    cnvs.requestPointerLock();
    cnvs.removeEventListener('click', initial_click);
}

function lock_pointer(){
    cnvs.requestPointerLock();
}

document.addEventListener('pointerlockchange', function(){
    if (document.pointerLockElement == cnvs){
        cnvs.removeEventListener('click', lock_pointer);
        update_id = requestAnimationFrame(update);
        document.addEventListener('mousemove', mm);
        document.addEventListener('click', mc);
        document.addEventListener('keypress', kd);
        document.addEventListener('keyup', ku);
    } else {
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        ctx.fillRect(0, 0, cnvs.width, cnvs.height);
        cnvs.addEventListener('click', lock_pointer);
        cancelAnimationFrame(update_id);
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseclick', mc);
        document.removeEventListener('keypress', kd);
        document.removeEventListener('keyup', ku);
    }
})

/********** websocket **********/

websocket.onerror = function(e){
    document.body.innerText = 'server error: likely server script is not running';
}

websocket.onmessage = function(e){
    let message = JSON.parse(e.data);
    switch (message['type']){
        case 'positions':
            positions = message['data'];
            break;
        case 'seed':
            seed = parseInt(message['data']);
            break;
        case 'user_blocks':
            user_blocks = message['data'];
            break;
        case 'log':
            log.innerText += message['data'] + '\n';
            log.scrollTop = log.scrollHeight;
            break;
        default:
            console.log('unknown message type');
    }
}

/**********input boxes**********/

cmd_inpt.addEventListener('keyup', function(e){
    if (e.keyCode != 13) return;
    websocket.send(JSON.stringify({type:'cmd', data:cmd_inpt.value}));
    cmd_inpt.value = '';
});

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

//all mouse events are controlled by the pointerlockchange event handler

//experimental
document.addEventListener('mousewheel',e=>(cam.fov+=e.deltaY<0?-10:10));

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
            if (e.button == 2) {  //right click (remove)
                if (blocks[i].obj != 'grass')
                websocket.send(JSON.stringify({type:'block_remove', 'data': blocks[i]}))
            } else {              //left click (place)
                let nb = {x: blocks[i].x + blk[j].vect.x,
                          y: blocks[i].y + blk[j].vect.y,
                          z: blocks[i].z + blk[j].vect.z,
                          obj: 'cube'};
                //check if trying to place block where am standing, still return if was
                if (nb.x != Math.floor(cam.x) || nb.y != Math.floor(cam.y) || (nb.z != Math.floor(cam.z) && nb.z != Math.floor(cam.z)-1)){
                    websocket.send(JSON.stringify({type:'block_place', 'data': nb}))
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

/********************************
           OTHER FUNCS
*********************************/

function step(angle){
    //step distance
    let sd = spd * time_diff_s;
    let nx = cam.x + Math.sin(zengine.to_rad(cam.yaw + angle)) * sd;
    let ny = cam.y + Math.cos(zengine.to_rad(cam.yaw + angle)) * sd;
    //bs is an array of blocks I will be within (i.e. must have no length to take step)
    for (let i = 0; i < blocks.length; i++){
        if (blocks[i].x == Math.floor(nx) &&
            blocks[i].y == Math.floor(ny) &&
           (blocks[i].z == Math.floor(cam.z) || blocks[i].z == Math.floor(cam.z-1))) return;
    }
    cam.x = nx; cam.y = ny;
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
    let gz = -Infinity;
    for (let i = 0; i < blocks.length; i++){
        if (blocks[i].z + 1 > gz && blocks[i].x == Math.floor(cam.x) &&
                                    blocks[i].y == Math.floor(cam.y) &&
                                    blocks[i].z <= Math.ceil(cam.z-player_height))
        gz = blocks[i].z + 1;
    }
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

function gen_world(){
    //returns 3d world faces from blocks array and positions object
    let world = [];
    for (let i = 0; i < blocks.length; i++){
        if (zengine.distance(blocks[i], cam) > horizon) continue;
        world = world.concat(objects[blocks[i].obj]().map(
            f => ({verts: f.verts.map(zengine.translate(blocks[i].x,
                                                        blocks[i].y,
                                                        blocks[i].z)),
                   vect: f.vect,
                   col:  f.col})
        ));
    }
    for (let player in positions){
        if (player == name) continue;
        world = world.concat(objects.person().map(
            f => ({verts: f.verts.map(zengine.z_axis_rotate(zengine.to_rad(-positions[player].yaw)))
                                 .map(zengine.translate(positions[player].x,
                                                        positions[player].y,
                                                        positions[player].z-player_height)),
                   vect: zengine.z_axis_rotate(zengine.to_rad(-positions[player].yaw))(f.vect),
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

function setup_name(){
    let stored_name = localStorage.getItem('name_inpt');
    if (stored_name) name_inpt.value = stored_name;
}

function store_name(){
    localStorage.setItem('name_inpt', name)
}

function render_names(){
    for (let player_name in positions){
        if (player_name == name) continue;
        let aligned = zengine.translate(cam.x, cam.y, cam.z)(
                      zengine.x_axis_rotate(zengine.to_rad(cam.pitch))(
                      zengine.y_axis_rotate(zengine.to_rad(cam.roll))(
                      zengine.z_axis_rotate(zengine.to_rad(cam.yaw))(
                      zengine.translate(-cam.x, -cam.y, -cam.z)(positions[player_name])))));
        let centre_angles = {y: zengine.to_deg(Math.atan2(aligned.x - cam.x, aligned.y - cam.y)),
                             p: zengine.to_deg(Math.atan2(aligned.z - cam.z, aligned.y - cam.y))};

        let coord = {x: cnvs.width/2 + (centre_angles.y * (cnvs.width/cam.fov)),
                     y: cnvs.height/2 - (centre_angles.p * (cnvs.width/cam.fov))};

        ctx.font = '10px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(name, coord.x, coord.y);
    }
}

