<?php
// Solo CLI dentro del contenedor aislado. Requiere haber corrido provision.php
// (curso genova-scorm-ci y alumno matriculado). Sube el .h5p exportado por GenOVA
// como actividad H5P con seguimiento de intentos (xAPI → mdl_h5pactivity_attempts).
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
$package = $argv[1] ?? '/tmp/genova.h5p';
$activity = $argv[2] ?? 'GenOVA actividades H5P';
$admin = get_admin();
\core\session\manager::set_user($admin);
$course = $DB->get_record('course', ['shortname' => 'genova-scorm-ci'], '*', MUST_EXIST);
$user = $DB->get_record('user', ['username' => 'alumno'], '*', MUST_EXIST);
$draft = file_get_unused_draft_itemid();
get_file_storage()->create_file_from_pathname(['contextid' => context_user::instance($admin->id)->id,
    'component' => 'user', 'filearea' => 'draft', 'itemid' => $draft,
    'filepath' => '/', 'filename' => basename($package)], $package);
$existing = $DB->get_record('h5pactivity', ['course' => $course->id, 'name' => $activity]);
if ($existing) {
    // Cada repetición prueba el paquete recién exportado.
    course_delete_module(get_coursemodule_from_instance('h5pactivity', $existing->id, $course->id)->id);
}
$info = (object)['course' => $course->id, 'name' => $activity,
    'modulename' => 'h5pactivity', 'module' => $DB->get_field('modules', 'id', ['name' => 'h5pactivity']),
    'section' => 1, 'visible' => 1, 'intro' => 'Actividades editables exportadas por GenOVA',
    'introformat' => FORMAT_HTML, 'packagefile' => $draft, 'enabletracking' => 1,
    'grademethod' => 1, 'grade' => 100, 'reviewmode' => 1, 'displayoptions' => 0,
    'completion' => 0, 'cmidnumber' => '', 'groupmode' => 0, 'groupingid' => 0];
$info = add_moduleinfo($info, $course);
$cm = get_coursemodule_from_instance('h5pactivity', $info->instance, $course->id);
echo json_encode(['course' => $course->id, 'cm' => $cm->id, 'h5pactivity' => $info->instance,
    'user' => $user->id]) . "\n";
