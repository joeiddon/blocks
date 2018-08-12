#! /bin/bash

PROG_NAME='blocks_server'
DAEMON_DIR='/etc/systemd/system'
BIN_DIR='/usr/local/bin'

echo "uninstalling server"
echo "removing daemon files in $DAEMON_DIR"
for f in $(ls daemons); do
    sudo rm $DAEMON_DIR/$f
done

echo "removing symbolic link to server shell script in $BIN_DIR"
sudo rm $BIN_DIR/$PROG_NAME
echo "uninstall complete"
