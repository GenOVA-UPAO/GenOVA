FROM moodlehq/moodle-php-apache:8.3
ENV APACHE_DOCUMENT_ROOT=/var/www/html
RUN curl -fsSL https://download.moodle.org/download.php/direct/stable405/moodle-4.5.8.tgz \
    | tar xz --strip-components=1 -C /var/www/html
COPY bootstrap.sh /usr/local/bin/genova-bootstrap
COPY provision.php provision_h5p.php provision_lti.php provision_lti_activity.php /opt/genova/
RUN chmod +x /usr/local/bin/genova-bootstrap
ENTRYPOINT ["/usr/local/bin/genova-bootstrap"]
