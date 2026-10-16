<?php
declare(strict_types=1);
if(!extension_loaded('intl'))throw new RuntimeException('Use PHP with ext-intl');
$definitions=[];
foreach(['Normalizer'=>['normalize','isNormalized','getRawDecomposition'],'Collator'=>['__construct','create','compare','sort','asort','sortWithSortKeys','getStrength','setStrength','getAttribute','setAttribute','getLocale','getErrorCode','getErrorMessage'],'IntlDateFormatter'=>['__construct','create','format','getPattern','setPattern','getTimeZoneId','setTimeZone','getDateType','getTimeType','getCalendar','isLenient','setLenient','getLocale','getErrorCode','getErrorMessage'],'NumberFormatter'=>['__construct','create','format','formatCurrency','getAttribute','setAttribute','getTextAttribute','setTextAttribute']] as $name=>$allowed){
    $class=new ReflectionClass($name);$methods=[];$functions=[];$constants=[];
    foreach($class->getConstants()as$key=>$value)if(is_scalar($value))$constants[$key]=['owner'=>$name,'visibility'=>'public','value'=>$value];
    foreach($allowed as$methodName){
        $method=$class->getMethod($methodName);$id='@intl:'.strtolower($name.'::'.$methodName);$parameters=[];
        foreach($method->getParameters()as$p){$type=strtolower((string)$p->getType());$parameters[]=['id'=>'v'.bin2hex($p->getName()),'name'=>$p->getName(),'reference'=>$p->isPassedByReference(),'variadic'=>$p->isVariadic(),'rule'=>$type?['types'=>explode('|',ltrim($type,'?')),'nullable'=>$p->allowsNull()]:null,...($p->isDefaultValueAvailable()?['default'=>$p->getDefaultValue()]:[])];}
        $methods[strtolower($methodName)]=['name'=>$methodName,'id'=>$id,'owner'=>$name,'static'=>$method->isStatic(),'visibility'=>'public','abstract'=>false,'final'=>false];
        $functions[$id]=['name'=>$name.'::'.$methodName,'parameters'=>$parameters,'declared'=>true,'returnType'=>null,'nativeIntl'=>['class'=>$name,'method'=>strtolower($methodName)],'body'=>['type'=>'sequence','actions'=>[]]];
    }
    $definitions[strtolower($name)]=['class'=>['name'=>$name,'parent'=>null,'ancestors'=>[],'abstract'=>$name==='Normalizer','final'=>true,'properties'=>[],'staticProperties'=>[],'constants'=>$constants,'methods'=>$methods,'nativeIntl'=>true],'functions'=>$functions];
}
file_put_contents(__DIR__.'/../src-js/core/intl-definitions.json',json_encode($definitions,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
$currencies=[];
foreach(ResourceBundle::getLocales('')as$locale){$formatter=new NumberFormatter($locale,NumberFormatter::CURRENCY);$currencies[str_replace('_','-',strtolower($locale))]=$formatter->getTextAttribute(NumberFormatter::CURRENCY_CODE);}
file_put_contents(__DIR__.'/../src-js/core/intl-currencies.json',json_encode($currencies,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
