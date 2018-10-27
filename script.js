'use strict';

/*************************************
            VARIABLES
**************************************/

//TODO:
/*
 - add button to go straight to offline play
 - write the random number generator myself (as this guys' is overly complicated
 - make an experimental version of zengine that hashes trig values to speed up rendering
 - allow for "cliffs" (stacked blocks on ground) - may need to implement bios
 - add more blocks (bottom bar and random trees?)
 - experiment with the floor blocks - not just grass ((vx + vy) % 2 == 0) ?
 - minimap of the heights of the blocks
 - make the trees determinstically-randomly shaped
 - add a checkbox for a popup controls printout - allowing the addition
   of more controls like to change distance in third person and proper fov support
*/


/****DOM elements (+ctx)*******/
let cnvs        = document.getElementById('cnvs');
let name_inpt   = document.getElementById('name_inpt');
let control_div = document.getElementById('control_div');
let chat_div    = document.getElementById('chat_div');
let log         = document.getElementById('log');
let cmd_inpt    = document.getElementById('cmd_inpt');

let ctx = cnvs.getContext('2d');

/*******misc*******/
//we go offline when the server is down or something
let offline = false;
//the current grass chunk blocks are stored globally
//so they can be accessed from the mouse click listener etc.
let chunk_blocks;
//array to store user-placed blocks
//if offline, this will be directly modified by us, otherwise
//the server will update this with its version of the blocks which we
//can ask to add or remove from
let user_blocks = [];
//global to store chunk_blocks and user_blocks
let blocks;
//object to store positions (cameras) of other players
let positions;
//sensitivity of mouse movement
let sens = 2;
//radius of HUD circle
let hud_radius = 4;
//wireframe for rendering
let wireframe = false;
//set of currently pressed keys
let pressed_keys = new Set();
//sun - updated to change during the day, see sun_times_s below
let light = {yaw: 30, pitch: 0, min_saturation: 0.3, min_lightness: 0.3};
//day and night lengths (sun revolution speed) in seconds
let sun_times_s = {day: 10, night: 1};

/******websocket*********/
//server address
let ws_server_ip = 'wss://joe.iddon.com:443/';
//position update interval
let pos_int_ms = 100;
//last position update
let pos_last_ms = -Infinity;

/*********player*******/
//player_height defined in objects.js
//name (used for websockets)
let name;
//position of camera, note that the actual 3d rendering viewpoint
//passed to zengine.render is transformed by the get_viewpoint() function before
let cam = {x: 0, y: 0, z: 1+player_height, yaw: 0, pitch: 0, roll: 0, fov: 90};
//should the viewpoint be behing the cam?
let third_person = false;
//distance of viewpoint behind cam
let shoulder_distance = 2;
//how far can we see?
let horizon = 16;
//speed, units per second
let speeds = {normal: 5, sprint: 15};
//are we sprinting?
let sprinting = false;
//do we use the light, or let zengine default (kinda like a torch)
let torch = false;

/*********jumping******/
let jump_spd = 0;         //units per second
let jump_init_spd = 16;   //units per second
let gravity = 64;         //units per second ^ 2

/*****anim. frame globals****/
//id returned from requestAnimationFrame
let update_id;
//timing globals (prefix indicates unit - seconds or milliseconds)
let time_diff_s;
let time_last_ms;

/********world*************/
//size of chunks (should be >= 2 * horizon - see world_generation.js)
let chunk_size = 32;
//perlin noise scale factor
let hill_height = 12;
//world seed - should be overridden by server, but if have to go offline,
//we will assign a random one now - !must be a char (uint8)!
let seed = parseInt(Math.random() * 256);

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
    update_sun();
    zengine.render(gen_world(), get_viewpoint(), cnvs, wireframe, false, torch ? 0 : light);
    render_names();
    render_hud();

    if (!offline && pos_last_ms + pos_int_ms < time_now_ms){
        //send next position as if we had sent at the right time
        pos_last_ms += pos_int_ms;
        send_position();
    }

    update_id = requestAnimationFrame(update);
}

function enter_the_blocks(){
    name_inpt.style.display = 'none';
    control_div.style.display = 'block';
    cnvs.style.backgroundColor = '#eea';
    document.removeEventListener('click', initial_click);
    cnvs.requestPointerLock();
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

/*********name input***************/

name_inpt.onfocus = () => {name_inpt.style.backgroundColor='#fff'};

/************canvas*********/

document.addEventListener('click', initial_click);

function initial_click(){
    //case of click when the offline message is showing ("click to continue")
    if (offline){
        enter_the_blocks();
        return;
    }
    //if, in all the time it took to type their name, we haven't been sent
    //positions, then go offline
    if (!positions) {
        enter_offline_mode('the server did not communicate who was online');
        //we will wait for next click to enter offline mode,
        //so dont request pointer lock or remove this event listener
        return;
    }
    //check we have inputted a name and that name is not already taken
    if (!name_inpt.value.length || name_inpt.value in positions){
        name_inpt.placeholder = name_inpt.value in positions ? 'name already taken' : 'name required';
        name_inpt.value = '';
        name_inpt.style.backgroundColor = '#faa';
        return;
    }
    //we have a name, set name, join game and show control div
    name = name_inpt.value;
    store_name();
    websocket.send(JSON.stringify({type: 'join', data: name}));

    enter_the_blocks();
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
        document.addEventListener('keydown', kd);
        document.addEventListener('keyup', ku);
    } else {
        pause();
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
    enter_offline_mode('server is down');
}

websocket.onclose = function(e){
    enter_offline_mode('closed connection unexpectedly');
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
    sprinting = e.shiftKey;
    if ('f'.includes(e.key)){
        switch (e.key){
            case 'f':
                wireframe = !wireframe;
            break;
        }
    } else {
        pressed_keys.add(e.key.toLowerCase());
    }
}

function ku(e){
    pressed_keys.delete(e.key.toLowerCase());
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
    //use a similar logic from zengine.js to effectively render each block,
    //for each block, we check if our click has intersected it and handle appropriately
    //i.e. read zengine.js for explanation :)
    let cam_vect = {x: Math.sin(zengine.to_rad(cam.yaw)) * Math.cos(zengine.to_rad(cam.pitch)),
                    y: Math.cos(zengine.to_rad(cam.yaw)) * Math.cos(zengine.to_rad(cam.pitch)),
                    z: Math.sin(zengine.to_rad(cam.pitch))}
    for (let i = 0; i < blocks.length; i++){
        //every object is just treated as a cube for speed
        let block = objects.cube().map(f => ({verts: f.verts.map(zengine.translate(blocks[i].x, blocks[i].y, blocks[i].z)),
                                              vect:  f.vect}))
                                  .sort((a,b)=>zengine.distance(cam, zengine.centroid(a.verts))-
                                               zengine.distance(cam, zengine.centroid(b.verts)));
        for (let j = 0; j < block.length; j++){
            let f = block[j].verts.map(zengine.translate(-cam.x, -cam.y, -cam.z))
                                  .map(zengine.z_axis_rotate(zengine.to_rad(cam.yaw)))
                                  .map(zengine.y_axis_rotate(zengine.to_rad(cam.roll)))
                                  .map(zengine.x_axis_rotate(zengine.to_rad(cam.pitch)))
                                  .map(zengine.translate(cam.x, cam.y, cam.z));
            //without the "infront of cam" check, blocks get placed behind us sometimes
            if (block[j].verts.every(c=>zengine.dot_prod({x: c.x-cam.x, y: c.y-cam.y, z: c.z-cam.z}, cam_vect) < 0)) continue;

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
                    user_blocks = user_blocks.filter(b=>!(b.x == blocks[i].x &&
                                                          b.y == blocks[i].y &&
                                                          b.z == blocks[i].z));
                if (!offline){
                    websocket.send(JSON.stringify({type:'block_remove', 'data': blocks[i]}));
                }
            } else {              //left click (place)
                let nb = {x: blocks[i].x + block[j].vect.x,
                          y: blocks[i].y + block[j].vect.y,
                          z: blocks[i].z + block[j].vect.z,
                          obj: 'cube'};
                //check if trying to place block where am standing, still return if was
                if (nb.x != Math.floor(cam.x) || nb.y != Math.floor(cam.y) || (nb.z != Math.floor(cam.z) && nb.z != Math.floor(cam.z)-1)){
                    if (offline){
                        user_blocks.push(nb);
                    } else {
                        websocket.send(JSON.stringify({type:'block_place', 'data': nb}));
                    }
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
    let sd = speeds[sprinting ? 'sprint' : 'normal'] * time_diff_s;
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
    if (offline) {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('offline mode', 10, cnvs.height-10);
    }
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
    let world = third_person ? objects.person(cam) : [];
    for (let i = 0; i < blocks.length; i++){
        if (zengine.distance(blocks[i], cam) > horizon) continue;
        world.push(...objects[blocks[i].obj]().map(
            f => ({verts: f.verts.map(zengine.translate(blocks[i].x,
                                                        blocks[i].y,
                                                        blocks[i].z)),
                   vect: f.vect,
                   col:  f.col})
        ));
    }
    for (let player in positions){
        if (player == name) continue;
        world.push(...objects.person(positions[player]));
    }
    return world;
}

function startup_screen(){
    ctx.fillStyle = '#fff';
    ctx.font = '128px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('blocks', cnvs.width/2, cnvs.height/2-128)
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1. enter your name:', cnvs.width/2-150, cnvs.height/2-20);
    ctx.fillText('2. click the purple to begin', cnvs.width/2-150, cnvs.height/2+60);
    ctx.textAlign = 'center';
    ctx.fillText('controls', cnvs.width/2, cnvs.height/2+90);
    let controls = [['movement', 'WASD'],
                    ['jump', 'space'],
                    ['sprint', 'shift'],
                    ['place', 'left click'],
                    ['delete', 'right click'],
                    ['pause', 'esc']];
    for (let i = 0; i < controls.length; i++){
        ctx.textAlign = 'right';
        ctx.fillText(controls[i][0]+' ', cnvs.width/2, cnvs.height/2 + 120 + 20 * i);
        ctx.textAlign = 'left';
        ctx.fillText(' ' + controls[i][1], cnvs.width/2, cnvs.height/2 + 120 + 20 * i);
    }
    ctx.textAlign = 'center';
    ctx.fillText('DISCLAIMER: I ACCEPT NO RESPONSIBILITY FOR THE PLAYING OF THIS GAME', cnvs.width/2, cnvs.height-20);
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
    //consider passing the viewpoint in as a param to save calculating
    //it twice :/
    let viewpoint = get_viewpoint();
    for (let player_name in positions){
        if (player_name == name) continue;
        let aligned = zengine.translate(viewpoint.x, viewpoint.y, viewpoint.z)(
                      zengine.x_axis_rotate(zengine.to_rad(viewpoint.pitch))(
                      zengine.y_axis_rotate(zengine.to_rad(viewpoint.roll))(
                      zengine.z_axis_rotate(zengine.to_rad(viewpoint.yaw))(
                      zengine.translate(-viewpoint.x, -viewpoint.y, -viewpoint.z)(positions[player_name])))));
        let centre_angles = {y: zengine.to_deg(Math.atan2(aligned.x - viewpoint.x, aligned.y - viewpoint.y)),
                             p: zengine.to_deg(Math.atan2(aligned.z - viewpoint.z, aligned.y - viewpoint.y))};

        let coord = {x: cnvs.width/2 + (centre_angles.y * (cnvs.width/viewpoint.fov)),
                     y: cnvs.height/2 - (centre_angles.p * (cnvs.width/viewpoint.fov))};

        ctx.font = '10px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(player_name, coord.x, coord.y);
    }
}

function enter_offline_mode(message){
    offline = true;
    name_inpt.style.display = 'none';
    chat_div.style.display = 'none';
    ctx.fillStyle = '#a00';
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);
    ctx.fillStyle = '#fff';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('server error!', cnvs.width/2, cnvs.height/2 - 100);
    ctx.font = '20px monospace';
    ctx.fillText('reason: [' + message + ']' , cnvs.width/2, cnvs.height/2);
    ctx.fillText('click to enter offline mode', cnvs.width/2, cnvs.height/2 + 50);
}

function pause(){
    ctx.fillStyle = 'rgba(255,0,0,0.4)';
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);
}

function update_sun(){
    //it is 180 here as day and night are 180 degrees each
    light.pitch += 180 * time_diff_s / (light.pitch > 180 ? sun_times_s.day : sun_times_s.night);
    light.pitch %= 360;
}

function get_viewpoint(){
    if (!third_person) return cam;
    let displacement = zengine.polar_to_cart(zengine.to_rad(cam.yaw), zengine.to_rad(cam.pitch));
    return {x: cam.x - shoulder_distance * displacement.x,
            y: cam.y - shoulder_distance * displacement.y,
            z: cam.z - shoulder_distance * displacement.z,
            yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll, fov: cam.fov};
}
