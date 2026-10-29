#!/bin/sh
set -eu
cd /var/www/html
if [ -f /var/genova-config/config.php ]; then
  cp /var/genova-config/config.php config.php
fi
if [ ! -f config.php ]; then
  php admin/cli/install.php --non-interactive --agree-license \
    --wwwroot=${MOODLE_WWWROOT:-http://localhost:8081} --dataroot=/var/moodledata \
    --dbtype=pgsql --dbhost=db --dbname=moodle --dbuser=moodle --dbpass=moodle-local-ci \
    --fullname='GenOVA CI Moodle' --shortname=genova-ci \
    --adminuser=admin --adminpass='Genova-CI-2026!' --adminemail=admin@example.invalid
  cp config.php /var/genova-config/config.php
fi
# El puerto publicado es configurable (MOODLE_PORT): wwwroot debe coincidir con él.
if [ -n "${MOODLE_WWWROOT:-}" ]; then
  sed -i "s#^\$CFG->wwwroot *=.*#\$CFG->wwwroot   = '${MOODLE_WWWROOT}';#" config.php
fi
chown root:www-data config.php
chmod 640 config.php
chown -R www-data:www-data /var/moodledata
exec apache2-foreground
