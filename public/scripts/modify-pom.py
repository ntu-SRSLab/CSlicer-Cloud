#!/usr/bin/python
import cgi
import cgitb
import subprocess
import os

cgitb.enable()

input_data=cgi.FieldStorage()

print 'Content-Type:text/html\n\n'  

endcommit = input_data["endcommit"].value
startcommit = input_data["startcommit"].value
testcases = input_data["testcases"].value

f = open("/var/www/html/name.txt", "r")
owner = f.readline().strip()
repo = f.readline().strip()
f.close()

args = "/var/www/html/name.txt"
os.system(args)

path = "/home/shayan/Desktop"
os.chdir(path)

if (os.path.exists(repo)):
	args = "rm -r " + repo
	os.system(args)

args = ['git', 'clone', "https://github.com/" + owner + "/" + repo + ".git"]
process = subprocess.check_output(args)

os.chdir(repo)

args = ['git', 'checkout', endcommit]
process = subprocess.check_output(args)

f = open("pom.xml", 'r')
contents = f.readlines()
f.close()

f = open("pom.xml", 'r')

line_number = 0
prevline = ''
line = f.readline().strip()
while((line != "<plugins>") or (prevline == "<pluginManagement>")):
	prevline = line
	line = f.readline().strip()
	line_number += 1	

contents.insert(line_number + 1, "<plugin>\n<groupId>edu.toronto.se</groupId>\n<artifactId>cslicer-maven-plugin</artifactId>\n<version>1.0.0</version>\n<configuration>\n<args>\n<param>" + path + "/commons-csv/.git</param>\n<param>" + startcommit + "</param>\n<param>" + endcommit + "</param>\n<param>/home/shayan/Desktop/archive/comp_test_CSV-159.py</param>\n<param>V1_3_CSV-159</param>\n<param>/home/shayan/Desktop/archive/example-settings.txt</param>\n<param>/home/shayan/Desktop/archive/daikon.jar</param>\n<param>/home/shayan/Desktop/archive/ChicoryPremain.jar</param>\n<param>noinv</param>\n</args>\n</configuration>\n<executions>\n<execution>\n<phase>test</phase>\n<goals>\n<goal>refiner</goal>\n</goals>\n</execution>\n</executions>\n</plugin>\n")
f.close()

f = open("pom.xml", "w")
contents = "".join(contents)
f.write(contents)
f.close()

testArray = testcases.split(',')
Dtest = testArray[0] + '#' + testArray[1]
for testcase in testArray[2:]:
	Dtest += '+' + testcase

line_number_2 = 0
count = True
contents = ''
prev_line = ''
with open("/home/shayan/Desktop/archive/comp_test_CSV-159.py",'r') as f:
    for line in f:
		if (line.strip() == "elif option == 'test':"): 
			contents += line
			contents += " " * 8 + "ret = sub.call ([mvn, 'surefire:test', '-Dtest=" + Dtest + "'])\n"
		elif (line.strip().find("ret = sub.call ([mvn, 'surefire:test'") == -1):
			contents += line 

f = open("/home/shayan/Desktop/archive/comp_test_CSV-159.py", 'w')
contents = "".join(contents)
f.write(contents)
f.close()


try:
	args = ['/usr/lib/cgi-bin/run-mvn.py']
	process = subprocess.check_output(args)
except subprocess.CalledProcessError as e:	
	raise RuntimeError("command '{}' return with error (code {}): {}".format(e.cmd, e.returncode, e.output))


f = open("/usr/lib/cgi-bin/result")

line = f.readline()
contents = ""

while line != "":
	if "[OUTPUT] H*: " in line.strip():
		contents += line.strip()[13: 20]
		contents += ", "
	line = f.readline()

contents = contents[:-2]

print contents
