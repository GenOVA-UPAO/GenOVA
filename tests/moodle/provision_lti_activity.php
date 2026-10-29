<?php
// Solo CLI. Crea la actividad «Herramienta externa» con los datos que devolvió el Deep
// Linking de GenOVA (argv[1]: JSON que Moodle pasa a mod_lti/contentitem_return), como
// hace el formulario de Moodle al guardar tras «Seleccionar contenido». argv[2]: typeid.
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->dirroot . '/mod/lti/locallib.php');
$item = json_decode($argv[1], true, 512, JSON_THROW_ON_ERROR);
$typeid = (int)$argv[2];
$admin = get_admin();
\core\session\manager::set_user($admin);
$course = $DB->get_record('course', ['shortname' => 'genova-scorm-ci'], '*', MUST_EXIST);
foreach ($DB->get_records('lti', ['course' => $course->id, 'name' => $item['name']]) as $old) {
    course_delete_module(get_coursemodule_from_instance('lti', $old->id, $course->id)->id);
}
$info = (object)array_merge([
    'course' => $course->id, 'modulename' => 'lti', 'module' => $DB->get_field('modules', 'id', ['name' => 'lti']),
    'section' => 1, 'visible' => 1, 'typeid' => $typeid, 'intro' => '', 'introformat' => FORMAT_HTML,
    'securetoolurl' => '', 'icon' => '', 'secureicon' => '', 'showtitlelaunch' => 1, 'showdescriptionlaunch' => 0,
    'completion' => 0, 'cmidnumber' => '', 'groupmode' => 0, 'groupingid' => 0,
    'grade' => (int)($item['grade_modgrade_point'] ?? 100),
], array_intersect_key($item, array_flip([
    'name', 'toolurl', 'instructorchoiceacceptgrades', 'lineitemresourceid', 'lineitemtag',
    'instructorchoicesendname', 'instructorchoicesendemailaddr', 'launchcontainer', 'instructorcustomparameters',
])));
$info = add_moduleinfo($info, $course);
$cm = get_coursemodule_from_instance('lti', $info->instance, $course->id);
$student = $DB->get_record('user', ['username' => 'alumno'], '*', MUST_EXIST);
echo json_encode(['cm' => (int)$cm->id, 'lti' => (int)$info->instance, 'course' => (int)$course->id,
    'student' => (int)$student->id]) . "\n";
