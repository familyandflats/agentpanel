<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/publication/receiver.php';

$checks = 0;

function qa_check(string $name, callable $assertion): void
{
    global $checks;
    $assertion();
    $checks += 1;
    echo "ok {$checks} - {$name}\n";
}

function qa_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function qa_temp_root(): string
{
    $root = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ff-phase39g-cpanel-' . getmypid() . '-' . bin2hex(random_bytes(4));
    if (!mkdir($root, 0775, true) && !is_dir($root)) {
        throw new RuntimeException('Unable to create QA temp root.');
    }
    mkdir($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data', 0775, true);
    return $root;
}

function qa_private_secret_file(string $root, string $contents): string
{
    $path = $root . DIRECTORY_SEPARATOR . 'private-secret-fixture.txt';
    file_put_contents($path, $contents);
    return $path;
}

function qa_remove_tree(string $path): void
{
    if (!is_dir($path)) {
        return;
    }
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    }
    rmdir($path);
}

function qa_publication(array $overrides = []): array
{
    $base = [
        'id' => 'FF-LST-P39G-TEST-001',
        'type' => 'Sale',
        'status' => 'active',
        'visibilityStatus' => 'ready',
        'dataQualityStatus' => 'approved',
        'title' => '3 BHK for Sale in IREO Victory Valley',
        'project' => 'IREO Victory Valley',
        'projectCode' => 'FF-PRJ-IREO',
        'projectSlug' => 'ireovictoryvalley',
        'projectUrl' => '/projects/ireovictoryvalley/',
        'developer' => 'IREO',
        'location' => 'Sector 67, Gurugram',
        'locality' => 'Sector 67, Gurugram',
        'bhk' => '3BHK',
        'propertyType' => 'Flat',
        'size' => '1435 sq.ft.',
        'sizeSqft' => 1435,
        'floor' => 'Higher',
        'facing' => 'East',
        'furnishing' => 'Semi furnished',
        'availability' => '2026-08-22',
        'possessionStatus' => 'Ready to move',
        'transactionType' => 'Sale',
        'price' => 'Rs. 2,50,00,000',
        'priceValue' => 25000000,
        'image' => '/media/phase39g/hero.webp',
        'gallery' => ['/media/phase39g/hero.webp', '/media/phase39g/gallery.webp'],
        'imageState' => 'approved-image',
        'detailUrl' => '/listings/detail.html?id=FF-LST-P39G-TEST-001',
        'description' => 'A controlled Phase 39G test listing prepared for website publication receiver validation.',
        'highlights' => ['Controlled publication receiver test', 'Approved public-safe media', 'Governed SEO-ready listing'],
        'seoTitle' => '3 BHK Flat for Sale in IREO Victory Valley',
        'seoDescription' => 'Controlled Phase 39G publication receiver test for an approved IREO Victory Valley listing.',
        'seoIndexStatus' => 'noindex_follow',
        'seoIndexReason' => 'Controlled test listing',
        'lastSeoReviewedAt' => '2026-08-22T09:00:00.000Z',
        'publishedVersion' => 7,
        'sourceUpdatedAt' => '2026-08-22T10:00:00.000Z',
    ];

    return array_replace($base, $overrides);
}

function qa_envelope(array $publication, string $operation = 'CREATE', array $overrides = []): array
{
    $base = [
        'contractVersion' => '1.0',
        'operation' => $operation,
        'listingId' => $publication['id'],
        'listingVersion' => 7,
        'authorizedVersion' => $publication['publishedVersion'],
        'idempotencyKey' => hash('sha256', $operation . ':' . $publication['id'] . ':' . $publication['publishedVersion'] . ':' . ($publication['title'] ?? '')),
        'payloadHash' => ff_publication_payload_hash($publication),
        'requestedAt' => '2026-08-22T11:00:00.000Z',
        'requestedBy' => 'Founder',
        'publication' => $publication,
    ];

    return array_replace($base, $overrides);
}

function qa_submit(string $root, array|string $body, array $options = []): array
{
    $rawBody = is_array($body) ? ff_publication_json($body) : $body;
    $idempotencyHeader = is_array($body) ? (string) ($body['idempotencyKey'] ?? '') : (string) ($options['idempotencyHeader'] ?? '');
    return ff_publication_receive([
        'method' => $options['method'] ?? 'POST',
        'configuredSecret' => array_key_exists('configuredSecret', $options) ? $options['configuredSecret'] : 'phase39g-secret',
        'secretHeader' => $options['secretHeader'] ?? 'phase39g-secret',
        'idempotencyHeader' => $options['idempotencyHeader'] ?? $idempotencyHeader,
        'rawBody' => $rawBody,
        'websiteRoot' => $root,
        'runtimeRoot' => $options['runtimeRoot'] ?? ($root . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'publication' . DIRECTORY_SEPARATOR . 'runtime'),
        'privateSecretPath' => $options['privateSecretPath'] ?? null,
        'simulateAtomicWriteFailure' => $options['simulateAtomicWriteFailure'] ?? false,
    ]);
}

function qa_read_json(string $path): array
{
    $decoded = json_decode((string) file_get_contents($path), true);
    qa_assert(is_array($decoded), "Expected JSON array at {$path}");
    return $decoded;
}

function qa_read_js_listings(string $path): array
{
    $source = (string) file_get_contents($path);
    qa_assert(preg_match('/^\s*window\.FF_LISTINGS\s*=\s*(\[.*\])\s*;\s*$/s', $source, $matches) === 1, 'listings.js must keep window.FF_LISTINGS assignment.');
    $decoded = json_decode($matches[1], true);
    qa_assert(is_array($decoded), 'listings.js JSON payload must decode.');
    return $decoded;
}

function qa_ids(array $records): array
{
    return array_map(static fn(array $record): string => (string) $record['id'], $records);
}

$root = qa_temp_root();
try {
    $dataRoot = $root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data';
    file_put_contents($dataRoot . DIRECTORY_SEPARATOR . 'listings.js', "window.FF_LISTINGS = " . ff_publication_json([
        [
            'id' => 'FF-EXISTING-001',
            'type' => 'Sale',
            'status' => 'active',
            'title' => 'Existing public listing',
            'project' => 'Existing Project',
            'image' => '/existing.webp',
            'gallery' => ['/existing.webp'],
            'detailUrl' => '/listings/detail.html?id=FF-EXISTING-001',
            'description' => 'Existing public-safe listing.',
            'highlights' => ['Existing listing preserved'],
        ],
    ]) . ";\n");

    $publication = qa_publication();
    $envelope = qa_envelope($publication);

    qa_check('private secret path derives from production website root', function (): void {
        $expected = '/home/prkw9neh8rou/.familyflats/website_publish_secret';
        qa_assert(ff_publication_private_secret_path('/home/prkw9neh8rou/public_html') === $expected, 'Production private secret path derivation mismatch.');
    });

    qa_check('env secret present wins over private file secret', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, 'private-file-secret');
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => 'env-secret',
                'secretHeader' => 'env-secret',
                'privateSecretPath' => $privatePath,
            ]);
            qa_assert($result['httpStatus'] === 200, 'Env secret should win and accept request.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('private file secret is accepted when env secret is absent', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, "private-file-secret\n");
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => '',
                'secretHeader' => 'private-file-secret',
                'privateSecretPath' => $privatePath,
            ]);
            qa_assert($result['httpStatus'] === 200, 'Private file secret should accept request.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('missing private secret file returns 503', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => '',
                'secretHeader' => 'private-file-secret',
                'privateSecretPath' => $secretRoot . DIRECTORY_SEPARATOR . 'missing-secret.txt',
            ]);
            qa_assert($result['httpStatus'] === 503, 'Missing private secret should return 503.');
            qa_assert($result['body']['error']['code'] === 'WEBSITE_PUBLISH_SECRET_NOT_CONFIGURED', 'Expected not configured code.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('empty invalid and unreadable private secret sources return 503', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $emptyPath = qa_private_secret_file($secretRoot, " \n ");
            $invalidPath = $secretRoot . DIRECTORY_SEPARATOR . 'invalid-secret-fixture.txt';
            file_put_contents($invalidPath, "private\nfile");
            $directoryPath = $secretRoot . DIRECTORY_SEPARATOR . 'secret-directory';
            mkdir($directoryPath);
            foreach ([$emptyPath, $invalidPath, $directoryPath] as $path) {
                $result = qa_submit($secretRoot, $envelope, [
                    'configuredSecret' => '',
                    'secretHeader' => 'private-file-secret',
                    'privateSecretPath' => $path,
                ]);
                qa_assert($result['httpStatus'] === 503, 'Invalid private secret source should return 503.');
            }
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('private file secret is never echoed in unauthorized response', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, 'private-file-secret');
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => '',
                'secretHeader' => 'wrong-secret',
                'privateSecretPath' => $privatePath,
            ]);
            $encoded = ff_publication_json($result['body']);
            qa_assert($result['httpStatus'] === 401, 'Wrong private-file secret should return 401.');
            qa_assert(!str_contains($encoded, 'private-file-secret'), 'Private file secret leaked in response.');
            qa_assert(!str_contains($encoded, 'wrong-secret'), 'Wrong request secret leaked in response.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('private file secret is never persisted in runtime state', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, 'private-file-secret');
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => '',
                'secretHeader' => 'private-file-secret',
                'privateSecretPath' => $privatePath,
            ]);
            qa_assert($result['httpStatus'] === 200, 'Private file secret request should succeed.');
            $runtime = $secretRoot . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'publication' . DIRECTORY_SEPARATOR . 'runtime';
            $files = glob($runtime . DIRECTORY_SEPARATOR . 'idempotency' . DIRECTORY_SEPARATOR . '*.json') ?: [];
            qa_assert(count($files) > 0, 'Expected private-file runtime state.');
            foreach ($files as $file) {
                qa_assert(!str_contains((string) file_get_contents($file), 'private-file-secret'), 'Private file secret leaked to runtime state.');
            }
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('wrong request secret with private file configured returns 401', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, 'private-file-secret');
            $result = qa_submit($secretRoot, $envelope, [
                'configuredSecret' => '',
                'secretHeader' => 'not-the-secret',
                'privateSecretPath' => $privatePath,
            ]);
            qa_assert($result['httpStatus'] === 401, 'Wrong request secret should return 401.');
            qa_assert($result['body']['error']['code'] === 'WEBSITE_PUBLISH_SECRET_INVALID', 'Expected invalid secret code.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('correct private file secret reaches request validation', function () use ($envelope): void {
        $secretRoot = qa_temp_root();
        try {
            $privatePath = qa_private_secret_file($secretRoot, 'private-file-secret');
            $bad = $envelope;
            $bad['contractVersion'] = '2.0';
            $result = qa_submit($secretRoot, $bad, [
                'configuredSecret' => '',
                'secretHeader' => 'private-file-secret',
                'privateSecretPath' => $privatePath,
            ]);
            qa_assert($result['httpStatus'] === 400, 'Correct private secret should reach envelope validation.');
            qa_assert($result['body']['error']['code'] === 'CONTRACT_VERSION_UNSUPPORTED', 'Expected contract validation error.');
        } finally {
            qa_remove_tree($secretRoot);
        }
    });

    qa_check('payload hash uses compact sender-compatible canonical JSON', function () use ($publication): void {
        $canonical = ff_publication_canonicalize($publication);
        $compactHash = ff_publication_payload_hash($publication);
        $prettyHash = hash('sha256', ff_publication_json($canonical));
        qa_assert($compactHash === hash('sha256', ff_publication_compact_json($canonical)), 'Compact canonical hash mismatch.');
        qa_assert($compactHash !== $prettyHash, 'Payload hash must not use pretty-printed JSON.');
    });

    qa_check('secret missing configuration returns 503', function () use ($root, $envelope): void {
        $result = qa_submit($root, $envelope, ['configuredSecret' => '']);
        qa_assert($result['httpStatus'] === 503, 'Expected 503.');
        qa_assert($result['body']['error']['code'] === 'WEBSITE_PUBLISH_SECRET_NOT_CONFIGURED', 'Expected missing config error.');
    });

    qa_check('missing secret header returns 401', function () use ($root, $envelope): void {
        $result = qa_submit($root, $envelope, ['secretHeader' => '']);
        qa_assert($result['httpStatus'] === 401, 'Expected 401.');
    });

    qa_check('wrong secret returns 401 without echoing secret', function () use ($root, $envelope): void {
        $result = qa_submit($root, $envelope, ['secretHeader' => 'wrong-secret']);
        $encoded = ff_publication_json($result['body']);
        qa_assert($result['httpStatus'] === 401, 'Expected 401.');
        qa_assert(!str_contains($encoded, 'phase39g-secret'), 'Secret leaked in output.');
        qa_assert(!str_contains($encoded, 'wrong-secret'), 'Supplied secret leaked in output.');
    });

    qa_check('malformed JSON returns 400', function () use ($root): void {
        $result = qa_submit($root, '{bad json', ['idempotencyHeader' => 'x']);
        qa_assert($result['httpStatus'] === 400, 'Expected 400.');
        qa_assert($result['body']['error']['code'] === 'MALFORMED_JSON', 'Expected malformed JSON.');
    });

    qa_check('bad contract version returns 400', function () use ($root, $envelope): void {
        $bad = $envelope;
        $bad['contractVersion'] = '2.0';
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'CONTRACT_VERSION_UNSUPPORTED', 'Expected version failure.');
    });

    qa_check('unsupported operation returns 400', function () use ($root, $envelope): void {
        $bad = $envelope;
        $bad['operation'] = 'WITHDRAW';
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'OPERATION_UNSUPPORTED', 'Expected unsupported operation.');
    });

    qa_check('missing required envelope field returns 400', function () use ($root, $envelope): void {
        $bad = $envelope;
        unset($bad['listingId']);
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'ENVELOPE_INVALID', 'Expected envelope invalid.');
    });

    qa_check('idempotency-header mismatch returns 409', function () use ($root, $envelope): void {
        $result = qa_submit($root, $envelope, ['idempotencyHeader' => 'different']);
        qa_assert($result['body']['error']['code'] === 'IDEMPOTENCY_KEY_MISMATCH', 'Expected idempotency mismatch.');
    });

    qa_check('invalid publication field returns 400', function () use ($root, $publication): void {
        $badPublication = qa_publication(['propertyType' => 'Villa']);
        $result = qa_submit($root, qa_envelope($badPublication));
        qa_assert($result['body']['error']['code'] === 'PUBLICATION_PAYLOAD_INVALID', 'Expected invalid payload.');
    });

    qa_check('listing ID mismatch returns 400', function () use ($root, $envelope): void {
        $bad = $envelope;
        $bad['listingId'] = 'FF-DIFFERENT';
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'PUBLICATION_PAYLOAD_INVALID', 'Expected listing mismatch.');
    });

    qa_check('published version mismatch returns 400', function () use ($root, $envelope): void {
        $bad = $envelope;
        $bad['authorizedVersion'] = 8;
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'PUBLICATION_PAYLOAD_INVALID', 'Expected version mismatch.');
    });

    qa_check('payload hash mismatch returns PAYLOAD_HASH_MISMATCH', function () use ($root, $envelope): void {
        $bad = $envelope;
        $bad['payloadHash'] = str_repeat('0', 64);
        $result = qa_submit($root, $bad);
        qa_assert($result['body']['error']['code'] === 'PAYLOAD_HASH_MISMATCH', 'Expected payload hash mismatch.');
    });

    qa_check('CREATE success returns deterministic sender-compatible receipt', function () use ($root, $envelope): void {
        $result = qa_submit($root, $envelope);
        qa_assert($result['httpStatus'] === 200, 'Expected success.');
        qa_assert($result['body']['ok'] === true, 'Expected ok receipt.');
        qa_assert($result['body']['listingId'] === $envelope['listingId'], 'Listing ID mismatch.');
        qa_assert($result['body']['idempotencyKey'] === $envelope['idempotencyKey'], 'Idempotency mismatch.');
        qa_assert($result['body']['payloadHash'] === $envelope['payloadHash'], 'Payload hash mismatch.');
        qa_assert($result['body']['result'] === FF_PUBLICATION_RESULT, 'Unexpected result.');
    });

    qa_check('four feed outputs are valid after CREATE', function () use ($root): void {
        $base = $root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data';
        qa_assert(is_file($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'listings.json'), 'Missing all listings JSON.');
        qa_assert(is_file($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'sale-listings.json'), 'Missing sale JSON.');
        qa_assert(is_file($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'lease-listings.json'), 'Missing lease JSON.');
        qa_assert(is_file($base . DIRECTORY_SEPARATOR . 'listings.js'), 'Missing listings.js.');
        qa_read_json($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'listings.json');
        qa_read_json($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'sale-listings.json');
        qa_read_json($base . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'lease-listings.json');
        qa_read_js_listings($base . DIRECTORY_SEPARATOR . 'listings.js');
    });

    qa_check('sale listing appears only in all-listings and sale feed', function () use ($root, $publication): void {
        $base = $root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'command-center';
        qa_assert(in_array($publication['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'listings.json')), true), 'Missing from all listings.');
        qa_assert(in_array($publication['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'sale-listings.json')), true), 'Missing from sale feed.');
        qa_assert(!in_array($publication['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'lease-listings.json')), true), 'Sale listing leaked to lease feed.');
    });

    qa_check('lease equivalent appears only in all-listings and lease feed', function () use ($root): void {
        $lease = qa_publication([
            'id' => 'FF-LST-P39G-LEASE-001',
            'type' => 'Lease',
            'transactionType' => 'Lease',
            'title' => '3 BHK for Lease in IREO Victory Valley',
            'rent' => 'Rs. 75,000',
            'publishedVersion' => 2,
            'detailUrl' => '/listings/detail.html?id=FF-LST-P39G-LEASE-001',
        ]);
        unset($lease['price'], $lease['priceValue']);
        $result = qa_submit($root, qa_envelope($lease));
        qa_assert($result['httpStatus'] === 200, 'Lease create failed.');
        $base = $root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'command-center';
        qa_assert(in_array($lease['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'listings.json')), true), 'Lease missing from all listings.');
        qa_assert(in_array($lease['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'lease-listings.json')), true), 'Lease missing from lease feed.');
        qa_assert(!in_array($lease['id'], qa_ids(qa_read_json($base . DIRECTORY_SEPARATOR . 'sale-listings.json')), true), 'Lease leaked to sale feed.');
    });

    qa_check('listings.js contains syntactically correct window.FF_LISTINGS', function () use ($root, $publication): void {
        $records = qa_read_js_listings($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'listings.js');
        qa_assert(in_array($publication['id'], qa_ids($records), true), 'Missing publication in listings.js.');
    });

    qa_check('unrelated listing is preserved', function () use ($root): void {
        $records = qa_read_js_listings($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'listings.js');
        qa_assert(in_array('FF-EXISTING-001', qa_ids($records), true), 'Unrelated listing was not preserved.');
    });

    qa_check('replay identical request returns same receipt', function () use ($root, $envelope): void {
        $first = qa_submit($root, $envelope);
        $second = qa_submit($root, $envelope);
        qa_assert($first['body'] === $second['body'], 'Replay receipt changed.');
    });

    qa_check('replay does not duplicate listing', function () use ($root, $publication, $envelope): void {
        qa_submit($root, $envelope);
        qa_submit($root, $envelope);
        $records = qa_read_json($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'listings.json');
        $matches = array_values(array_filter($records, static fn(array $record): bool => ($record['id'] ?? '') === $publication['id']));
        qa_assert(count($matches) === 1, 'Replay duplicated listing.');
    });

    qa_check('reused idempotency key with changed request returns 409', function () use ($root, $publication, $envelope): void {
        $changed = qa_publication(['title' => 'Changed title']);
        $changedEnvelope = qa_envelope($changed, 'CREATE', ['idempotencyKey' => $envelope['idempotencyKey']]);
        $result = qa_submit($root, $changedEnvelope);
        qa_assert($result['body']['error']['code'] === 'IDEMPOTENCY_CONFLICT', 'Expected idempotency conflict.');
    });

    qa_check('UPDATE changes only intended listing', function () use ($root): void {
        $updated = qa_publication(['title' => 'Updated 3 BHK for Sale in IREO Victory Valley', 'publishedVersion' => 8]);
        $result = qa_submit($root, qa_envelope($updated, 'UPDATE'));
        qa_assert($result['httpStatus'] === 200, 'Update failed.');
        $records = qa_read_json($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'command-center' . DIRECTORY_SEPARATOR . 'listings.json');
        $found = array_values(array_filter($records, static fn(array $record): bool => ($record['id'] ?? '') === $updated['id']));
        qa_assert(count($found) === 1, 'Updated listing count mismatch.');
        qa_assert($found[0]['title'] === $updated['title'], 'Updated title not stored.');
        qa_assert(in_array('FF-EXISTING-001', qa_ids($records), true), 'Update affected unrelated listing.');
    });

    qa_check('runtime idempotency survives fresh receiver invocation', function () use ($root, $envelope): void {
        $fresh = qa_submit($root, $envelope);
        qa_assert($fresh['httpStatus'] === 200, 'Durable idempotency replay failed.');
        qa_assert($fresh['body']['idempotencyKey'] === $envelope['idempotencyKey'], 'Durable replay receipt mismatch.');
    });

    qa_check('no secret appears in runtime receipt', function () use ($root): void {
        $runtime = $root . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'publication' . DIRECTORY_SEPARATOR . 'runtime';
        $files = glob($runtime . DIRECTORY_SEPARATOR . 'idempotency' . DIRECTORY_SEPARATOR . '*.json') ?: [];
        qa_assert(count($files) > 0, 'Expected runtime receipt file.');
        foreach ($files as $file) {
            $source = (string) file_get_contents($file);
            qa_assert(!str_contains($source, 'phase39g-secret'), 'Secret leaked to runtime.');
        }
    });

    qa_check('private source fields are not propagated', function () use ($root): void {
        $private = qa_publication([
            'id' => 'FF-LST-PRIVATE-TEST',
            'title' => 'Private Field Test Listing',
            'publishedVersion' => 3,
            'detailUrl' => '/listings/detail.html?id=FF-LST-PRIVATE-TEST',
            'ownerName' => 'Private Owner',
            'phone' => '+91 99999 99999',
            'unitNumber' => 'Private Unit',
            'drivePath' => 'G:/Shared drives/private',
        ]);
        $result = qa_submit($root, qa_envelope($private));
        qa_assert($result['httpStatus'] === 200, 'Private field test create failed.');
        $source = (string) file_get_contents($root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'listings.js');
        qa_assert(!str_contains($source, 'Private Owner'), 'Owner field leaked.');
        qa_assert(!str_contains($source, '99999'), 'Phone field leaked.');
        qa_assert(!str_contains($source, 'Private Unit'), 'Unit field leaked.');
        qa_assert(!str_contains($source, 'Shared drives'), 'Drive path leaked.');
    });

    qa_check('malformed existing feed fails safely', function (): void {
        $badRoot = qa_temp_root();
        try {
            $data = $badRoot . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data';
            file_put_contents($data . DIRECTORY_SEPARATOR . 'listings.js', 'window.FF_LISTINGS = not json;');
            $result = qa_submit($badRoot, qa_envelope(qa_publication(['id' => 'FF-BAD-FEED', 'detailUrl' => '/listings/detail.html?id=FF-BAD-FEED'])));
            qa_assert($result['httpStatus'] === 500, 'Malformed feed should fail.');
            qa_assert($result['body']['error']['code'] === 'MALFORMED_EXISTING_FEED', 'Expected malformed feed code.');
        } finally {
            qa_remove_tree($badRoot);
        }
    });

    qa_check('atomic-write failure path does not report success', function (): void {
        $failRoot = qa_temp_root();
        try {
            $result = qa_submit($failRoot, qa_envelope(qa_publication(['id' => 'FF-ATOMIC-FAIL', 'detailUrl' => '/listings/detail.html?id=FF-ATOMIC-FAIL'])), ['simulateAtomicWriteFailure' => true]);
            qa_assert($result['httpStatus'] === 500, 'Atomic failure should fail.');
            qa_assert(($result['body']['ok'] ?? true) === false, 'Atomic failure reported success.');
        } finally {
            qa_remove_tree($failRoot);
        }
    });
} finally {
    qa_remove_tree($root);
}

echo "Phase 39G cPanel publication receiver QA passed ({$checks} checks).\n";
