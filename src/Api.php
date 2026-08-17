<?php

declare(strict_types=1);

namespace AML\Engine;

final class Api
{
    /** @param array<string, mixed> $data */
    public static function get(string $url, array $data = []): ApiAction
    {
        return new ApiAction('GET', $url, $data);
    }

    /** @param array<string, mixed> $data */
    public static function post(string $url, array $data = []): ApiAction
    {
        return new ApiAction('POST', $url, $data);
    }

    /** @param array<string, mixed> $data */
    public static function put(string $url, array $data = []): ApiAction
    {
        return new ApiAction('PUT', $url, $data);
    }

    /** @param array<string, mixed> $data */
    public static function patch(string $url, array $data = []): ApiAction
    {
        return new ApiAction('PATCH', $url, $data);
    }

    /** @param array<string, mixed> $data */
    public static function delete(string $url, array $data = []): ApiAction
    {
        return new ApiAction('DELETE', $url, $data);
    }
}
