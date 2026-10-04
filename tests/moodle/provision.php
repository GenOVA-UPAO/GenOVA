<?php
// Solo CLI dentro del contenedor aislado; no endpoint público de provisioning.
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/mod/scorm/lib.php');
require_once($CFG->dirroot . '/mod/scorm/locallib.php');
require_once($CFG->dirroot . '/course/modlib.php');
$admin = get_admin();
\core\session\manager::set_user($admin);
$course = $DB->get_record('course', ['shortname' => 'genova-scorm-ci']);
if (!$course) {
    $course = create_course((object)['fullname' => 'GenOVA SCORM CI',
        'shortname' => 'genova-scorm-ci', 'category' => 1, 'format' => 'topics',
        'enablecompletion' => 1]);
}
$user = $DB->get_record('user', ['username' => 'alumno']);
if (!$user) {
    $user = (object)['username' => 'alumno', 'password' => 'Genova-CI-2026!',
        'firstname' => 'Alumno', 'lastname' => 'GenOVA', 'email' => 'alumno@example.invalid',
        'auth' => 'manual', 'confirmed' => 1, 'mnethostid' => $CFG->mnet_localhost_id];
    $user->id = user_create_user($user);
}
$enrol = enrol_get_plugin('manual');
$instances = enrol_get_instances($course->id, true);
$instance = null;
foreach ($instances as $candidate) { if ($candidate->enrol === 'manual') { $instance = $candidate; } }
if (!$instance) { $id = $enrol->add_instance($course); $instance = $DB->get_record('enrol', ['id' => $id]); }
$role = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
$enrol->enrol_user($instance, $user->id, $role->id);
$scorm = $DB->get_record('scorm', ['course' => $course->id, 'name' => 'GenOVA tres recursos']);
$draft = file_get_unused_draft_itemid();
$fs = get_file_storage();
$fs->create_file_from_pathname(['contextid' => context_user::instance($admin->id)->id,
    'component' => 'user', 'filearea' => 'draft', 'itemid' => $draft,
    'filepath' => '/', 'filename' => 'genova.zip'], '/tmp/genova.zip');
if (!$scorm) {
    $info = (object)['course' => $course->id, 'name' => 'GenOVA tres recursos',
        'modulename' => 'scorm', 'module' => $DB->get_field('modules', 'id', ['name' => 'scorm']),
        'section' => 1, 'visible' => 1, 'intro' => 'Paquete exportado por GenOVA desde fixtures reales',
        'introformat' => FORMAT_HTML, 'scormtype' => SCORM_TYPE_LOCAL, 'packagefile' => $draft,
        'grademethod' => GRADEHIGHEST, 'maxgrade' => 100, 'whatgrade' => HIGHESTATTEMPT,
        'maxattempt' => 0, 'forcecompleted' => 0, 'forcenewattempt' => 0,
        'lastattemptlock' => 0, 'auto' => 0, 'popup' => 0, 'width' => '100', 'height' => '700',
        'skipview' => 0, 'hidebrowse' => 1, 'hidetoc' => 0, 'displayattemptstatus' => 1,
        'completion' => 0, 'cmidnumber' => '', 'groupmode' => 0, 'groupingid' => 0];
    $info = add_moduleinfo($info, $course);
    $scorm = $DB->get_record('scorm', ['id' => $info->instance], '*', MUST_EXIST);
} else {
    // Cada repetición prueba el ZIP recién exportado, no una revisión antigua.
    $scorm->instance = $scorm->id;
    $scorm->coursemodule = get_coursemodule_from_instance('scorm', $scorm->id, $course->id)->id;
    $scorm->packagefile = $draft;
    scorm_update_instance($scorm);
}
$cm = get_coursemodule_from_instance('scorm', $scorm->id, $course->id);
$sco = $DB->get_record_select('scorm_scoes', 'scorm = ? AND launch <> ?', [$scorm->id, ''], '*', MUST_EXIST);
echo json_encode(['course' => $course->id, 'cm' => $cm->id, 'scorm' => $scorm->id,
    'sco' => $sco->id, 'user' => $user->id]) . "\n";
