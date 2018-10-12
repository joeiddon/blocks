#! /usr/bin/python3.6
import asyncio,websockets,json,random,ssl

PORT = 443
USERS = set()       #set of WebSocketServerProtocol instances
POSITIONS = {}      #will store the positions in the format {user_name: {x: ,y: ,z: ,yaw: }, ...}
USER_BLOCKS = set() #stores the user placed blocks (orange cubes & eventually more) in format {x: ,y: ,z: ,obj: }
SEED = random.randint(0, 50) #seeds perlin noise func on client side to generate all grass terrain

#TODO:
# (js side) block calling urself the same as someone else

def users_str():
    return 'online: ['+','.join(user.name for user in USERS)+']'

async def broadcast(dic):
    for user in USERS.copy():
        try:
            await user.send(json.dumps(dic))
        except websockets.exceptions.ConnectionClosed:
            await handle_leave(user)

async def send(websocket, dic):
    try:
        await websocket.send(json.dumps(dic))
    except websockets.exceptions.ConnectionClosed:
        await handle_leave(websocket)

async def handle_leave(websocket):
    if websocket in USERS:
        USERS.remove(websocket)
    if websocket.name in POSITIONS:
        POSITIONS.pop(websocket.name)
        await broadcast({'type':'log', 'data': websocket.name+' left'})

async def handle_ws(websocket, path):
    ip, port = websocket.remote_address
    await send(websocket, {'type':'seed', 'data': SEED})
    await send(websocket, {'type':'positions', 'data':POSITIONS})
    try:
        async for message in websocket:
            message = json.loads(message)
            if message['type'] == 'join':
                    if message['data'] in (user.name for user in USERS):
                        print('managed to choose someone elses name?')
                        await websocket.close()
                        break
                    websocket.name = message['data']
                    USERS.add(websocket)
                    await send(websocket, {'type':'log','data':'hello, '+websocket.name+'\n[ip: '+ip+']\n'+users_str()})
                    await broadcast({'type':'log','data':websocket.name+' joined'})
            elif not hasattr(websocket, 'name'):  ##TEST THIS
                print('different mesage type before a succesfull query_name')
                await websocket.close()
                break
            elif message['type'] == 'update_position':
                POSITIONS[websocket.name] = message['data']
            elif message['type'] == 'block_place':
                #stored as tuples as set
                USER_BLOCKS.add(tuple(message['data'][k] for k in ['x','y','z','obj']))
            elif message['type'] == 'block_remove':
                t = tuple(message['data'][k] for k in ['x','y','z','obj'])
                if t in USER_BLOCKS:
                    USER_BLOCKS.remove(t)
            elif message['type'] == 'cmd':
                commands = ['help: list commands',
                            'ls: list users']
                if message['data'] == 'help':
                    await send(websocket, {'type':'log','data':'\n'.join(commands)})
                elif message['data'] == 'ls':
                    await send(websocket, {'type':'log','data':users_str()})
                else:
                    await broadcast({'type':'log','data':websocket.name+': '+message['data']})
            else:
                print('message type', message['type'], 'not recognised')
    except:
        handle_leave(websocket);

async def pinger():
    while True:
        await broadcast({'type':'positions', 'data': POSITIONS})
        await broadcast({'type':'user_blocks', 'data': [dict(zip(['x','y','z','obj'],t)) for t in USER_BLOCKS]})
        await asyncio.sleep(0.02)


ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certfile='/etc/letsencrypt/live/joe.iddon.com/fullchain.pem',
                            keyfile ='/etc/letsencrypt/live/joe.iddon.com/privkey.pem')
loop = asyncio.get_event_loop()
task = loop.create_task(pinger())
loop.run_until_complete(websockets.serve(handle_ws,port=PORT,ssl=ssl_context))
#loop.run_until_complete(websockets.serve(handle_ws,port=PORT))
loop.run_until_complete(task)
loop.run_forever()
