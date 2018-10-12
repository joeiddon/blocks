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

#check installed
if [ ! -f $DAEMON_DIR/$SERVICE_FILE ]
then
    echo "not installed"
    exit
fi

#print some log messages
echo "1: uninstalling blocks server"
echo "2: purging service unit ($SERVICE_NAME.service) in $DAEMON_DIR"
sudo rm $SERVICE_FILE $DAEMON_DIR
echo "3: regenerating systemd dependency trees"
sudo systemctl daemon-reload

echo "4: uninstall complete"
echo "sorry you didn't enjoy it!"
