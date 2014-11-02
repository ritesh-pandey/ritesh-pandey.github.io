//for, while & do while loop

<?php
$x = 2;
$y = 4;
if($x>$y)
echo "greater";
else
echo "less";

$menu = array("Toast and Jam", "Bacon and Eggs", "Homefries", "Skillet", "Milk and Cereal");
 $count = count($menu);
 echo "<br />";
 for($i = 0; $i < $count; $i++)
 {
  echo( $i + 1 . ". " . $menu[$i] .  "<br />");
 }

?>

<?php
$myName="Fred";
while ($myName!="Rumpelstiltskin") {
   if ($myName=="Fred") {
      $myName="Leslie";
   }
   else {
      $myName="Rumpelstiltskin";
   }
echo 1;
}
echo "How did you know?\n";
?>

<?php
$a1 = array("1st"=>"house","2nd"=>"car","3rd"=>"mobile");
$a1keys = array_keys($a1);
//echo "<br />".$a1keys[1];
echo "<br />";
foreach($a1 as $i=>$values)
{
 echo $i." : ".$values."<br />";
}
?>