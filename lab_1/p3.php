$a1 = 3;
$a2 = 4;
$a3 = 5;
$a4 = array($a1, $a2, $a3);

<?php
echo "<br />";
$a1 = array("name"=>"Chandni","roll"=>"2008034","department"=>"CSE");
 print_r($a1);
 echo "<br />";
$a2 = array("Kirti","Chandni","Aparna");
 print_r($a2);
 echo "<br />";
 $array3 = array("name"=>"Toyota","Celica","colour"=>"black","1991");
 print_r($array3);

echo "<br />PHP: &lt;b&gt;{$a1['name']}&lt;b&gt;";

//Multidimentional array
$roll = array("st1"=>array("batch"=>"2008","branch"=>"cse","roll_no."=>"2008034"),"st2"=>array("batch"=>"2008","branch"=>"cse","roll_no."=>"2008056"),);
//echo "$roll['st1']['batch']";

?>

<?php
// using an array's iterator to print its values in reverse order
$a4 = array('a', 'b', 'c');
end($a4);
while($i = current($a4)) {
        echo $i."\n";
        prev($a4);
}
?>

