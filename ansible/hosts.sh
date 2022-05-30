#!/usr/bin/env bash

set -u
: "${REMOTE_SERVER_HOST}"

set -u
: "${REMOTE_SERVER_USER}"

# Create ansible inventory file
echo "
[remoteserver]
$REMOTE_SERVER_HOST

[remoteserver:vars]
ansible_connection=ssh
ansible_user=$REMOTE_SERVER_USER
" > ansible/hosts