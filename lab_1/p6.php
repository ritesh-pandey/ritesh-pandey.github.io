//functions and file handling

<?php
 echo add(2,3)."<br />";
function add($x, $y)
{
 return $x+$y;
}

echo see("we","see");
function see($var1, $var2)
 {
   echo $var1;
   echo "\n";
   echo $var2;
   return NULL;
 }
?>

<?php
$handle = fopen('data.txt','r');
echo "<br />".$handle."<br />".file_get_contents('data.txt');
fclose($handle);
?>

<?php
$lines = file('data.txt');
foreach($lines as $key => $line)
{
	$x= $key + 1;
	echo "Line $x: $line";
}
   
?>