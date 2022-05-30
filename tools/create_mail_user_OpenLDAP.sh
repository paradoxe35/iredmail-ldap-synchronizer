#!/usr/bin/env bash

# Author:   Zhang Huangbin (zhb _at_ iredmail.org)
# Purpose:  Add new OpenLDAP user for postfix mail server.
# Project:  iRedMail (http://www.iredmail.org/)

# --------------------------- WARNING ------------------------------
# This script only works under iRedMail >= 0.8.4 due to ldap schema
# changes.
# ------------------------------------------------------------------

# --------------------------- USAGE --------------------------------
# 1) Please change variables below to fit your env:
#
#   - In 'Global Setting' section:
#       * STORAGE_BASE_DIRECTORY
#
#   - In 'LDAP Setting' section:
#       * LDAP_SUFFIX
#       * BINDDN
#       * BINDPW
#       * QUOTA
#
#   - In 'Virtual Domains & Users' section:
#       * QUOTA
#       * TRANSPORT
#       * PASSWORD_SCHEME       # SSHA is recommended.
#       * DEFAULT_PASSWD
#       * USE_DEFAULT_PASSWD
#
#   - Optional variables:
#       * SEND_WELCOME_MSG
#
# 2) Execute this script with domain name and username (without @domain) directly:
#
#       shell# bash create_mail_user_OpenLDAP.sh example.com new_user
#
#    It will create a mail user with mail address "new_user@example.com".
#    To add multiple mail users, just list all usernames:
#
#       shell# bash create_mail_user_OpenLDAP.sh example.com new_user new_user2 new_user3
#
# ------------------------------------------------------------------

# Source functions.
. ../iredmail/conf/global
. ../iredmail/conf/core

# ----------------------------------------------
# ------------ Global Setting ------------------
# ----------------------------------------------
# Storage base directory used to store users' mail.
# mailbox of LDAP user will be:
#    ${STORAGE_BASE_DIRECTORY}/${DOMAIN_NAME}/${USERNAME}/
# Such as:
#    /var/vmail/vmail1/iredmail.org/zhb/
#   -------------------|===========|-----|
#   STORAGE_BASE_DIRECTORY|DOMAIN_NAME|USERNAME
#
STORAGE_BASE_DIRECTORY="/var/vmail/vmail1"

# ------------------------------------------------------------------
# -------------------------- LDAP Setting --------------------------
# ------------------------------------------------------------------
LDAP_SUFFIX="${IREDMAIL_LDAP_ROOT_DN}"

# Setting 'BASE_DN'.
BASE_DN="o=domains,${LDAP_SUFFIX}"

# Setting 'DOMAIN_NAME' and DOMAIN_DN':
#     * DOMAIN will be used in mail address: ${USERNAME}@${DOMAIN}
#    * DOMAIN_DN will be used in LDAP dn.
DOMAIN_NAME="$1"
DOMAIN_DN="domainName=${DOMAIN_NAME}"
OU_USER_DN="ou=Users"

# ---------- rootdn of LDAP Server ----------
# Setting rootdn of LDAP.
BINDDN="cn=Manager,${LDAP_SUFFIX}"

# Setting rootpw of LDAP.
BINDPW="${IREDMAIL_LDAP_BIND_PASSWORD}"

# ---------- Virtual Domains & Users --------------
# Set default quota for LDAP users: 104857600 = 100M
QUOTA='1048576000'

# Default MTA Transport (Defined in postfix master.cf).
TRANSPORT='dovecot'

# Password scheme. Support schemes: BCRYPT, SSHA512, SSHA, PLAIN.
PASSWORD_SCHEME='SSHA'
DEFAULT_PASSWD='888888'
USE_DEFAULT_PASSWD='NO'

# ------------------------------------------------------------------
# ------------------------- Welcome Msg ----------------------------
# ------------------------------------------------------------------
# Send a welcome mail after user created.
SEND_WELCOME_MSG='YES'

# Set welcome mail info.
WELCOME_MSG_SUBJECT="Welcome!"
WELCOME_MSG_BODY="Welcome, new user."

# -------------------------------------------
# ----------- End Global Setting ------------
# -------------------------------------------

# Time stamp, will be appended in maildir.
DATE="$(date +%Y.%m.%d.%H.%M.%S)"

STORAGE_BASE="$(dirname ${STORAGE_BASE_DIRECTORY})"
STORAGE_NODE="$(basename ${STORAGE_BASE_DIRECTORY})"

# Get days since 1970-01-01
EPOCH_SECONDS="$(date +%s)"
DAYS_SINCE_EPOCH="$((EPOCH_SECONDS / 24 / 60 / 60))"

generate_password_hash()
{
    # Usage: generate_password_hash <password-scheme> <plain-password>
    _scheme="${1}"
    _password="${2}"

    if [ X"${_scheme}" == X'BCRYPT' ]; then
        _scheme='BLF-CRYPT'
    fi

    doveadm pw -s "${_scheme}" -p "${_password}"
}

add_new_domain()
{
    domain="$(echo ${1} | tr '[A-Z]' '[a-z]')"
    ldapsearch -x -D "${BINDDN}" -w "${BINDPW}" -b "${BASE_DN}" | grep "domainName: ${domain}" >/dev/null

    if [ X"$?" != X"0" ]; then
        echo "Add new domain: ${domain}."

        ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: ${DOMAIN_DN},${BASE_DN}
objectClass: mailDomain
domainName: ${domain}
mtaTransport: ${TRANSPORT}
accountStatus: active
enabledService: mail
EOF
    else
        :
    fi

    ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: ${OU_USER_DN},${DOMAIN_DN},${BASE_DN}
objectClass: organizationalUnit
objectClass: top
ou: Users
EOF

    ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: ou=Groups,${DOMAIN_DN},${BASE_DN}
objectClass: organizationalUnit
objectClass: top
ou: Groups
EOF

    ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: ou=Aliases,${DOMAIN_DN},${BASE_DN}
objectClass: organizationalUnit
objectClass: top
ou: Aliases
EOF

    ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: ou=Externals,${DOMAIN_DN},${BASE_DN}
objectClass: organizationalUnit
objectClass: top
ou: Externals
EOF
}

add_new_user()
{
    USERNAME="$(echo $1 | tr [A-Z] [a-z])"
    MAIL="$( echo $2 | tr [A-Z] [a-z])"

    maildir="${DOMAIN_NAME}/$(hash_maildir ${USERNAME})"

    # Generate user password.
    if [ X"${USE_DEFAULT_PASSWD}" == X'YES' ]; then
        PASSWD="$(generate_password_hash ${PASSWORD_SCHEME} ${DEFAULT_PASSWD})"
    else
        PASSWD="$(generate_password_hash ${PASSWORD_SCHEME} ${USERNAME})"
    fi

    ldapadd -x -D "${BINDDN}" -w "${BINDPW}" <<EOF
dn: mail=${MAIL},${OU_USER_DN},${DOMAIN_DN},${BASE_DN}
objectClass: inetOrgPerson
objectClass: shadowAccount
objectClass: amavisAccount
objectClass: mailUser
objectClass: top
accountStatus: active
storageBaseDirectory: ${STORAGE_BASE}
homeDirectory: ${STORAGE_BASE_DIRECTORY}/${maildir}
mailMessageStore: ${STORAGE_NODE}/${maildir}
mail: ${MAIL}
mailQuota: ${QUOTA}
userPassword: ${PASSWD}
cn: ${USERNAME}
sn: ${USERNAME}
givenName: ${USERNAME}
uid: ${USERNAME}
shadowLastChange: ${DAYS_SINCE_EPOCH}
amavisLocal: TRUE
enabledService: internal
enabledService: doveadm
enabledService: lib-storage
enabledService: quota-status
enabledService: indexer-worker
enabledService: dsync
enabledService: mail
enabledService: pop3
enabledService: pop3secured
enabledService: pop3tls
enabledService: imap
enabledService: imapsecured
enabledService: imaptls
enabledService: smtp
enabledService: smtpsecured
enabledService: smtptls
enabledService: managesieve
enabledService: managesievesecured
enabledService: managesievetls
enabledService: sieve
enabledService: sievesecured
enabledService: sievetls
enabledService: deliver
enabledService: lda
enabledService: lmtp
enabledService: forward
enabledService: senderbcc
enabledService: recipientbcc
enabledService: shadowaddress
enabledService: displayedInGlobalAddressBook
enabledService: sogo
enabledService: sogowebmail
enabledService: sogocalendar
enabledService: sogoactivesync
EOF
}

send_welcome_mail()
{
    MAIL="$1"
    echo "Send a welcome mail to new user: ${MAIL}"

    echo "${WELCOME_MSG_BODY}" | mail -s "${WELCOME_MSG_SUBJECT}" ${MAIL}
}

usage()
{
    echo "Usage:"
    echo -e "\t$0 DOMAIN USERNAME"
    echo -e "\t$0 DOMAIN USER1 USER2 USER3 ..."
}

if [ $# -lt 2 ]; then
    usage
else
    # Promopt to check settings.
    [ X"${LDAP_SUFFIX}" == X"dc=example,dc=com" ] && echo "You should change 'LDAP_SUFFIX' in $0."

    # Get domain name.
    DOMAIN_NAME="$(echo $1 | tr '[A-Z]' '[a-z]')"
    shift 1

    add_new_domain ${DOMAIN_NAME}
    for i in $@; do
        USERNAME="$(echo $i | tr '[A-Z]' '[a-z]')"
        MAIL="${USERNAME}@${DOMAIN_NAME}"

        # Add new user in LDAP.
        add_new_user ${USERNAME} ${MAIL}

        # Send welcome msg to new user.
        [ X"${SEND_WELCOME_MSG}" == X'YES' ] && send_welcome_mail ${MAIL}
    done
fi