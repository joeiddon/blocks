#! /usr/bin/python3.6
import asyncio,websockets,json,random

PORT = 8000
USERS = set()       #set of WebSocketServerProtocol instances
POSITIONS = {}      #will store the positions in the format {user_name: {x: ,y: ,z: ,yaw: }, ...}
USER_BLOCKS = set() #stores the user placed blocks (orange cubes & eventually more) in format {x: ,y: ,z: ,obj: }
SEED = random.randint(0, 50) #seeds perlin noise func on client side to generate all grass terrain

#TODO:
# change try ... finally setup in handle_ws as assumes it is that websocket which looses connection, but an error could be thrown when sending to everyone
# (js side) block calling urself the same as someone else

def users_str():
    return 'online: ['+','.join(user.name for user in USERS)+']'

async def handle_leave(websocket):
    if hasattr(websocket, 'name'):
        POSITIONS.pop(websocket.name)
    USERS.remove(websocket)
    for user in USERS:
        try:
            await user.send(json.dumps({'type':'log', 'data': websocket.name+' left'}))
        except websockets.exceptions.ConnectionClosed:
            await handle_leave(user)

async def handle_ws(websocket, path):
    ip, port = websocket.remote_address
    USERS.add(websocket)
    await websocket.send(json.dumps({'type':'seed', 'data':SEED}))
    try:
        async for message in websocket:
            message = json.loads(message)
            if message['type'] == 'set_name':
                websocket.name = message['data']
                await websocket.send(json.dumps(
                    {'type':'log','data':'hello, '+websocket.name+'\n[ip: '+ip+']\n'+users_str()}
                ))
                await asyncio.wait([user.send(json.dumps(
                    {'type':'log','data':websocket.name+' joined'}
                )) for user in USERS])
            elif message['type'] == 'update_position':
                POSITIONS[websocket.name] = message['data']
            elif message['type'] == 'block_place':
                USER_BLOCKS.add(tuple(message['data'][k] for k in ['x','y','z','obj']))
            elif message['type'] == 'block_remove':
                t = tuple(message['data'][k] for k in ['x','y','z','obj'])
                if t in USER_BLOCKS:
                    USER_BLOCKS.remove(t)
            elif message['type'] == 'cmd':
                commands = ['help: list commands',
                            'ls: list users']
                if message['data'] == 'help':
                    await websocket.send(json.dumps({'type':'log','data':'\n'.join(commands)}))
                elif message['data'] == 'ls':
                    await websocket.send(json.dumps({'type':'log','data':users_str()}))
                else:
                    await asyncio.wait([user.send(json.dumps(
                        {'type':'log','data':websocket.name+': '+message['data']}
                    )) for user in USERS])
            else:
                print('message type', message['type'], 'not recognised')
    finally:
        await handle_leave(websocket)

async def broadcast():
    while True:
        if USERS:
            for user in USERS:
                try:
                    await user.send(json.dumps({'type':'positions', 'data': POSITIONS}))
                    await user.send(json.dumps({'type':'user_blocks', 'data': [dict(zip(['x','y','z','obj'],t)) for t in USER_BLOCKS]}))
                except websockets.exceptions.ConnectionClosed:
                    await handle_leave(user)
        await asyncio.sleep(0.02)

loop = asyncio.get_event_loop()
task = loop.create_task(broadcast())
loop.run_until_complete(websockets.serve(handle_ws,port=PORT))
loop.run_until_complete(task)
loop.run_forever()
