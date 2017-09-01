import os
import os.path
import sys
import json
import subprocess as sub

def isexec (fpath):
    if fpath == None: return False
    return os.path.isfile(fpath) and os.access(fpath, os.X_OK) 

def which(program):
    fpath, fname = os.path.split(program)
    if fpath:
        if isexec (program):
            return program
    else:
        for path in os.environ["PATH"].split(os.pathsep):
            exe_file = os.path.join(path, program)
            if isexec (exe_file):
                return exe_file
    return None

def delRepeat(lst):
    for elem in lst:
        while lst.count(elem) > 1:
            del lst[lst.index(elem)]
    return lst

def extractTestClasses (input_files_list_path, project_path, jar_path):
    test_tree = []
    lst = open(input_files_list_path, 'r')
    for f in lst:
        f = f.strip()
        filename = os.path.basename(f)
        classname = os.path.splitext(filename)[0]
        
        if filename.startswith('Test') or filename.endswith('Test.java'):
            if not filename.startswith('Abstract'):
                test_dict = {}
                test_methods_list = []

                for dir_path,subpaths,files in os.walk(project_path, False):
                    for cf in files:
                        cf = os.path.join(dir_path, cf)
                        #if cf == filename.replace('.java', '.class'):
                        if cf.endswith((f.split('/java/')[1]).replace('.java', '.class')):
                            #test_class_file_path = oSs.path.join(dir_path, cf)
                            test_class_file_path = cf
                
                            test_methods_list = extractTestMethods (test_class_file_path, jar_path)

                if len(test_methods_list) == 0:
                    continue
                
                test_dict['id'] = f
                test_dict['text'] = os.path.basename(f)
                test_dict['children'] = [{'id' : classname + "#" + methodname,
                                          'text' : methodname}
                                         for methodname in test_methods_list]
                test_tree.append(test_dict)
    #test_tree = delRepeat(test_tree)
    json_str = json.dumps(test_tree)
    print json_str


def extractTestMethods (test_class_file_path, jar_path):
    java = which ('java')
    p = sub.Popen([java, '-jar', jar_path, test_class_file_path], stdout=sub.PIPE, stderr=sub.PIPE)
    p.wait()
    method_list = []
    for l in p.stdout.readlines():
        m = l.strip()
        method_list.append(m)
    return method_list
        
if __name__ == '__main__':
    input_files_list_path = sys.argv[1]
    project_path = sys.argv[2]
    jar_path = sys.argv[3]
    extractTestClasses (input_files_list_path, project_path, jar_path)
