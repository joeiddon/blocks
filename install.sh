#! /bin/bash

PROG_NAME='blocks_server'
DAEMON_DIR='/etc/systemd/system'
BIN_DIR='/usr/local/bin'

echo "installing server"
echo "copying daemon files to $DAEMON_DIR"
sudo cp *.service $DAEMON_DIR
echo "creating symbolic link to server shell script in $BIN_DIR"
sudo ln -s $(pwd)/$PROG_NAME $BIN_DIR/$PROG_NAME
echo "install complete"
