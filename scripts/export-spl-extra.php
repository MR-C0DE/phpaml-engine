<?php
declare(strict_types=1);
$file=__DIR__.'/../src-js/core/spl-definitions.json';$definitions=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
foreach(['SplDoublyLinkedList','SplStack','SplQueue'] as $name){
 $reflection=new ReflectionClass($name);$methods=[];$functions=[];$constants=[];
 foreach($reflection->getConstants() as $key=>$value)$constants[$key]=['owner'=>$name,'visibility'=>'public','value'=>$value];
 foreach(['push','pop','shift','unshift','top','bottom','add','count','isEmpty','offsetExists','offsetGet','offsetSet','offsetUnset','rewind','next','prev','valid','key','current','getIteratorMode','setIteratorMode',...($name==='SplQueue'?['enqueue','dequeue']:[])] as $method){
  $ref=$reflection->getMethod($method);$id='@spl:'.strtolower($name.'::'.$method);$params=[];
  foreach($ref->getParameters() as $p){$type=strtolower((string)$p->getType());$params[]=['id'=>'v'.bin2hex($p->getName()),'name'=>$p->getName(),'reference'=>$p->isPassedByReference(),'variadic'=>$p->isVariadic(),'rule'=>$type?['types'=>explode('|',ltrim($type,'?')),'nullable'=>$p->allowsNull()]:null,...($p->isDefaultValueAvailable()?['default'=>$p->getDefaultValue()]:[])];}
  $methods[strtolower($method)]=['name'=>$method,'id'=>$id,'owner'=>$name,'visibility'=>'public','static'=>false,'abstract'=>false,'final'=>false];
  $functions[$id]=['name'=>$name.'::'.$method,'parameters'=>$params,'returnType'=>null,'declared'=>true,'objectScope'=>$name,'bindThis'=>true,'body'=>['type'=>'return','hasValue'=>true,'value'=>['$expression'=>['operation'=>'splMethod','left'=>['$expression'=>['operation'=>'objectThis','left'=>null]],'right'=>['method'=>strtolower($method),'arguments'=>array_map(static fn($p)=>['$local'=>$p['id']],$params)]]]]];
 }
 $definitions[strtolower($name)]=['class'=>['name'=>$name,'parent'=>null,'ancestors'=>array_values([...class_parents($name),...class_implements($name)]),'abstract'=>false,'final'=>false,'properties'=>[],'staticProperties'=>[],'methods'=>$methods,'constants'=>$constants,'nativeSpl'=>true],'functions'=>$functions];
}
file_put_contents($file,json_encode($definitions,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n");
