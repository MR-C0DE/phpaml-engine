<?php
declare(strict_types=1);
$tables = [];
$path = __DIR__ . '/../src-js/core/html-entities.json';
$previous = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
foreach ([ENT_HTML401, ENT_XML1, ENT_XHTML, ENT_HTML5] as $doctype) {
    $tables[$doctype] = get_html_translation_table(HTML_ENTITIES, ENT_QUOTES | $doctype, 'UTF-8');
}
// HTML5 alternative names share characters; a character-to-entity table cannot enumerate them.
// The checked-in names come from the HTML5 named character references (also in Python html.entities).
// Refresh their values against PHP, retaining only aliases PHP actually recognizes.
$tables['aliases'] = [];
foreach (array_keys($previous['aliases'] ?? []) as $name) {
    $decoded = html_entity_decode($name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    if ($decoded !== $name) $tables['aliases'][$name] = $decoded;
}
file_put_contents($path, json_encode($tables, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
