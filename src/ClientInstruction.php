<?php

declare(strict_types=1);

namespace AML\Engine;

interface ClientInstruction
{
    public function json(): string;
}
