<?php
declare(strict_types=1);

const FF_PUBLICATION_CONTRACT_VERSION = '1.0';
const FF_PUBLICATION_RESULT = 'stored_by_cpanel_publication_receiver';
const FF_PUBLICATION_FIELD_ORDER = [
    'id',
    'type',
    'status',
    'visibilityStatus',
    'dataQualityStatus',
    'title',
    'project',
    'projectCode',
    'projectSlug',
    'projectUrl',
    'developer',
    'location',
    'locality',
    'bhk',
    'propertyType',
    'size',
    'sizeSqft',
    'floor',
    'facing',
    'furnishing',
    'availability',
    'possessionStatus',
    'transactionType',
    'price',
    'priceValue',
    'rent',
    'image',
    'gallery',
    'imageState',
    'detailUrl',
    'description',
    'highlights',
    'seoTitle',
    'seoDescription',
    'seoIndexStatus',
    'seoIndexReason',
    'lastSeoReviewedAt',
    'publishedVersion',
    'sourceUpdatedAt',
];

function ff_publication_handle_http_request(): void
{
    $headers = ff_publication_headers();
    $result = ff_publication_receive([
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'configuredSecret' => getenv('WEBSITE_PUBLISH_SECRET') ?: '',
        'secretHeader' => ff_publication_header($headers, 'x-familyflats-publish-secret'),
        'idempotencyHeader' => ff_publication_header($headers, 'idempotency-key'),
        'rawBody' => file_get_contents('php://input') ?: '',
        'websiteRoot' => realpath(__DIR__ . '/../..') ?: dirname(__DIR__, 2),
        'runtimeRoot' => __DIR__ . '/runtime',
    ]);

    http_response_code((int) $result['httpStatus']);
    header('Content-Type: application/json; charset=utf-8');
    echo ff_publication_json($result['body']);
}

function ff_publication_receive(array $input): array
{
    $method = strtoupper(ff_publication_clean($input['method'] ?? ''));
    $secretHeader = ff_publication_clean($input['secretHeader'] ?? '');
    $idempotencyHeader = ff_publication_clean($input['idempotencyHeader'] ?? '');
    $rawBody = (string) ($input['rawBody'] ?? '');
    $websiteRoot = (string) ($input['websiteRoot'] ?? '');
    $runtimeRoot = (string) ($input['runtimeRoot'] ?? (__DIR__ . '/runtime'));
    $configuredSecret = ff_publication_resolve_secret($input, $websiteRoot);

    if ($method !== 'POST') {
        return ff_publication_fail(405, 'METHOD_NOT_ALLOWED', 'Website publication receiver accepts POST only.');
    }

    if ($configuredSecret === '') {
        return ff_publication_fail(503, 'WEBSITE_PUBLISH_SECRET_NOT_CONFIGURED', 'Website publication receiver is not configured.', true);
    }

    if ($secretHeader === '') {
        return ff_publication_fail(401, 'WEBSITE_PUBLISH_SECRET_REQUIRED', 'Website publication authorization is required.');
    }

    if (!hash_equals($configuredSecret, $secretHeader)) {
        return ff_publication_fail(401, 'WEBSITE_PUBLISH_SECRET_INVALID', 'Website publication authorization failed.');
    }

    $parsed = json_decode($rawBody, true);
    if (!is_array($parsed) || array_is_list($parsed)) {
        return ff_publication_fail(400, 'MALFORMED_JSON', 'Website publication request body must be a valid JSON object.');
    }

    $validation = ff_publication_validate_envelope($parsed, $idempotencyHeader);
    if ($validation !== null) {
        return $validation;
    }

    $publication = ff_publication_canonicalize($parsed['publication']);
    $computedHash = ff_publication_payload_hash($publication);
    if (!hash_equals((string) $parsed['payloadHash'], $computedHash)) {
        return ff_publication_fail(400, 'PAYLOAD_HASH_MISMATCH', 'Website publication payload hash does not match.');
    }

    $requestFingerprint = ff_publication_fingerprint([
        'contractVersion' => $parsed['contractVersion'],
        'operation' => $parsed['operation'],
        'listingId' => $parsed['listingId'],
        'listingVersion' => $parsed['listingVersion'],
        'authorizedVersion' => $parsed['authorizedVersion'],
        'idempotencyKey' => $parsed['idempotencyKey'],
        'payloadHash' => $parsed['payloadHash'],
        'requestedBy' => $parsed['requestedBy'],
        'publication' => $publication,
    ]);

    $statePath = ff_publication_state_path($runtimeRoot, (string) $parsed['idempotencyKey']);
    $existingState = ff_publication_read_json_file($statePath, false);
    if (is_array($existingState)) {
        if (($existingState['requestFingerprint'] ?? '') !== $requestFingerprint) {
            return ff_publication_fail(409, 'IDEMPOTENCY_CONFLICT', 'Website publication idempotency key conflicts with an existing request.');
        }

        $receipt = $existingState['receipt'] ?? null;
        if (is_array($receipt)) {
            return ff_publication_success($receipt);
        }

        return ff_publication_fail(409, 'IDEMPOTENCY_CONFLICT', 'Website publication idempotency state is invalid.');
    }

    $materialized = ff_publication_materialize_feeds($websiteRoot, $publication, (string) $parsed['operation'], (bool) ($input['simulateAtomicWriteFailure'] ?? false));
    if ($materialized['ok'] !== true) {
        return ff_publication_fail(500, (string) $materialized['code'], (string) $materialized['message']);
    }

    $receipt = [
        'ok' => true,
        'contractVersion' => FF_PUBLICATION_CONTRACT_VERSION,
        'listingId' => (string) $parsed['listingId'],
        'operation' => (string) $parsed['operation'],
        'idempotencyKey' => (string) $parsed['idempotencyKey'],
        'websiteRecordVersion' => (int) $parsed['authorizedVersion'],
        'publishedVersion' => (int) $publication['publishedVersion'],
        'payloadHash' => (string) $parsed['payloadHash'],
        'publicUrl' => (string) $publication['detailUrl'],
        'processedAt' => (string) $parsed['requestedAt'],
        'result' => FF_PUBLICATION_RESULT,
    ];

    $state = [
        'idempotencyKey' => (string) $parsed['idempotencyKey'],
        'listingId' => (string) $parsed['listingId'],
        'requestFingerprint' => $requestFingerprint,
        'publicationFingerprint' => ff_publication_fingerprint($publication),
        'payloadHash' => (string) $parsed['payloadHash'],
        'operation' => (string) $parsed['operation'],
        'publicUrl' => (string) $publication['detailUrl'],
        'acceptedVersion' => (int) $parsed['authorizedVersion'],
        'receipt' => $receipt,
    ];

    if (!ff_publication_atomic_write($statePath, ff_publication_json($state))) {
        return ff_publication_fail(500, 'IDEMPOTENCY_STATE_WRITE_FAILED', 'Website publication idempotency state could not be written.');
    }

    return ff_publication_success($receipt);
}

function ff_publication_validate_envelope(array $envelope, string $idempotencyHeader): ?array
{
    if (($envelope['contractVersion'] ?? null) !== FF_PUBLICATION_CONTRACT_VERSION) {
        return ff_publication_fail(400, 'CONTRACT_VERSION_UNSUPPORTED', 'Website publication contract version is unsupported.');
    }

    if (!in_array($envelope['operation'] ?? null, ['CREATE', 'UPDATE'], true)) {
        return ff_publication_fail(400, 'OPERATION_UNSUPPORTED', 'Website publication operation is unsupported.');
    }

    foreach (['listingId', 'idempotencyKey', 'payloadHash', 'requestedAt', 'requestedBy'] as $field) {
        if (ff_publication_clean($envelope[$field] ?? '') === '') {
            return ff_publication_fail(400, 'ENVELOPE_INVALID', 'Website publication envelope is missing required fields.');
        }
    }

    foreach (['listingVersion', 'authorizedVersion'] as $field) {
        if (!ff_publication_positive_int($envelope[$field] ?? null)) {
            return ff_publication_fail(400, 'ENVELOPE_INVALID', 'Website publication envelope is missing required version fields.');
        }
    }

    if ($idempotencyHeader !== (string) $envelope['idempotencyKey']) {
        return ff_publication_fail(409, 'IDEMPOTENCY_KEY_MISMATCH', 'Website publication idempotency header does not match the envelope.');
    }

    if (!isset($envelope['publication']) || !is_array($envelope['publication']) || array_is_list($envelope['publication'])) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload is invalid.');
    }

    $publicationValidation = ff_publication_validate_payload($envelope['publication']);
    if ($publicationValidation !== null) {
        return $publicationValidation;
    }

    if ((string) $envelope['publication']['id'] !== (string) $envelope['listingId']) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload does not match the listing.');
    }

    if ((int) $envelope['publication']['publishedVersion'] !== (int) $envelope['authorizedVersion']) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload version does not match authorization.');
    }

    return null;
}

function ff_publication_validate_payload(array $payload): ?array
{
    $requiredStrings = [
        'id',
        'title',
        'project',
        'projectSlug',
        'projectUrl',
        'developer',
        'location',
        'locality',
        'bhk',
        'image',
        'detailUrl',
        'description',
        'seoTitle',
        'seoDescription',
        'seoIndexStatus',
        'sourceUpdatedAt',
    ];

    foreach ($requiredStrings as $field) {
        if (ff_publication_clean($payload[$field] ?? '') === '') {
            return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload is missing required public fields.');
        }
    }

    if (!in_array($payload['type'] ?? null, ['Sale', 'Lease'], true)) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload type is invalid.');
    }

    if (($payload['status'] ?? null) !== 'active' || ($payload['visibilityStatus'] ?? null) !== 'ready' || ($payload['dataQualityStatus'] ?? null) !== 'approved') {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload readiness fields are invalid.');
    }

    if (($payload['propertyType'] ?? null) !== 'Flat') {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload property type is invalid.');
    }

    if (!in_array($payload['transactionType'] ?? null, ['Sale', 'Lease'], true)) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload transaction type is invalid.');
    }

    if (($payload['imageState'] ?? null) !== 'approved-image') {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload image state is invalid.');
    }

    if (!is_array($payload['gallery'] ?? null)) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload gallery is invalid.');
    }

    if (!is_array($payload['highlights'] ?? null) || count($payload['highlights']) === 0) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload highlights are invalid.');
    }

    foreach ($payload['highlights'] as $highlight) {
        if (ff_publication_clean($highlight) === '') {
            return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload highlights are invalid.');
        }
    }

    if (!ff_publication_positive_int($payload['publishedVersion'] ?? null)) {
        return ff_publication_fail(400, 'PUBLICATION_PAYLOAD_INVALID', 'Website publication payload published version is invalid.');
    }

    return null;
}

function ff_publication_resolve_secret(array $input, string $websiteRoot): string
{
    $environmentSecret = ff_publication_clean($input['configuredSecret'] ?? '');
    if ($environmentSecret !== '') {
        return $environmentSecret;
    }

    $privateSecretPath = ff_publication_clean($input['privateSecretPath'] ?? '');
    if ($privateSecretPath === '') {
        $privateSecretPath = ff_publication_private_secret_path($websiteRoot);
    }

    return ff_publication_read_private_secret($privateSecretPath);
}

function ff_publication_private_secret_path(string $websiteRoot): string
{
    $normalisedRoot = rtrim($websiteRoot, "\\/");
    if (str_contains($normalisedRoot, '/')) {
        $homeRoot = preg_replace('#/[^/]+$#', '', $normalisedRoot);
        $homeRoot = is_string($homeRoot) && $homeRoot !== '' ? $homeRoot : $normalisedRoot;
        return $homeRoot . '/.familyflats/website_publish_secret';
    }

    $homeRoot = dirname($normalisedRoot);
    return $homeRoot . DIRECTORY_SEPARATOR . '.familyflats' . DIRECTORY_SEPARATOR . 'website_publish_secret';
}

function ff_publication_read_private_secret(string $path): string
{
    if ($path === '' || !is_file($path) || !is_readable($path)) {
        return '';
    }

    $contents = file_get_contents($path);
    if (!is_string($contents)) {
        return '';
    }

    $secret = trim($contents);
    if ($secret === '' || preg_match('/[\r\n\x00-\x1F\x7F]/', $secret) === 1) {
        return '';
    }

    return $secret;
}

function ff_publication_materialize_feeds(string $websiteRoot, array $publication, string $operation, bool $simulateAtomicWriteFailure = false): array
{
    $dataRoot = rtrim($websiteRoot, "\\/") . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data';
    $commandCenterRoot = $dataRoot . DIRECTORY_SEPARATOR . 'command-center';
    $allPath = $commandCenterRoot . DIRECTORY_SEPARATOR . 'listings.json';
    $salePath = $commandCenterRoot . DIRECTORY_SEPARATOR . 'sale-listings.json';
    $leasePath = $commandCenterRoot . DIRECTORY_SEPARATOR . 'lease-listings.json';
    $jsPath = $dataRoot . DIRECTORY_SEPARATOR . 'listings.js';

    $existingAll = ff_publication_existing_public_records($allPath, $jsPath);
    if ($existingAll['ok'] !== true) {
        return $existingAll;
    }

    $records = $existingAll['records'];
    $publicRecord = ff_publication_public_record($publication);
    $existingIndex = ff_publication_find_listing_index($records, (string) $publicRecord['id']);

    if ($operation === 'CREATE' && $existingIndex !== null) {
        $existingFingerprint = ff_publication_fingerprint($records[$existingIndex]);
        $incomingFingerprint = ff_publication_fingerprint($publicRecord);
        if ($existingFingerprint !== $incomingFingerprint) {
            return [
                'ok' => false,
                'code' => 'CREATE_CONFLICT',
                'message' => 'CREATE cannot overwrite an existing listing with different public state.',
            ];
        }
    }

    if ($existingIndex === null) {
        $records[] = $publicRecord;
    } else {
        $records[$existingIndex] = $publicRecord;
    }

    usort($records, static function (array $left, array $right): int {
        return strcmp((string) ($left['id'] ?? ''), (string) ($right['id'] ?? ''));
    });

    $saleRecords = array_values(array_filter($records, static fn(array $record): bool => ($record['type'] ?? '') === 'Sale'));
    $leaseRecords = array_values(array_filter($records, static fn(array $record): bool => ($record['type'] ?? '') === 'Lease'));

    $payloads = [
        $allPath => ff_publication_json($records),
        $salePath => ff_publication_json($saleRecords),
        $leasePath => ff_publication_json($leaseRecords),
        $jsPath => "window.FF_LISTINGS = " . ff_publication_json($records) . ";\n",
    ];

    foreach ($payloads as $path => $contents) {
        if ($contents === '' || !is_string($contents)) {
            return [
                'ok' => false,
                'code' => 'FEED_PREPARATION_FAILED',
                'message' => 'Website publication feed could not be prepared.',
            ];
        }
    }

    if ($simulateAtomicWriteFailure) {
        return [
            'ok' => false,
            'code' => 'ATOMIC_WRITE_FAILED',
            'message' => 'Website publication feed write failed before replacement.',
        ];
    }

    foreach ($payloads as $path => $contents) {
        if (!ff_publication_atomic_write($path, $contents)) {
            return [
                'ok' => false,
                'code' => 'ATOMIC_WRITE_FAILED',
                'message' => 'Website publication feed write failed.',
            ];
        }
    }

    return ['ok' => true, 'records' => $records];
}

function ff_publication_existing_public_records(string $allPath, string $jsPath): array
{
    $records = [];

    if (is_file($allPath)) {
        $decoded = ff_publication_read_json_file($allPath, true);
        if (!is_array($decoded) || !array_is_list($decoded)) {
            return ['ok' => false, 'code' => 'MALFORMED_EXISTING_FEED', 'message' => 'Existing listings feed is malformed.'];
        }
        $records = $decoded;
    } elseif (is_file($jsPath)) {
        $parsed = ff_publication_read_js_feed($jsPath);
        if ($parsed['ok'] !== true) {
            return $parsed;
        }
        $records = $parsed['records'];
    }

    $cleanRecords = [];
    foreach ($records as $record) {
        if (is_array($record) && !array_is_list($record) && ff_publication_clean($record['id'] ?? '') !== '') {
            $cleanRecords[] = ff_publication_allow_public_record($record);
        }
    }

    return ['ok' => true, 'records' => $cleanRecords];
}

function ff_publication_read_js_feed(string $path): array
{
    $source = file_get_contents($path);
    if (!is_string($source) || !preg_match('/^\s*window\.FF_LISTINGS\s*=\s*(\[.*\])\s*;\s*$/s', $source, $matches)) {
        return ['ok' => false, 'code' => 'MALFORMED_EXISTING_FEED', 'message' => 'Existing listings.js feed is malformed.'];
    }

    $decoded = json_decode($matches[1], true);
    if (!is_array($decoded) || !array_is_list($decoded)) {
        return ['ok' => false, 'code' => 'MALFORMED_EXISTING_FEED', 'message' => 'Existing listings.js feed is malformed.'];
    }

    return ['ok' => true, 'records' => $decoded];
}

function ff_publication_public_record(array $publication): array
{
    return ff_publication_allow_public_record($publication);
}

function ff_publication_allow_public_record(array $record): array
{
    $allowed = [
        'id',
        'type',
        'status',
        'visibilityStatus',
        'dataQualityStatus',
        'title',
        'project',
        'projectCode',
        'projectSlug',
        'projectUrl',
        'developer',
        'location',
        'locality',
        'bhk',
        'propertyType',
        'size',
        'sizeSqft',
        'floor',
        'facing',
        'furnishing',
        'availability',
        'possessionStatus',
        'transactionType',
        'price',
        'priceValue',
        'rent',
        'image',
        'gallery',
        'imageState',
        'detailUrl',
        'description',
        'highlights',
        'seoTitle',
        'seoDescription',
        'seoIndexStatus',
        'seoIndexReason',
        'lastSeoReviewedAt',
        'publishedVersion',
        'sourceUpdatedAt',
    ];

    $public = [];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $record) && $record[$field] !== null) {
            $public[$field] = $record[$field];
        }
    }

    return $public;
}

function ff_publication_canonicalize(array $payload): array
{
    $canonical = [];
    foreach (FF_PUBLICATION_FIELD_ORDER as $field) {
        if (array_key_exists($field, $payload) && $payload[$field] !== null) {
            $canonical[$field] = $payload[$field];
        }
    }
    return $canonical;
}

function ff_publication_payload_hash(array $payload): string
{
    return hash('sha256', ff_publication_compact_json(ff_publication_canonicalize($payload)));
}

function ff_publication_fingerprint(mixed $value): string
{
    return hash('sha256', ff_publication_stable_json($value));
}

function ff_publication_stable_json(mixed $value): string
{
    if (is_array($value)) {
        if (array_is_list($value)) {
            $items = array_map(static fn($item): string => ff_publication_stable_json($item), $value);
            return '[' . implode(',', $items) . ']';
        }
        $keys = array_keys($value);
        sort($keys, SORT_STRING);
        $parts = [];
        foreach ($keys as $key) {
            $parts[] = json_encode((string) $key, JSON_UNESCAPED_SLASHES) . ':' . ff_publication_stable_json($value[$key]);
        }
        return '{' . implode(',', $parts) . '}';
    }

    return json_encode($value, JSON_UNESCAPED_SLASHES);
}

function ff_publication_json(mixed $value): string
{
    $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    return is_string($json) ? $json : '';
}

function ff_publication_compact_json(mixed $value): string
{
    $json = json_encode($value, JSON_UNESCAPED_SLASHES);
    return is_string($json) ? $json : '';
}

function ff_publication_read_json_file(string $path, bool $strict): mixed
{
    if (!is_file($path)) {
        return $strict ? null : null;
    }

    $source = file_get_contents($path);
    if (!is_string($source)) {
        return null;
    }

    return json_decode($source, true);
}

function ff_publication_state_path(string $runtimeRoot, string $idempotencyKey): string
{
    return rtrim($runtimeRoot, "\\/") . DIRECTORY_SEPARATOR . 'idempotency' . DIRECTORY_SEPARATOR . hash('sha256', $idempotencyKey) . '.json';
}

function ff_publication_atomic_write(string $path, string $contents): bool
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        return false;
    }

    $temporaryPath = $path . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(4));
    $handle = @fopen($temporaryPath, 'wb');
    if ($handle === false) {
        return false;
    }

    $bytes = fwrite($handle, $contents);
    fflush($handle);
    fclose($handle);

    if ($bytes === false || $bytes < strlen($contents)) {
        @unlink($temporaryPath);
        return false;
    }

    if (!@rename($temporaryPath, $path)) {
        @unlink($temporaryPath);
        return false;
    }

    return true;
}

function ff_publication_find_listing_index(array $records, string $listingId): ?int
{
    foreach ($records as $index => $record) {
        if (is_array($record) && (string) ($record['id'] ?? '') === $listingId) {
            return (int) $index;
        }
    }
    return null;
}

function ff_publication_headers(): array
{
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        return is_array($headers) ? $headers : [];
    }

    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (str_starts_with($key, 'HTTP_')) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$name] = $value;
        }
    }
    return $headers;
}

function ff_publication_header(array $headers, string $name): string
{
    foreach ($headers as $key => $value) {
        if (strtolower((string) $key) === strtolower($name)) {
            return ff_publication_clean($value);
        }
    }
    return '';
}

function ff_publication_clean(mixed $value): string
{
    return is_string($value) ? trim($value) : '';
}

function ff_publication_positive_int(mixed $value): bool
{
    return is_int($value) && $value > 0;
}

function ff_publication_success(array $receipt): array
{
    return [
        'ok' => true,
        'httpStatus' => 200,
        'body' => $receipt,
    ];
}

function ff_publication_fail(int $httpStatus, string $code, string $message, bool $retryable = false): array
{
    return [
        'ok' => false,
        'httpStatus' => $httpStatus,
        'body' => [
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'retryable' => $retryable,
            ],
        ],
    ];
}
