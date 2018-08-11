#! /usr/bin/python3.6
import asyncio,websockets,json

PORT = 8000
USERS = set()  #set of WebSocketServerProtocol instances
POSITIONS = {} #will store the positions in the format {user_name: {x: ,y: ,z: ,yaw: }, ...}
WORLD = []     #blocks array: [{x: ,y: ,z: ,obj: }]

async def handle_ws(websocket, path):
    ip, port = websocket.remote_address
    print(ip)
    USERS.add(websocket)
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

async def broadcast_positions():
    while True:
        if USERS:
            await asyncio.wait([user.send(json.dumps(
                {'type':'positions', 'data': POSITIONS}
            )) for user in USERS])
        await asyncio.sleep(0.1)

loop = asyncio.get_event_loop()
task = loop.create_task(broadcast_positions())
loop.run_until_complete(websockets.serve(handle_ws,port=PORT))
loop.run_until_complete(task)
loop.run_forever()
