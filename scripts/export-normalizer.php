<?php
declare(strict_types=1);
if (!extension_loaded('intl')) throw new RuntimeException('Use PHP with ext-intl');
$data = ['icu'=>INTL_ICU_VERSION,'canonical'=>[],'compatibility'=>[],'folded'=>[],'rawFolded'=>[]];
for ($point=0;$point<=0x10ffff;$point++) {
    if ($point>=0xd800 && $point<=0xdfff) continue;
    $char=IntlChar::chr($point);
    $canonical=Normalizer::getRawDecomposition($char,Normalizer::NFC);
    $compatibility=Normalizer::getRawDecomposition($char,Normalizer::NFKC);
    $rawFolded=Normalizer::getRawDecomposition($char,Normalizer::NFKC_CF);
    if ($canonical!==null && !($point>=0xac00 && $point<=0xd7a3)) $data['canonical'][$point]=$canonical;
    if ($compatibility!==$canonical) $data['compatibility'][$point]=$compatibility;
    if ($rawFolded!==$compatibility) $data['rawFolded'][$point]=$rawFolded;
    $folded=Normalizer::normalize($char,Normalizer::NFKC_CF);
    if ($folded!==Normalizer::normalize($char,Normalizer::NFKC)) $data['folded'][$point]=$folded;
}
file_put_contents(__DIR__.'/../src-js/core/normalizer-data.json',json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
echo 'Normalizer: ICU '.INTL_ICU_VERSION." tables exported.\n";
