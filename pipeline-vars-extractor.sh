#!/usr/bin/env bash

# Put all vars env from system into one .env.ansible file
# This file will be used by ansible to run the playbook from pipeline job.
echo  "
LDAP_IGNORE_USERS=$LDAP_IGNORE_USERS
LDAP_MUST_HAVE_USER_PASSWORD=$LDAP_MUST_HAVE_USER_PASSWORD
LDAP_DEFAULT_PASSWORD=$LDAP_DEFAULT_PASSWORD

# IREDMAIL LDAP SERVER ----------
IREDMAIL_LDAP_SERVER=$IREDMAIL_LDAP_SERVER
IREDMAIL_LDAP_ROOT_DN=$IREDMAIL_LDAP_ROOT_DN
IREDMAIL_LDAP_BASE_DN=$IREDMAIL_LDAP_BASE_DN
IREDMAIL_LDAP_BIND_DN=$IREDMAIL_LDAP_BIND_DN
IREDMAIL_LDAP_BIND_PASSWORD=$IREDMAIL_LDAP_BIND_PASSWORD

# Mail LDAP SERVER -----------
MAIN_LDAP_SERVER=$MAIN_LDAP_SERVER
MAIN_LDAP_BASE_DN=$MAIN_LDAP_BASE_DN
MAIN_LDAP_BIND_DN=$MAIN_LDAP_BIND_DN
MAIN_LDAP_BIND_PASSWORD=$MAIN_LDAP_BIND_PASSWORD
MAIN_LDAP_FILTER=$MAIN_LDAP_FILTER

# Mail Notification SMTP Settings -----------
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$SMTP_FROM
SMTP_TO=$SMTP_TO
" > .env.ansible