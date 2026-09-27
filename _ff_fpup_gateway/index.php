<?php
// Account/mobile gateway routes synced 2026-09-27.
declare(strict_types=1);

const FF_ORIGIN = 'https://familyflats-field-capture-v1.onrender.com';
const FF_CANONICAL = 'https://www.familyandflats.com';

function ff_allowed_path(string $path): bool {
    $top = [
        '_next','access-denied','access','account','agent','ai-operating-model','ai-organization',
        'architecture-audit','architecture-truth','auth','business-control-autopilot',
        'chief-of-staff','client-property','client','communication-autopilot',
        'data-foundation','data-readiness','enterprise-direction','enterprise-intelligence',
        'execution-centre','field','field-admin','founder','founder-command','governance',
        'integration-readiness','inventory-autopilot','journey','login','mission-control',
        'operating-systems','operational-adoption','operations-documentation-autopilot',
        'os','owner','platform-control','post-property','production-platform',
        'property-submission','release-assurance','revenue-engine','security-access',
        'website-publication','workflow-validation','workspace'
    ];
    $api = ['account','auth','property-intake','field-media','local-auth','health','publication'];
    $trim = ltrim($path, '/');
    $first = explode('/', $trim, 2)[0] ?? '';
    if (in_array($first, $top, true)) return true;
    if ($first === 'api') {
        $parts = explode('/', $trim);
        return in_array($parts[1] ?? '', $api, true);
    }
    return false;
}

function ff_rewrite_value(string $value): string {
    return str_replace(
        [
            'https://familyflats-field-capture-v1.onrender.com',
            'https://field.familyandflats.com',
            'https%3A%2F%2Ffamilyflats-field-capture-v1.onrender.com',
            'https%3A%2F%2Ffield.familyandflats.com'
        ],
        [
            FF_CANONICAL,
            FF_CANONICAL,
            rawurlencode(FF_CANONICAL),
            rawurlencode(FF_CANONICAL)
        ],
        $value
    );
}

function ff_flatten_files(array $files): array {
    $out = [];
    foreach ($files as $field => $spec) {
        if (!is_array($spec) || !isset($spec['name'])) continue;

        if (is_array($spec['name'])) {
            foreach ($spec['name'] as $i => $name) {
                $error = $spec['error'][$i] ?? UPLOAD_ERR_NO_FILE;
                if ($error !== UPLOAD_ERR_OK) continue;
                $out[] = [
                    'field' => $field,
                    'tmp_name' => $spec['tmp_name'][$i] ?? '',
                    'name' => $name,
                    'type' => $spec['type'][$i] ?? 'application/octet-stream',
                ];
            }
        } else {
            if (($spec['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
            $out[] = [
                'field' => $field,
                'tmp_name' => $spec['tmp_name'] ?? '',
                'name' => $spec['name'] ?? 'upload.bin',
                'type' => $spec['type'] ?? 'application/octet-stream',
            ];
        }
    }
    return $out;
}

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$parts = parse_url($uri);
$path = $parts['path'] ?? '/';

if (!ff_allowed_path($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

$target = FF_ORIGIN . $path;
if (!empty($parts['query'])) $target .= '?' . $parts['query'];

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
$outHeaders = [];
foreach ($incomingHeaders as $name => $value) {
    $lower = strtolower((string)$name);
    if (in_array($lower, ['host','content-length','connection','accept-encoding','content-type'], true)) continue;
    $outHeaders[] = $name . ': ' . $value;
}
$outHeaders[] = 'X-Forwarded-Host: www.familyandflats.com';
$outHeaders[] = 'X-Forwarded-Proto: https';
$outHeaders[] = 'X-Forwarded-Port: 443';
if (!empty($_SERVER['REMOTE_ADDR'])) $outHeaders[] = 'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'];

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $outHeaders);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_ENCODING, '');
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 300);

$contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
if (!in_array($method, ['GET','HEAD'], true)) {
    if (str_starts_with($contentType, 'multipart/form-data')) {
        $payload = [];
        foreach ($_POST as $k => $v) {
            if (is_scalar($v)) $payload[$k] = (string)$v;
        }
        foreach (ff_flatten_files($_FILES) as $file) {
            $payload[$file['field']] = new CURLFile(
                $file['tmp_name'],
                $file['type'],
                $file['name']
            );
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    } else {
        $body = file_get_contents('php://input');
        if ($body === false) $body = '';
        if (!empty($_SERVER['CONTENT_TYPE'])) {
            $outHeaders[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
            curl_setopt($ch, CURLOPT_HTTPHEADER, $outHeaders);
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Gateway upstream error';
    curl_close($ch);
    exit;
}

$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headerBlock = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
$responseType = (string)(curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '');
curl_close($ch);

http_response_code($status);
$blocks = preg_split("/\r\n\r\n|\n\n|\r\r/", trim($headerBlock));
$finalHeaders = $blocks ? end($blocks) : '';
foreach (preg_split("/\r\n|\n|\r/", (string)$finalHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0 || strpos($line, ':') === false) continue;
    [$name, $value] = explode(':', $line, 2);
    $name = trim($name);
    $value = trim($value);
    $lower = strtolower($name);
    if (in_array($lower, ['transfer-encoding','content-length','connection','server','date','content-encoding'], true)) continue;
    if ($lower === 'location' || $lower === 'set-cookie') $value = ff_rewrite_value($value);
    header($name . ': ' . $value, false);
}

if (
    stripos($responseType, 'text/') === 0 ||
    stripos($responseType, 'application/json') === 0 ||
    stripos($responseType, 'application/javascript') === 0 ||
    stripos($responseType, 'application/xhtml+xml') === 0
) {
    $body = ff_rewrite_value($body);
}
if ($method !== 'HEAD') echo $body;
