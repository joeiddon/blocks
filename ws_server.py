#! /usr/bin/python3.6
import asyncio,websockets,json,random

PORT = 8000
USERS = set()  #set of WebSocketServerProtocol instances
POSITIONS = {} #will store the positions in the format {user_name: {x: ,y: ,z: ,yaw: }, ...}
SEED = random.randint(0, 1000)

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
                    {'type':'log','data':'hello, '+websocket.name+'\n[ip: '+ip+']\nonline: ['+','.join(user.name for user in USERS)+']'}
                ))
                await asyncio.wait([user.send(json.dumps(
                    {'type':'log','data':websocket.name+' joined'}
                )) for user in USERS])
            elif message['type'] == 'update_position':
                POSITIONS[websocket.name] = message['data']
            else:
                print('message type', message['type'], 'not recognised')
    finally:
        POSITIONS.pop(websocket.name)
        USERS.remove(websocket)

async def broadcast():
    while True:
        if USERS:
            await asyncio.wait([user.send(json.dumps(
                {'type':'positions', 'data': POSITIONS}
            )) for user in USERS])
        await asyncio.sleep(0.05)

loop = asyncio.get_event_loop()
task = loop.create_task(broadcast())
loop.run_until_complete(websockets.serve(handle_ws,port=PORT))
loop.run_until_complete(task)
loop.run_forever()
