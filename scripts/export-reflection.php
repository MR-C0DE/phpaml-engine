<?php
declare(strict_types=1);
$catalogue=[
'ReflectionClass'=>['__construct','getName','getShortName','getNamespaceName','inNamespace','isAbstract','isFinal','isInterface','isTrait','isEnum','isReadOnly','isInstantiable','isCloneable','isInternal','isUserDefined','hasMethod','getMethod','getMethods','hasProperty','getProperty','getProperties','hasConstant','getConstant','getConstants','getParentClass','getInterfaceNames','isSubclassOf','implementsInterface','isInstance','newInstanceArgs','newInstanceWithoutConstructor'],
'ReflectionObject'=>['__construct','getName','getShortName','getNamespaceName','getMethod','getMethods','getProperty','getProperties','getConstants','isInstance','isUserDefined'],
'ReflectionMethod'=>['__construct','getName','getDeclaringClass','isPublic','isProtected','isPrivate','isStatic','isFinal','isAbstract','isConstructor','isDestructor','getNumberOfParameters','getNumberOfRequiredParameters','invokeArgs','setAccessible','isUserDefined','isInternal'],
'ReflectionProperty'=>['__construct','getName','getDeclaringClass','isPublic','isProtected','isPrivate','isStatic','isReadOnly','isDefault','isInitialized','getValue','setValue','setAccessible'],
];
$catalogue['ReflectionObject']=$catalogue['ReflectionClass'];
$definitions=[];
foreach($catalogue as $name=>$allowed){$ref=new ReflectionClass($name);$methods=[];$functions=[];$constants=[];
foreach($ref->getConstants() as $key=>$value)$constants[$key]=['owner'=>$name,'visibility'=>'public','value'=>$value];
foreach($allowed as $method){if(!$ref->hasMethod($method))continue;$m=$ref->getMethod($method);$id='@reflection:'.strtolower($name.'::'.$method);$parameters=[];foreach($m->getParameters() as $p){$type=strtolower((string)$p->getType());$parameters[]=['id'=>'v'.bin2hex($p->getName()),'name'=>$p->getName(),'reference'=>$p->isPassedByReference(),'variadic'=>$p->isVariadic(),'rule'=>$type?['types'=>explode('|',ltrim($type,'?')),'nullable'=>$p->allowsNull()]:null,...($p->isDefaultValueAvailable()?['default'=>$p->getDefaultValue()]:($p->isOptional()?['default'=>null]:[]))];}
$methods[strtolower($method)]=['name'=>$method,'id'=>$id,'owner'=>$name,'visibility'=>'public','static'=>$m->isStatic(),'abstract'=>false,'final'=>false];$functions[$id]=['name'=>$name.'::'.$method,'parameters'=>$parameters,'returnType'=>null,'declared'=>true,'nativeReflection'=>['class'=>$name,'method'=>strtolower($method)],'body'=>['type'=>'sequence','actions'=>[]]];}
$definitions[strtolower($name)]=['class'=>['name'=>$name,'parent'=>null,'ancestors'=>array_values([...class_parents($name),...class_implements($name)]),'abstract'=>false,'final'=>false,'properties'=>[],'staticProperties'=>[],'constants'=>$constants,'methods'=>$methods,'nativeReflection'=>true],'functions'=>$functions];}
file_put_contents(__DIR__.'/../src-js/core/reflection-definitions.json',json_encode($definitions,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
