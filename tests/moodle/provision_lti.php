<?php
// Solo CLI dentro del contenedor aislado. Requiere haber corrido provision.php (curso y alumno).
// Registra GenOVA como herramienta LTI 1.3 (clave pública RSA de GenOVA en argv[2], Deep
// Linking, AGS y envío de nombre/correo) y crea el docente matriculado como profesor.
// Imprime los datos de la plataforma que GenOVA necesita para registrarla.
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/mod/lti/locallib.php');
$tool = rtrim($argv[1] ?? 'http://localhost:8000', '/');
$publickey = file_get_contents($argv[2] ?? '/tmp/genova-lti.pem');
$admin = get_admin();
\core\session\manager::set_user($admin);
$course = $DB->get_record('course', ['shortname' => 'genova-scorm-ci'], '*', MUST_EXIST);

$teacher = $DB->get_record('user', ['username' => 'docente']);
if (!$teacher) {
    $teacher = (object)['username' => 'docente', 'password' => 'Genova-CI-2026!',
        'firstname' => 'Docente', 'lastname' => 'GenOVA', 'email' => 'docente@example.invalid',
        'auth' => 'manual', 'confirmed' => 1, 'mnethostid' => $CFG->mnet_localhost_id];
    $teacher->id = user_create_user($teacher);
}
$enrol = enrol_get_plugin('manual');
foreach (enrol_get_instances($course->id, true) as $instance) {
    if ($instance->enrol === 'manual') {
        $role = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);
        $enrol->enrol_user($instance, $teacher->id, $role->id);
    }
}

$type = $DB->get_record('lti_types', ['name' => 'GenOVA CI']);
if ($type) {
    lti_delete_type($type->id); // cada repetición registra la clave actual de GenOVA
}
$type = (object)['state' => LTI_TOOL_STATE_CONFIGURED, 'ltiversion' => LTI_VERSION_1P3,
    'clientid' => random_string(15), 'course' => SITEID];
$config = (object)[
    'lti_typename' => 'GenOVA CI', 'lti_toolurl' => "$tool/lti/launch", 'lti_ltiversion' => LTI_VERSION_1P3,
    'lti_keytype' => LTI_RSA_KEY, 'lti_publickey' => $publickey,
    'lti_initiatelogin' => "$tool/lti/login", 'lti_redirectionuris' => "$tool/lti/launch",
    'lti_contentitem' => 1, 'lti_toolurl_ContentItemSelectionRequest' => "$tool/lti/launch",
    'lti_coursevisible' => LTI_COURSEVISIBLE_ACTIVITYCHOOSER, 'lti_launchcontainer' => LTI_LAUNCH_CONTAINER_EMBED_NO_BLOCKS,
    'lti_sendname' => LTI_SETTING_ALWAYS, 'lti_sendemailaddr' => LTI_SETTING_ALWAYS,
    'lti_acceptgrades' => LTI_SETTING_ALWAYS, 'lti_forcessl' => 0,
    // AGS: «usar este servicio para sincronizar calificaciones y gestionar columnas».
    'ltiservice_gradesynchronization' => 2,
];
$typeid = lti_add_type($type, $config);
$type = $DB->get_record('lti_types', ['id' => $typeid], '*', MUST_EXIST);
echo json_encode([
    'typeid' => (int)$typeid, 'course' => (int)$course->id, 'teacher' => (int)$teacher->id,
    'issuer' => $CFG->wwwroot, 'client_id' => $type->clientid, 'deployment_id' => (string)$typeid,
    'auth_login_url' => "$CFG->wwwroot/mod/lti/auth.php", 'auth_token_url' => "$CFG->wwwroot/mod/lti/token.php",
    'jwks_url' => "$CFG->wwwroot/mod/lti/certs.php",
]) . "\n";
