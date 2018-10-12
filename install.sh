#! /bin/bash

#setup stuf
SERVER_FILE="server.py"
SERVICE_FILE="blocks_server.service"
DAEMON_DIR="/etc/systemd/system"

#assure we are root (as modifying system files)
if [ $EUID -ne 0 ]
then
    echo "run as root"
    exit
fi

#check not already installed
if [ -f $DAEMON_DIR/$SERVICE_FILE ]
then
    echo "$SERVICE_FILE already exists in $DAEMON_DIR"
    echo "aborting"
    exit
fi

#print some log messages
echo "1: installing blocks server"
echo "2: creating service unit ($SERVICE_NAME.service) in $DAEMON_DIR"
#copy the service unit to the systemd directory
sudo cp $SERVICE_FILE $DAEMON_DIR
#append the absolute directory to the server file
echo "ExecStart=$PWD/server.py" >> $DAEMON_DIR/$SERVICE_FILE
echo "3: regenerating systemd dependency trees"
sudo systemctl daemon-reload

echo "4: install complete"
echo "use \`sudo systemctl start/stop/restart/status $SERVICE_FILE\` to control the server"
echo "note that you can drop the \`.service\` extension in the above command"
echo "please leave a star on GitHub!"
