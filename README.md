# IredMail LDAP Synchronizer

## Getting started

This should be private and only admins and developers have permission to edit it.
Here are the tools you must have to get started (Test or Development).

- NodeJS
- Npm
- PNPM (install with: `npm install -g pnpm`)
- python3

## Description

This project aims to synchronize ldap entries (users) from an external LDAP server to the IredMail LDAP server.
Here are the supported operations:

- Create a user entry from the main ldap server and automatically synchronize it with the IredMail ldap server
- Update entry attributes
- Delete (Deleting is not really applicable, here we only change the userPassword attribute)

## Installation

**Clone the repository:**

```
git clone https://devops.icloudeng.com/icloudeng-developers/iredmail-ldap-synchronizer.git
```

**Install packages**

`pnpm install`

## Configuration

You must have the two following files at the root of the project: `.env` and `.env.ansible`

- `.env` used in development fase (not required if you plan to deploy the app)

- `.env.ansible` used during deploy phase, it needs to be configured as it will be cloned on the remote server and used as env variables for the application

**Variables required**

All of the following variables cannot be undefined or empty:

```
LDAP_IGNORE_USERS=postmaster@icloudeng.com
LDAP_MUST_HAVE_USER_PASSWORD=true
LDAP_DEFAULT_PASSWORD=888888

# IREDMAIL LDAP SERVER
IREDMAIL_LDAP_SERVER=
IREDMAIL_LDAP_ROOT_DN=
IREDMAIL_LDAP_BASE_DN=
IREDMAIL_LDAP_BIND_DN=
IREDMAIL_LDAP_BIND_PASSWORD=

# Mail LDAP SERVER
MAIN_LDAP_SERVER=
MAIN_LDAP_BASE_DN=
MAIN_LDAP_BIND_DN=
MAIN_LDAP_BIND_PASSWORD=
MAIN_LDAP_FILTER=(|(mailPrimaryAddress=*)(mail=*)(uid=*))

# Mail Notification SMTP Settings
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_TO=
```

## Test and Deploy

As explained on the topic above, the `.env.ansible` file must be present at the root of the project and must be configured.

**Ansible Install**

> it is recommended to use a virtual environment, you can create it with the following command:

Virtual environment: `python3 -m venv ansible/venv`

Activate it: `source ansible/venv/bin/activate`

**Install the packages (Ansible)**

`pip3 install ansible/requirements.txt -r`

## Authors and acknowledgment

@icloudeng

## License

...
